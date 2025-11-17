import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

interface TelegramTicketInput {
  issue: string;
  location: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  name: string;
  designation?: string;
  department?: string;
  chat_id: string;
  tenant_id: string;
  type?: string;
  building?: string;
  floor?: string;
  room?: string;
}

interface AutomationResponse {
  success: boolean;
  ticket_id?: string;
  ticket_number?: string;
  error?: string;
  status?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json()) as TelegramTicketInput | null;

    const result = await handleAutomationTicketRequest(body, supabase);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.status ?? (result.success ? 200 : 400),
    });
  } catch (error) {
    console.error('[telegram-webhook] Unexpected error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

async function handleAutomationTicketRequest(
  data: TelegramTicketInput | null,
  supabase: SupabaseClient,
): Promise<AutomationResponse> {
  if (!data) {
    return { success: false, error: 'Invalid JSON payload', status: 400 };
  }

  const requiredFields: Array<keyof TelegramTicketInput> = [
    'issue',
    'location',
    'category',
    'priority',
    'name',
    'chat_id',
    'tenant_id',
  ];

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field]?.toString().trim())) {
      return { success: false, error: `Missing required field: ${field}`, status: 400 };
    }
  }

  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!validPriorities.includes(data.priority)) {
    return {
      success: false,
      error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      status: 400,
    };
  }

  const chatIdStr = String(data.chat_id);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, is_active')
    .eq('tenant_id', data.tenant_id)
    .or(`telegram_chat_id.eq.${chatIdStr},telegram_user_id.eq.${chatIdStr}`)
    .maybeSingle();

  if (userError) {
    console.error('[telegram-webhook] Failed to look up user', userError);
    return { success: false, error: 'Unable to find user for chat', status: 500 };
  }

  if (!user) {
    return {
      success: false,
      error: `User not found with chat_id: ${data.chat_id} in tenant: ${data.tenant_id}`,
      status: 404,
    };
  }

  if (!user.is_active) {
    return {
      success: false,
      error: 'User is not active and cannot create tickets',
      status: 403,
    };
  }

  const ticketInsert = {
    title: data.issue.trim(),
    description: data.issue.trim(),
    category: data.category.trim(),
    priority: data.priority,
    type: data.type?.trim() || 'Maintenance',
    location: data.location.trim(),
    complainant_id: user.id,
    tenant_id: data.tenant_id,
    building: data.building?.trim(),
    floor: data.floor?.trim(),
    room: data.room?.trim(),
    status: 'open',
  };

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert(ticketInsert)
    .select()
    .single();

  if (ticketError) {
    console.error('[telegram-webhook] Failed to create ticket', ticketError);
    return { success: false, error: ticketError.message, status: 500 };
  }

  return {
    success: true,
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: 200,
  };
}
