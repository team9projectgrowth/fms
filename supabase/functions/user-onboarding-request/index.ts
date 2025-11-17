import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

interface RequestBody {
  user_id: string;
  correlation_id?: string;
  reason?: string;
}

interface TenantNotificationInput {
  tenant_id: string;
  user_id: string;
  triggered_by: string;
  type: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse(
        { error: 'Method not allowed' },
        405,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const makeWebhookUrl = Deno.env.get('MAKE_USER_ONBOARDING_WEBHOOK_URL');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[user-onboarding-request] Missing Supabase environment variables');
      return jsonResponse(
        { error: 'Server configuration incomplete' },
        500,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authData?.user) {
      console.error('[user-onboarding-request] Failed to validate token', authError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as RequestBody | null;
    if (!body || !body.user_id || typeof body.user_id !== 'string') {
      return jsonResponse({ error: 'user_id is required' }, 400);
    }

    const adminUserId = authData.user.id;

    const { data: adminProfile, error: adminFetchError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, email, full_name')
      .eq('id', adminUserId)
      .maybeSingle();

    if (adminFetchError || !adminProfile) {
      console.error('[user-onboarding-request] Unable to fetch initiating user profile', adminFetchError);
      return jsonResponse({ error: 'Unable to load profile for authenticated user' }, 403);
    }

    if (adminProfile.role !== 'tenant_admin' || !adminProfile.tenant_id) {
      return jsonResponse({ error: 'Only tenant admins can trigger onboarding' }, 403);
    }

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role, email, full_name, emp_code, tenant_id, bot_onboarding_status, bot_onboarding_retry_count, bot_correlation_id, telegram_chat_id, telegram_user_id')
      .eq('id', body.user_id)
      .maybeSingle();

    if (targetError || !targetUser) {
      console.error('[user-onboarding-request] Target user not found', targetError);
      return jsonResponse({ error: 'Target user not found' }, 404);
    }

    if (!targetUser.tenant_id || targetUser.tenant_id !== adminProfile.tenant_id) {
      return jsonResponse({ error: 'User does not belong to your tenant' }, 403);
    }

    if (targetUser.role !== 'executor' && targetUser.role !== 'complainant') {
      return jsonResponse({ error: 'Onboarding is only available for executors or complainants' }, 409);
    }

    if (!targetUser.email) {
      return jsonResponse({ error: 'Target user is missing an email address' }, 400);
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', targetUser.tenant_id)
      .maybeSingle();

    if (tenantError || !tenant) {
      console.error('[user-onboarding-request] Tenant not found', tenantError);
      return jsonResponse({ error: 'Tenant not found for user' }, 404);
    }

    const correlationId = body.correlation_id || crypto.randomUUID();

    if (!makeWebhookUrl || !makeWebhookUrl.trim()) {
      const message = 'Make webhook URL is not configured. Contact support.';
      await updateUserStatus(supabaseAdmin, {
        userId: targetUser.id,
        status: 'failed',
        correlationId,
        incrementRetry: true,
        error: message,
      });
      await insertNotification(supabaseAdmin, {
        tenant_id: tenant.id,
        user_id: targetUser.id,
        triggered_by: adminProfile.id,
        type: 'onboarding.error',
        title: `Onboarding failed for ${targetUser.email}`,
        message,
        level: 'error',
        metadata: {
          correlation_id: correlationId,
          reason: 'missing_webhook_url',
          email: targetUser.email,
          role: targetUser.role,
          employee_id: targetUser.emp_code,
        },
      });
      return jsonResponse({ error: message }, 500);
    }

    if (targetUser.telegram_chat_id && targetUser.bot_onboarding_status === 'completed') {
      return jsonResponse({ status: 'already_completed' }, 200);
    }

    const nowIso = new Date().toISOString();

    await updateUserStatus(supabaseAdmin, {
      userId: targetUser.id,
      status: 'pending',
      correlationId,
      error: null,
      startedAt: nowIso,
      incrementRetry: targetUser.bot_correlation_id ? true : false,
    });

    await insertNotification(supabaseAdmin, {
      tenant_id: tenant.id,
      user_id: targetUser.id,
      triggered_by: adminProfile.id,
      type: 'onboarding.queued',
      title: `Onboarding started for ${targetUser.email}`,
      message: `Preparing Telegram deep-link email for ${targetUser.email}.`,
      level: 'info',
      metadata: {
        correlation_id: correlationId,
        email: targetUser.email,
        tenant_id: tenant.id,
        role: targetUser.role,
        employee_id: targetUser.emp_code,
        initiated_by: adminProfile.email,
        reason: body.reason ?? 'user_created',
      },
    });

    const makePayload = {
      event_type: 'tenant.user.onboarding_requested',
      correlation_id: correlationId,
      requested_at: nowIso,
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: targetUser.role,
        employee_id: targetUser.emp_code,
        bot_username: targetUser.telegram_user_id,
      },
      initiated_by: {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.full_name,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let makeResponseOk = false;
    let makeResponseBody: string | undefined;
    let makeStatus = 0;

    try {
      const makeResponse = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makePayload),
        signal: controller.signal,
      });
      makeStatus = makeResponse.status;
      makeResponseBody = await makeResponse.text().catch(() => undefined);
      makeResponseOk = makeResponse.ok;
    } catch (error) {
      clearTimeout(timeout);
      console.error('[user-onboarding-request] Failed to call Make webhook', error);
      await updateUserStatus(supabaseAdmin, {
        userId: targetUser.id,
        status: 'failed',
        correlationId,
        incrementRetry: true,
        error: 'Unable to reach automation webhook',
      });
      await insertNotification(supabaseAdmin, {
        tenant_id: tenant.id,
        user_id: targetUser.id,
        triggered_by: adminProfile.id,
        type: 'onboarding.error',
        title: `Onboarding failed for ${targetUser.email}`,
        message: 'Unable to reach automation webhook. Retry later.',
        level: 'error',
        metadata: {
          correlation_id: correlationId,
          email: targetUser.email,
          tenant_id: tenant.id,
          role: targetUser.role,
          employee_id: targetUser.emp_code,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return jsonResponse(
        { error: 'Failed to dispatch onboarding webhook', correlation_id: correlationId },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!makeResponseOk) {
      const errorMessage = `Automation webhook returned status ${makeStatus}`;
      console.error('[user-onboarding-request] Make webhook error', {
        status: makeStatus,
        body: makeResponseBody,
      });

      await updateUserStatus(supabaseAdmin, {
        userId: targetUser.id,
        status: 'failed',
        correlationId,
        incrementRetry: true,
        error: errorMessage,
      });

      await insertNotification(supabaseAdmin, {
        tenant_id: tenant.id,
        user_id: targetUser.id,
        triggered_by: adminProfile.id,
        type: 'onboarding.error',
        title: `Onboarding failed for ${targetUser.email}`,
        message: `Automation webhook returned status ${makeStatus}.`,
        level: 'error',
        metadata: {
          correlation_id: correlationId,
          status: makeStatus,
          email: targetUser.email,
          tenant_id: tenant.id,
          role: targetUser.role,
          employee_id: targetUser.emp_code,
          response_body: makeResponseBody,
        },
      });

      return jsonResponse(
        {
          error: errorMessage,
          correlation_id: correlationId,
          status_code: makeStatus,
          response_body: makeResponseBody,
        },
        502,
      );
    }

    await updateUserStatus(supabaseAdmin, {
      userId: targetUser.id,
      status: 'invited',
      correlationId,
    });

    await insertNotification(supabaseAdmin, {
      tenant_id: tenant.id,
      user_id: targetUser.id,
      triggered_by: adminProfile.id,
      type: 'onboarding.invite_sent',
      title: `Invite email sent to ${targetUser.email}`,
      message: 'Telegram deep-link email dispatched successfully.',
      level: 'info',
      metadata: {
        correlation_id: correlationId,
        email: targetUser.email,
        tenant_id: tenant.id,
        role: targetUser.role,
        employee_id: targetUser.emp_code,
        make_status: makeStatus,
        response_body: makeResponseBody,
      },
    });

    return jsonResponse({
      status: 'queued',
      correlation_id: correlationId,
    }, 202);
  } catch (error) {
    console.error('[user-onboarding-request] Unexpected error', error);
    return jsonResponse(
      {
        error: 'Unexpected server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

async function updateUserStatus(
  supabase: SupabaseClient,
  options: {
    userId: string;
    status: 'pending' | 'invited' | 'failed';
    correlationId: string;
    startedAt?: string;
    error?: string | null;
    incrementRetry?: boolean;
  },
) {
  const { userId, status, correlationId, startedAt, error, incrementRetry } = options;

  const updates: Record<string, unknown> = {
    bot_onboarding_status: status,
    bot_correlation_id: correlationId,
  };

  if (startedAt) {
    updates.bot_onboarding_started_at = startedAt;
  }

  if (status !== 'failed') {
    updates.bot_onboarding_error = null;
  } else if (error) {
    updates.bot_onboarding_error = error;
  }

  if (incrementRetry) {
    // Manual increment to avoid race conditions
    const { data: current, error: fetchError } = await supabase
      .from('users')
      .select('bot_onboarding_retry_count')
      .eq('id', userId)
      .maybeSingle();

    if (!fetchError && current) {
      updates.bot_onboarding_retry_count = (current.bot_onboarding_retry_count ?? 0) + 1;
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (updateError) {
    console.error('[user-onboarding-request] Failed to update user status', updateError);
  }
}

async function insertNotification(
  supabase: SupabaseClient,
  payload: TenantNotificationInput,
) {
  const { error } = await supabase
    .from('tenant_notifications')
    .insert({
      tenant_id: payload.tenant_id,
      user_id: payload.user_id,
      triggered_by: payload.triggered_by,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      level: payload.level,
      metadata: payload.metadata,
    });

  if (error) {
    console.error('[user-onboarding-request] Failed to insert notification', error);
  }
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

