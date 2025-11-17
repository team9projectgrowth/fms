import { supabase } from '../lib/supabase';
import type { Designation } from '../types/database';

export const designationsService = {
  async getAll(tenantId?: string | null): Promise<Designation[]> {
    let query = supabase
      .from('designations')
      .select('*')
      .order('name', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId?: string | null): Promise<Designation[]> {
    let query = supabase
      .from('designations')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Designation | null> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(designation: Omit<Designation, 'id' | 'created_at' | 'updated_at'>, tenantId: string | null): Promise<Designation> {
    if (!tenantId) {
      throw new Error('Tenant ID is required to create a designation');
    }

    const { data, error } = await supabase
      .from('designations')
      .insert({
        ...designation,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<Designation, 'id' | 'created_at' | 'updated_at'>>): Promise<Designation> {
    const { data, error } = await supabase
      .from('designations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('designations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

