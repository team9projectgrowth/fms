// Supabase Edge Function to receive webhook calls from automation layer
// This function can be deployed to Supabase Edge Functions
// 
// To deploy: supabase functions deploy telegram-webhook
// Endpoint will be: https://<project-ref>.supabase.co/functions/v1/telegram-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import types (these would need to be available or defined here)
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const data: TelegramTicketInput = await req.json();

    // Validate required fields
    if (!data.issue || !data.location || !data.category || !data.priority || 
        !data.name || !data.chat_id || !data.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find user by telegram_chat_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, is_active')
      .eq('telegram_chat_id', data.chat_id)
      .eq('tenant_id', data.tenant_id)
      .maybeSingle();

    if (userError) {
      throw new Error(`Error finding user: ${userError.message}`);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ 
          error: `User not found with chat_id: ${data.chat_id} in tenant: ${data.tenant_id}` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!user.is_active) {
      return new Response(
        JSON.stringify({ error: 'User is not active and cannot create tickets' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create ticket
    const ticketData = {
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
      .insert(ticketData)
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Error creating ticket: ${ticketError.message}`);
    }

    // Trigger rule engine processing (this would typically be done via a database trigger or separate function)
    // For now, we'll just return the created ticket
    // In production, you might want to call a separate function to process rules

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

