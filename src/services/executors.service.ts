import { supabase } from '../lib/supabase';
import type { Executor, ExecutorWithUser, CreateExecutorInput, ExecutorAvailability } from '../types/database';

export const executorsService = {
  async getExecutors() {
    const { data, error } = await supabase
      .from('executors')
      .select('*, user:users(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ExecutorWithUser[];
  },

  async getExecutorById(id: string) {
    const { data, error } = await supabase
      .from('executors')
      .select('*, user:users(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as ExecutorWithUser | null;
  },

  async getExecutorByUserId(userId: string) {
    const { data, error } = await supabase
      .from('executors')
      .select('*, user:users(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as ExecutorWithUser | null;
  },

  async createExecutor(input: CreateExecutorInput) {
    const { data, error } = await supabase
      .from('executors')
      .insert(input)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return data as ExecutorWithUser;
  },

  async updateExecutor(id: string, updates: Partial<Executor>) {
    const { data, error } = await supabase
      .from('executors')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return data as ExecutorWithUser;
  },

  async deleteExecutor(id: string) {
    const { error } = await supabase
      .from('executors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateAvailability(id: string, availability: ExecutorAvailability) {
    return this.updateExecutor(id, { availability });
  },

  async updateCurrentLoad(id: string, currentLoad: number) {
    return this.updateExecutor(id, { current_load: currentLoad });
  },

  async incrementLoad(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    return this.updateCurrentLoad(id, executor.current_load + 1);
  },

  async decrementLoad(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    return this.updateCurrentLoad(id, Math.max(0, executor.current_load - 1));
  },

  async getAvailableExecutors(skills?: string[]) {
    let query = supabase
      .from('executors')
      .select('*, user:users(*)')
      .eq('availability', 'available')
      .filter('user.active', 'eq', true);

    if (skills && skills.length > 0) {
      query = query.contains('skills', skills);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ExecutorWithUser[];
  },

  async getExecutorStats(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status')
      .eq('executor_id', id);

    if (error) throw error;

    const stats = {
      total: tickets?.length || 0,
      open: tickets?.filter(t => t.status === 'open').length || 0,
      inProgress: tickets?.filter(t => t.status === 'in-progress').length || 0,
      resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
      closed: tickets?.filter(t => t.status === 'closed').length || 0,
      currentLoad: executor.current_load,
      maxLoad: executor.max_tickets,
      loadPercentage: (executor.current_load / executor.max_tickets) * 100,
    };

    return stats;
  },
};
