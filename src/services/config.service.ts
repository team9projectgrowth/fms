import { supabase } from '../lib/supabase';
import type { Category, Priority } from '../types/database';

export const configService = {
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as Category[];
  },

  async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Category[];
  },

  async createCategory(name: string, description?: string) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description })
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

  async getPriorities() {
    const { data, error } = await supabase
      .from('priorities')
      .select('*')
      .eq('active', true)
      .order('level');

    if (error) throw error;
    return (data || []) as Priority[];
  },

  async getAllPriorities() {
    const { data, error } = await supabase
      .from('priorities')
      .select('*')
      .order('level');

    if (error) throw error;
    return (data || []) as Priority[];
  },

  async createPriority(input: Omit<Priority, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('priorities')
      .insert(input)
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
