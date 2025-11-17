import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

interface QueueItem {
  id: string;
  ticket_id: string;
  activity_id: string | null;
  tenant_id: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  attempt_count: number;
  next_attempt_at: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_error: string | null;
}

interface TicketPayload {
  tenant_id: string;
  tenant_name?: string | null;
  ticket_id: string;
  ticket_number: string;
  status: string;
  priority: string | null;
  title: string;
  description: string | null;
  location: string | null;
  complainant: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    chat_id: string | null;
  };
  latest_activity?: {
    id: string | null;
    type: string | null;
    comment: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string | null;
    created_by: {
      id: string | null;
      name: string | null;
    } | null;
  };
  generated_at: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BATCH = Number(Deno.env.get('TICKET_ACTIVITY_WEBHOOK_BATCH') ?? '10');
const REQUEST_TIMEOUT_MS = Number(Deno.env.get('TICKET_ACTIVITY_WEBHOOK_TIMEOUT_MS') ?? '10000');
const MAX_BACKOFF_MS = Number(Deno.env.get('TICKET_ACTIVITY_WEBHOOK_MAX_BACKOFF_MS') ?? (60 * 60 * 1000).toString()); // 1 hour cap

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ticket-activity-webhook] Missing Supabase environment variables');
    return jsonResponse({ error: 'Server configuration incomplete' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const nowIso = new Date().toISOString();
    const { data: queueItems, error: queueError } = await supabase
      .from('ticket_webhook_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH);

    if (queueError) {
      console.error('[ticket-activity-webhook] Failed to load queue', queueError);
      return jsonResponse({ error: 'Failed to load queue entries' }, 500);
    }

    if (!queueItems || queueItems.length === 0) {
      return jsonResponse({ processed: 0, delivered: 0, failed: 0, message: 'No pending entries' });
    }

    let processed = 0;
    let delivered = 0;
    let failed = 0;

    for (const item of queueItems as QueueItem[]) {
      const claimResult = await claimQueueItem(supabase, item);
      if (!claimResult) {
        continue;
      }

      processed += 1;

      const tenantInfo = await fetchTenant(supabase, item.tenant_id);
      if (tenantInfo.error) {
        console.error('[ticket-activity-webhook] Tenant lookup failed', {
          queue_id: item.id,
          error: tenantInfo.error,
        });
        await markFailed(supabase, item.id, claimResult.attempt_count, tenantInfo.error);
        failed += 1;
        continue;
      }

      const { tenant } = tenantInfo;

      if (!tenant?.automation_webhook_url || tenant.automation_webhook_url.trim() === '') {
        console.info('[ticket-activity-webhook] Tenant has no automation webhook configured, marking delivered', {
          queue_id: item.id,
          tenant_id: tenant?.id,
        });
        await markDelivered(supabase, item.id, claimResult.attempt_count, null, null);
        delivered += 1;
        continue;
      }

      const payloadResult = await buildPayload(supabase, claimResult, tenant);
      if (payloadResult.error || !payloadResult.payload) {
        console.error('[ticket-activity-webhook] Failed to build payload', {
          queue_id: item.id,
          error: payloadResult.error,
        });
        await markFailed(supabase, item.id, claimResult.attempt_count, payloadResult.error ?? 'Unknown payload error');
        failed += 1;
        continue;
      }

      const sendResult = await sendWebhook(tenant.automation_webhook_url, payloadResult.payload);

      if (sendResult.ok) {
        await markDelivered(
          supabase,
          item.id,
          claimResult.attempt_count,
          payloadResult.payload,
          null,
        );
        delivered += 1;
      } else {
        const errorMessage = sendResult.error instanceof Error ? sendResult.error.message : String(sendResult.error);
        console.error('[ticket-activity-webhook] Webhook send failed', {
          queue_id: item.id,
          tenant_id: tenant.id,
          error: errorMessage,
        });
        await markFailed(supabase, item.id, claimResult.attempt_count, errorMessage);
        failed += 1;
      }
    }

    return jsonResponse({ processed, delivered, failed });
  } catch (error) {
    console.error('[ticket-activity-webhook] Unexpected error', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

async function claimQueueItem(
  supabase: SupabaseClient,
  item: QueueItem,
): Promise<QueueItem | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('ticket_webhook_queue')
    .update({
      status: 'processing',
      attempt_count: item.attempt_count + 1,
      updated_at: nowIso,
    })
    .eq('id', item.id)
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', nowIso)
    .select()
    .single();

  if (error) {
    console.warn('[ticket-activity-webhook] Failed to claim queue item', {
      queue_id: item.id,
      error,
    });
    return null;
  }

  return data as QueueItem;
}

async function fetchTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ tenant: { id: string; name?: string | null; automation_webhook_url?: string | null } | null; error?: string }> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, automation_webhook_url')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    return { tenant: null, error: error.message ?? 'Unable to load tenant' };
  }

  if (!data) {
    return { tenant: null, error: 'Tenant not found' };
  }

  return { tenant: data };
}

