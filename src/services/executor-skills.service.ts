import { supabase } from '../lib/supabase';

export interface ExecutorSkill {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string; // Category ID (nullable, foreign key to categories table)
  is_active: boolean;
}

export const executorSkillsService = {
  async getAll(tenantId?: string | null): Promise<ExecutorSkill[]> {
    let query = supabase
      .from('executor_skill')
      .select('*')
      .order('name', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId?: string | null): Promise<ExecutorSkill[]> {
    let query = supabase
      .from('executor_skill')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ExecutorSkill | null> {
    const { data, error } = await supabase
      .from('executor_skill')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(skill: Omit<ExecutorSkill, 'id'>, tenantId: string | null): Promise<ExecutorSkill> {
    if (!tenantId) {
      throw new Error('Tenant ID is required to create an executor skill');
    }

    const { data, error } = await supabase
      .from('executor_skill')
      .insert({
        ...skill,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<ExecutorSkill, 'id' | 'tenant_id'>>): Promise<ExecutorSkill> {
    const { data, error } = await supabase
      .from('executor_skill')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('executor_skill')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

