import { supabase } from '../lib/supabase';
import type { Priority } from '../types/database';

export const prioritiesService = {
  async getAll(tenantId?: string | null): Promise<Priority[]> {
    let query = supabase
      .from('priorities')
      .select('*')
      .order('level_order', { ascending: true, nullsFirst: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId?: string | null): Promise<Priority[]> {
    let query = supabase
      .from('priorities')
      .select('*')
      .eq('is_active', true)
      .order('level_order', { ascending: true, nullsFirst: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Priority | null> {
    const { data, error } = await supabase
      .from('priorities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(priority: Omit<Priority, 'id' | 'created_at'>, tenantId: string | null): Promise<Priority> {
    if (!tenantId) {
      throw new Error('Tenant ID is required to create a priority');
    }

    // Get max level_order to set next priority order
    const existingPriorities = await this.getAll(tenantId);
    const maxLevelOrder = existingPriorities.length > 0 
      ? Math.max(...existingPriorities.map(p => p.level_order || 0))
      : 0;

    const { data, error } = await supabase
      .from('priorities')
      .insert({
        ...priority,
        tenant_id: tenantId,
        level_order: priority.level_order ?? (maxLevelOrder + 1),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<Priority, 'id' | 'created_at'>>): Promise<Priority> {
    const { data, error } = await supabase
      .from('priorities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('priorities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getTicketCount(priorityId: string, tenantId?: string | null, days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get priority name first
    const priority = await this.getById(priorityId);
    if (!priority) return 0;

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('priority', priority.name.toLowerCase())
      .gte('created_at', startDate.toISOString());

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  },
};

