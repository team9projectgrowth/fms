import { supabase } from '../lib/supabase';
import type { Executor, ExecutorWithUser, ExecutorWithProfile, CreateExecutorInput, ExecutorAvailability } from '../types/database';
import { authService } from './auth.service';

export const executorsService = {
  async getExecutors() {
    // For tenant admins, filter by tenant_id through executor_profiles
    const currentUser = await authService.getCurrentUser();
    
    // If tenant admin, first get executor IDs from executor_profiles
    let executorIds: string[] | undefined;
    if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
      const { data: profiles, error: profileError } = await supabase
        .from('executor_profiles')
        .select('executor_id')
        .eq('tenant_id', currentUser.tenant_id);

      if (profileError) {
        console.error('Error fetching executor profiles:', profileError);
        throw profileError;
      }

      executorIds = profiles?.map(p => p.executor_id) || [];
      
      // If no executor profiles found for this tenant, return empty array
      if (executorIds.length === 0) {
        return [];
      }
    }

    let query = supabase
      .from('executors')
      .select(`
        *,
        user:users(*),
        executor_profiles(*)
      `);

    // Filter by executor IDs if tenant admin
    if (executorIds && executorIds.length > 0) {
      query = query.in('id', executorIds);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching executors:', error);
      throw error;
    }
    
    return (data || []) as ExecutorWithProfile[];
  },

  async getExecutorById(id: string) {
    const { data, error } = await supabase
      .from('executors')
      .select(`
        *,
        user:users(*),
        executor_profiles(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching executor by ID:', error);
      throw error;
    }
    return data as ExecutorWithProfile | null;
  },

  async getExecutorByUserId(userId: string) {
    const { data, error } = await supabase
      .from('executors')
      .select(`
        *,
        user:users(*),
        executor_profiles(*)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching executor by user ID:', error);
      throw error;
    }
    return data as ExecutorWithProfile | null;
  },

  async createExecutor(input: CreateExecutorInput) {
    // Get current user's tenant_id if tenant admin
    const currentUser = await authService.getCurrentUser();
    const tenantId = currentUser?.role === 'tenant_admin' ? currentUser.tenant_id : undefined;

    // First create the executor
    const { data: executorData, error: executorError } = await supabase
      .from('executors')
      .insert(input)
      .select('*, user:users(*)')
      .single();

    if (executorError) {
      console.error('Error creating executor:', {
        input,
        error: executorError.message,
        details: executorError.details,
        hint: executorError.hint,
        code: executorError.code
      });
      throw executorError;
    }

    // If tenant admin, create executor_profile
    if (tenantId && executorData) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('executor_profiles')
          .insert({
            executor_id: executorData.id,
            tenant_id: tenantId,
          })
          .select()
          .single();

        if (profileError) {
          console.warn('Warning: Could not create executor_profile:', profileError);
          // Continue anyway - executor is created
        }

        return {
          ...executorData,
          executor_profiles: profileData ? [profileData] : undefined
        } as ExecutorWithProfile;
      } catch (profileErr) {
        console.warn('Warning: Could not create executor_profile:', profileErr);
        // Continue anyway
      }
    }

    return executorData as ExecutorWithProfile;
  },

  async updateExecutor(id: string, updates: Partial<Executor>) {
    const { data, error } = await supabase
      .from('executors')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users(*),
        executor_profiles(*)
      `)
      .single();

    if (error) {
      console.error('Error updating executor:', error);
      throw error;
    }
    return data as ExecutorWithProfile;
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
    const currentUser = await authService.getCurrentUser();
    
    // If tenant admin, first get executor IDs from executor_profiles
    let executorIds: string[] | undefined;
    if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
      const { data: profiles, error: profileError } = await supabase
        .from('executor_profiles')
        .select('executor_id')
        .eq('tenant_id', currentUser.tenant_id);

      if (profileError) {
        console.error('Error fetching executor profiles:', profileError);
        throw profileError;
      }

      executorIds = profiles?.map(p => p.executor_id) || [];
      
      // If no executor profiles found for this tenant, return empty array
      if (executorIds.length === 0) {
        return [];
      }
    }

    let query = supabase
      .from('executors')
      .select(`
        *,
        user:users(*),
        executor_profiles(*)
      `)
      .eq('availability', 'available')
      .filter('user.active', 'eq', true);

    // Filter by executor IDs if tenant admin
    if (executorIds && executorIds.length > 0) {
      query = query.in('id', executorIds);
    }

    if (skills && skills.length > 0) {
      query = query.contains('skills', skills);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available executors:', error);
      throw error;
    }
    return (data || []) as ExecutorWithProfile[];
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
