import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

import {
  isExecutorTelegramUpdate,
  handleExecutorTelegramUpdate,
} from '../_shared/executorTelegram.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set.');
    }

    const payload = await req.json();

    if (!isExecutorTelegramUpdate(payload)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Telegram update payload.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    await handleExecutorTelegramUpdate(payload, supabase, telegramBotToken);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[executor-ticket-webhook] Unexpected error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
