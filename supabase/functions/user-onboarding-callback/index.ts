import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

interface CallbackPayload {
  correlation_id?: string;
  status?: 'invite_sent' | 'awaiting_chat' | 'failed' | 'timeout' | 'cancelled';
  chat_id?: string | number;
  telegram_user_id?: string | number;
  error?: string;
  deep_link?: string;
  joined_at?: string;
  retry_count?: number;
}

interface TenantNotificationInput {
  tenant_id: string;
  user_id: string;
  triggered_by?: string | null;
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
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[user-onboarding-callback] Missing Supabase environment variables');
      return jsonResponse({ error: 'Server not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const callbackSecret = Deno.env.get('MAKE_ONBOARDING_CALLBACK_TOKEN');
    const expectedBearer = callbackSecret
      ? `Bearer ${callbackSecret}`
      : supabaseServiceKey ? `Bearer ${supabaseServiceKey}` : null;

    if (!expectedBearer || authHeader !== expectedBearer) {
      console.warn('[user-onboarding-callback] Unauthorized request received');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload = (await req.json()) as CallbackPayload | null;

    if (!payload?.correlation_id) {
      return jsonResponse({ error: 'correlation_id is required' }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, tenant_id, bot_onboarding_status, bot_onboarding_retry_count, bot_correlation_id, telegram_chat_id, telegram_user_id')
      .eq('bot_correlation_id', payload.correlation_id)
      .maybeSingle();

    if (userError) {
      console.error('[user-onboarding-callback] Failed to fetch user', userError);
      return jsonResponse({ error: 'Database error fetching user' }, 500);
    }

    if (!targetUser) {
      return jsonResponse({ error: 'No user found for correlation id' }, 404);
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', targetUser.tenant_id)
      .maybeSingle();

    if (tenantError) {
      console.error('[user-onboarding-callback] Failed to fetch tenant', tenantError);
      return jsonResponse({ error: 'Database error fetching tenant' }, 500);
    }

    const tenantName = tenant?.name ?? 'Tenant';

    const updates: Record<string, unknown> = {};
    const notifications: TenantNotificationInput[] = [];
    const nowIso = new Date().toISOString();

    if (payload.deep_link) {
      updates.bot_deep_link = payload.deep_link;
    }

    switch (deriveStatus(payload, targetUser.telegram_chat_id)) {
      case 'completed': {
        const chatId = payload.chat_id?.toString();
        if (!chatId) {
          return jsonResponse({ error: 'chat_id is required to mark onboarding completed' }, 400);
        }

        updates.bot_onboarding_status = 'completed';
        updates.bot_onboarding_completed_at = payload.joined_at || nowIso;
        updates.telegram_chat_id = chatId;
        updates.telegram_user_id = payload.telegram_user_id?.toString() ?? targetUser.telegram_user_id;
        updates.is_active = true;
        updates.bot_onboarding_error = null;

        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.completed',
          title: `Telegram connected for ${targetUser.email}`,
          message: 'The user is now active on the Telegram bot.',
          level: 'success',
          metadata: {
            correlation_id: payload.correlation_id,
            chat_id: chatId,
            telegram_user_id: payload.telegram_user_id,
            tenant_name: tenantName,
          },
        });
        break;
      }
      case 'awaiting_chat': {
        updates.bot_onboarding_status = 'awaiting_chat';
        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.awaiting_chat',
          title: `Waiting for ${targetUser.email} to start the bot`,
          message: 'Invite email delivered. Waiting for the user to click "Start" in Telegram.',
          level: 'info',
          metadata: {
            correlation_id: payload.correlation_id,
            tenant_name: tenantName,
          },
        });
        break;
      }
      case 'failed': {
        updates.bot_onboarding_status = 'failed';
        updates.bot_onboarding_error = payload.error || 'Unknown onboarding error';
        if (typeof payload.retry_count === 'number') {
          updates.bot_onboarding_retry_count = payload.retry_count;
        } else if (targetUser.bot_onboarding_retry_count !== null) {
          updates.bot_onboarding_retry_count = (targetUser.bot_onboarding_retry_count || 0) + 1;
        }
        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.error',
          title: `Onboarding failed for ${targetUser.email}`,
          message: payload.error || 'Automation reported a failure. Please review the Make logs.',
          level: 'error',
          metadata: {
            correlation_id: payload.correlation_id,
            error: payload.error,
            tenant_name: tenantName,
          },
        });
        break;
      }
      case 'timeout': {
        updates.bot_onboarding_status = 'failed';
        updates.bot_onboarding_error = payload.error || 'Onboarding timed out';
        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.timeout',
          title: `Onboarding timeout for ${targetUser.email}`,
          message: 'User did not start the bot in time. Consider resending the invite.',
          level: 'warning',
          metadata: {
            correlation_id: payload.correlation_id,
            error: payload.error,
            tenant_name: tenantName,
          },
        });
        break;
      }
      case 'cancelled': {
        updates.bot_onboarding_status = 'cancelled';
        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.cancelled',
          title: `Onboarding cancelled for ${targetUser.email}`,
          message: 'Automation cancelled the onboarding request.',
          level: 'info',
          metadata: {
            correlation_id: payload.correlation_id,
            error: payload.error,
            tenant_name: tenantName,
          },
        });
        break;
      }
      case 'invited':
      default: {
        updates.bot_onboarding_status = 'invited';
        notifications.push({
          tenant_id: targetUser.tenant_id,
          user_id: targetUser.id,
          triggered_by: null,
          type: 'onboarding.invite_sent',
          title: `Invite email sent to ${targetUser.email}`,
          message: 'Email with Telegram deep link sent successfully.',
          level: 'info',
          metadata: {
            correlation_id: payload.correlation_id,
            deep_link: payload.deep_link,
            tenant_name: tenantName,
          },
        });
        break;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('[user-onboarding-callback] Failed to update user state', updateError);
      return jsonResponse({ error: 'Failed to update user state' }, 500);
    }

    await insertNotifications(supabaseAdmin, notifications);

    return jsonResponse({
      status: updates.bot_onboarding_status,
      user_id: targetUser.id,
      tenant_id: targetUser.tenant_id,
      correlation_id: payload.correlation_id,
    });
  } catch (error) {
    console.error('[user-onboarding-callback] Unexpected error', error);
    return jsonResponse(
      {
        error: 'Unexpected server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

function deriveStatus(payload: CallbackPayload, existingChatId?: string | null) {
  if (payload.chat_id || existingChatId) {
    return 'completed';
  }

  if (!payload.status) {
    return 'invited';
  }

  return payload.status;
}

async function insertNotifications(
  supabase: SupabaseClient,
  notifications: TenantNotificationInput[],
) {
  if (!notifications.length) return;

  const { error } = await supabase
    .from('tenant_notifications')
    .insert(
      notifications.map((notification) => ({
        tenant_id: notification.tenant_id,
        user_id: notification.user_id,
        triggered_by: notification.triggered_by || null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        level: notification.level,
        metadata: notification.metadata,
      })),
    );

  if (error) {
    console.error('[user-onboarding-callback] Failed to insert notifications', error);
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

