import { supabase } from '../lib/supabase';
import type { ExecutorProfile, ExecutorProfileWithUser, ExecutorAvailability } from '../types/database';
import { authService } from './auth.service';

// Note: This service uses executor_profiles table, not executors
export const executorsService = {
  async getExecutors(tenantId?: string | null) {
    let query = supabase
      .from('executor_profiles')
      .select('*, user:users!executor_profiles_user_id_fkey(*)');
    
    // Order by user's full_name or email if available, otherwise by id
    // Note: executor_profiles doesn't have created_at, so we order by user data

    // Filter by tenant if provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      // For tenant admins, filter by their tenant
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
        query = query.eq('tenant_id', currentUser.tenant_id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching executors:', error);
      throw error;
    }
    
    return (data || []) as ExecutorProfileWithUser[];
  },

  async getExecutorById(id: string) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .select('*, user:users!executor_profiles_user_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching executor by ID:', error);
      throw error;
    }
    return data as ExecutorProfileWithUser | null;
  },

  async getExecutorByUserId(userId: string) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .select('*, user:users!executor_profiles_user_id_fkey(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching executor by user ID:', error);
      throw error;
    }
    return data as ExecutorProfileWithUser | null;
  },

  async createExecutor(input: {
    tenant_id: string;
    user_id: string;
    skills?: any[];
    max_concurrent_tickets?: number;
    // Note: current_load is not in the schema, use assigned_tickets_count instead
    availability_status?: ExecutorAvailability;
    employee_id?: string;
    manager_id?: string;
    full_name?: string;
  }) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .insert({
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        skills: input.skills || [],
        max_concurrent_tickets: input.max_concurrent_tickets || 10,
        availability_status: input.availability_status || 'available',
        employee_id: input.employee_id || null,
        manager_id: input.manager_id || null,
        full_name: input.full_name || null,
        assigned_tickets_count: 0, // Default value for NOT NULL column
        open_tickets_count: 0, // Default value for NOT NULL column
      })
      .select('*, user:users!executor_profiles_user_id_fkey(*)')
      .single();

    if (error) {
      console.error('Error creating executor profile:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        input: input
      });
      throw error;
    }
    return data as ExecutorProfileWithUser;
  },

  async updateExecutor(id: string, updates: Partial<ExecutorProfile>) {
    const { data, error } = await supabase
      .from('executor_profiles')
      .update(updates)
      .eq('id', id)
      .select('*, user:users!executor_profiles_user_id_fkey(*)')
      .single();

    if (error) {
      console.error('Error updating executor:', error);
      throw error;
    }
    return data as ExecutorProfileWithUser;
  },

  async deleteExecutor(id: string) {
    const { error } = await supabase
      .from('executor_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting executor:', error);
      throw error;
    }
  },

  async updateAvailability(id: string, availability: ExecutorAvailability) {
    return this.updateExecutor(id, { availability_status: availability });
  },

  async updateCurrentLoad(id: string, currentLoad: number) {
    // Use assigned_tickets_count instead of current_load
    return this.updateExecutor(id, { assigned_tickets_count: currentLoad } as any);
  },

  async incrementLoad(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    const currentCount = (executor as any).assigned_tickets_count || 0;
    return this.updateCurrentLoad(id, currentCount + 1);
  },

  async decrementLoad(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    const currentCount = (executor as any).assigned_tickets_count || 0;
    return this.updateCurrentLoad(id, Math.max(0, currentCount - 1));
  },

  async getAvailableExecutors(skills?: string[], tenantId?: string | null) {
    let query = supabase
      .from('executor_profiles')
      .select('*, user:users!executor_profiles_user_id_fkey(*)')
      .eq('availability_status', 'available');

    // Filter by tenant if provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      // For tenant admins, filter by their tenant
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
        query = query.eq('tenant_id', currentUser.tenant_id);
      }
    }

    if (skills && skills.length > 0) {
      query = query.contains('skills', skills);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available executors:', error);
      throw error;
    }
    return (data || []) as ExecutorProfileWithUser[];
  },

  async getExecutorStats(id: string) {
    const executor = await this.getExecutorById(id);
    if (!executor) throw new Error('Executor not found');

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status')
      .eq('executor_profile_id', id);

    if (error) throw error;

    const assignedCount = (executor as any).assigned_tickets_count || 0;
    const maxTickets = executor.max_concurrent_tickets || 10;

    const stats = {
      total: tickets?.length || 0,
      open: tickets?.filter(t => t.status === 'open').length || 0,
      inProgress: tickets?.filter(t => t.status === 'in-progress').length || 0,
      resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
      closed: tickets?.filter(t => t.status === 'closed').length || 0,
      currentLoad: assignedCount,
      maxLoad: maxTickets,
      loadPercentage: maxTickets > 0 ? (assignedCount / maxTickets) * 100 : 0,
    };

    return stats;
  },
};
