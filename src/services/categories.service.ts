import { supabase } from '../lib/supabase';
import type { Category } from '../types/database';

export const categoriesService = {
  async getAll(tenantId?: string | null): Promise<Category[]> {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

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

  async create(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>, tenantId: string | null): Promise<Category> {
    if (!tenantId) {
      throw new Error('Tenant ID is required to create a category');
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

  async update(id: string, updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSortOrder(categoryIds: string[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      id,
      sort_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('categories')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getTicketCount(categoryId: string, tenantId?: string | null, days: number = 30): Promise<number> {
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

  // Deprecated: Use executorsService.getExecutorSkills() instead
  // This method is kept for backward compatibility but should not be used
  async getExecutorSkills(executorUserId: string): Promise<Category[]> {
    console.warn('categoriesService.getExecutorSkills() is deprecated. Use executorsService.getExecutorSkills() instead.');
    // This method is no longer valid as executor_skills is now the master table
    // Use executorsService.getExecutorSkills() instead
    return [];
  },
};
