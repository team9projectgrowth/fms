import { supabase } from '../lib/supabase';
import type { Category, Priority } from '../types/database';

export const configService = {
  async getCategories(tenantId?: string) {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Category[];
  },

  async getAllCategories(tenantId?: string) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Category[];
  },

  async createCategory(name: string, description?: string, tenantId?: string) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getPriorities(tenantId?: string) {
    let query = supabase
      .from('priorities')
      .select('*')
      .eq('active', true)
      .order('level');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Priority[];
  },

  async getAllPriorities(tenantId?: string) {
    let query = supabase
      .from('priorities')
      .select('*')
      .order('level');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Priority[];
  },

  async createPriority(input: Omit<Priority, 'id' | 'created_at'>, tenantId?: string) {
    const { data, error } = await supabase
      .from('priorities')
      .insert({
        ...input,
        tenant_id: tenantId || (input as any).tenant_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Priority;
  },

  async updatePriority(id: string, updates: Partial<Priority>) {
    const { data, error } = await supabase
      .from('priorities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Priority;
  },

  async deletePriority(id: string) {
    const { error } = await supabase
      .from('priorities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
