import { supabase } from '../lib/supabase';
import type {
  Ticket,
  TicketWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
} from '../types/database';

export const ticketsService = {
  async getTickets(filters?: TicketFilters, page = 1, limit = 10, tenantId?: string) {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        complainant:users!tickets_complainant_id_fkey(*),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users(*))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters?.executor_id) {
      query = query.eq('executor_id', filters.executor_id);
    }

    if (filters?.complainant_id) {
      query = query.eq('complainant_id', filters.complainant_id);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      tickets: (data || []) as TicketWithRelations[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getTicketById(id: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        complainant:users!tickets_complainant_id_fkey(*),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users(*))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as TicketWithRelations | null;
  },

  async createTicket(input: CreateTicketInput, tenantId?: string) {
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ...input,
        ticket_number: '',
        tenant_id: tenantId || (input as any).tenant_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Ticket;
  },

  async updateTicket(id: string, input: UpdateTicketInput) {
    const { data, error } = await supabase
      .from('tickets')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Ticket;
  },

  async deleteTicket(id: string) {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async assignExecutor(ticketId: string, executorProfileId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .update({ executor_profile_id: executorProfileId, status: 'in-progress' })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data as Ticket;
  },

  async updateStatus(ticketId: string, status: string) {
    const updates: any = { status };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data as Ticket;
  },
};