async function buildPayload(
  supabase: SupabaseClient,
  queueItem: QueueItem,
  tenant: { id: string; name?: string | null },
): Promise<{ payload?: TicketPayload; error?: string }> {
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      status,
      priority,
      title,
      description,
      location,
      tenant_id,
      complainant:users!tickets_complainant_id_fkey (
        id,
        full_name,
        email,
        phone,
        telegram_chat_id
      )
    `)
    .eq('id', queueItem.ticket_id)
    .maybeSingle();

  if (ticketError) {
    return { error: ticketError.message ?? 'Unable to load ticket' };
  }

  if (!ticket) {
    return { error: 'Ticket not found' };
  }

  if (ticket.tenant_id !== tenant.id) {
    return { error: 'Ticket tenant mismatch' };
  }

  const activityPayload = await loadActivity(supabase, queueItem.activity_id);
  const payload: TicketPayload = {
    tenant_id: tenant.id,
    tenant_name: tenant.name ?? null,
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    priority: ticket.priority ?? null,
    title: ticket.title,
    description: ticket.description ?? null,
    location: ticket.location ?? null,
    complainant: {
      id: ticket.complainant?.id ?? null,
      name: ticket.complainant?.full_name ?? null,
      email: ticket.complainant?.email ?? null,
      phone: ticket.complainant?.phone ?? null,
      chat_id: ticket.complainant?.telegram_chat_id ?? null,
    },
    latest_activity: activityPayload ?? undefined,
    generated_at: new Date().toISOString(),
  };

  return { payload };
}

async function loadActivity(
  supabase: SupabaseClient,
  activityId: string | null,
): Promise<TicketPayload['latest_activity'] | null> {
  if (!activityId) {
    return null;
  }

  const { data, error } = await supabase
    .from('ticket_activities')
    .select(`
      id,
      activity_type,
      comment,
      metadata,
      created_at,
      created_by,
      users!ticket_activities_created_by_fkey (
        id,
        full_name
      )
    `)
    .eq('id', activityId)
    .maybeSingle();

  if (error) {
    console.warn('[ticket-activity-webhook] Failed to load activity', {
      activity_id: activityId,
      error,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  const createdByUser = Array.isArray(data.users) ? data.users[0] : data.users;

  return {
    id: data.id ?? null,
    type: data.activity_type ?? null,
    comment: data.comment ?? null,
    metadata: data.metadata ?? null,
    created_at: data.created_at ?? null,
    created_by: createdByUser
      ? {
        id: createdByUser.id ?? null,
        name: createdByUser.full_name ?? null,
      }
      : null,
  };
}

async function sendWebhook(
  url: string,
  payload: TicketPayload,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FMS-Ticket-Activity/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return { ok: true };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, error };
  }
}

async function markDelivered(
  supabase: SupabaseClient,
  queueId: string,
  _attemptCount: number,
  payload: TicketPayload | null,
  lastError: string | null,
) {
  await supabase
    .from('ticket_webhook_queue')
    .update({
      status: 'delivered',
      last_error: lastError,
      next_attempt_at: null,
      payload: payload ? payload as unknown as Record<string, unknown> : null,
    })
    .eq('id', queueId);
}

async function markFailed(
  supabase: SupabaseClient,
  queueId: string,
  attemptCount: number,
  errorMessage: string,
) {
  const nextAttemptDelay = calculateBackoff(attemptCount);
  const nextAttemptAt = new Date(Date.now() + nextAttemptDelay).toISOString();

  await supabase
    .from('ticket_webhook_queue')
    .update({
      status: 'failed',
      last_error: errorMessage.slice(0, 500),
      next_attempt_at: nextAttemptAt,
    })
    .eq('id', queueId);
}

function calculateBackoff(attemptCount: number): number {
  const baseDelay = 30_000; // 30 seconds
  const delay = baseDelay * Math.pow(2, Math.max(0, attemptCount - 1));
  return Math.min(delay, MAX_BACKOFF_MS);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

