import { supabase } from '../lib/supabase';
import type { ExecutorProfile, ExecutorProfileWithUser, ExecutorAvailability } from '../types/database';

export const executorProfilesService = {
  async list(tenantId?: string | null) {
    let query = supabase
      .from('executor_profiles')
      .select('*, user:users(*)')
      .order('created_at', { ascending: false });

    // Super Admin (tenantId is null) sees all executors
    // Tenant Admin (tenantId is set) sees only their tenant's executors
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ExecutorProfileWithUser[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .select('*, user:users(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as ExecutorProfileWithUser | null;
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .select('*, user:users(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as ExecutorProfileWithUser | null;
  },

  async create(input: Omit<ExecutorProfile, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .insert(input)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return data as ExecutorProfileWithUser;
  },

  async update(id: string, updates: Partial<ExecutorProfile>) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return data as ExecutorProfileWithUser;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('executor_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateAvailability(id: string, availability: ExecutorAvailability) {
    return this.update(id, { availability_status: availability });
  },

  async updateCurrentLoad(id: string, currentLoad: number) {
    return this.update(id, { current_load: currentLoad });
  },
};
