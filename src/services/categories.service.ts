import { supabase } from '../lib/supabase';
import type { Category } from '../types/database';

export const categoriesService = {
  async getAll(tenantId?: string | null): Promise<Category[]> {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    // Super Admin (tenantId is null) sees all categories
    // Tenant Admin (tenantId is set) sees only their tenant's categories
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId?: string | null): Promise<Category[]> {
    let query = supabase
      .from('categories')
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

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(category: Omit<Category, 'id'>, tenantId: string | null): Promise<Category> {
    // tenant_id is required - throw error if not provided
    if (!tenantId) {
      throw new Error('tenant_id is required to create a category');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<Category, 'id' | 'tenant_id'>>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Note: sort_order field doesn't exist in database schema
  // This method is kept for compatibility but does nothing
  async updateSortOrder(categoryIds: string[]): Promise<void> {
    // No-op: sort_order doesn't exist in database
    console.warn('updateSortOrder called but sort_order field does not exist in database');
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getTicketCount(categoryId: string, days: number = 30, tenantId?: string | null): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .gte('created_at', startDate.toISOString());

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  },
};
