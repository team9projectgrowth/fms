import { supabase } from '../lib/supabase';
import type { ExecutorProfile, ExecutorProfileWithUser, ExecutorAvailability } from '../types/database';
import { authService } from './auth.service';
import { usersService } from './users.service';

// Note: This service uses executor_profiles table, not executors
export const executorsService = {
  async getExecutors(tenantId?: string | null) {
    let query = supabase
      .from('executor_profiles')
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        ),
        category:categories!executor_profiles_category_id_fkey(
          id,
          name,
          description,
          icon,
          color,
          is_active
        )
      `);
    
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
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        ),
        category:categories!executor_profiles_category_id_fkey(
          id,
          name,
          description,
          icon,
          color,
          is_active
        )
      `)
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
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        ),
        category:categories!executor_profiles_category_id_fkey(
          id,
          name,
          description,
          icon,
          color,
          is_active
        )
      `)
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
    skills?: string[]; // Array of category IDs for skills
    category_id?: string; // Primary category ID
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
        skills: [], // Store skills in executor_skills table instead
        category_id: input.category_id || null,
        max_concurrent_tickets: input.max_concurrent_tickets || 10,
        availability_status: input.availability_status || 'available',
        employee_id: input.employee_id || null,
        manager_id: input.manager_id || null,
        full_name: input.full_name || null,
        assigned_tickets_count: 0, // Default value for NOT NULL column
        open_tickets_count: 0, // Default value for NOT NULL column
      })
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        )
      `)
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

    // Create executor skill assignments if skills are provided
    // Note: executor_skills is the master table (tenant_id, category, skill name)
    // We use junction table (executor_user_skills) to link executors to skills
    if (input.skills && input.skills.length > 0) {
      const skillEntries = input.skills.map(skillId => ({
        executor_user_id: input.user_id,
        executor_skill_id: skillId,
      }));

      const { error: skillsError } = await supabase
        .from('executor_user_skills')
        .insert(skillEntries);

      if (skillsError) {
        console.error('Error creating executor skill assignments:', skillsError);
        // Don't throw - executor profile is already created
      }
    }

    return data as ExecutorProfileWithUser;
  },

  async updateExecutor(id: string, updates: Partial<ExecutorProfile> & { skills?: string[] }) {
    const { skills, ...profileUpdates } = updates;
    
    // Update executor profile
    const { data, error } = await supabase
      .from('executor_profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        ),
        category:categories!executor_profiles_category_id_fkey(
          id,
          name,
          description,
          icon,
          color,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error updating executor:', error);
      throw error;
    }

    // Update executor skill assignments if provided
    // Note: executor_skills is the master table
    // We use junction table (executor_user_skills) to link executors to skills
    if (skills !== undefined && data) {
      const userId = (data as any).user_id || (data as any).user?.id;
      if (userId) {
        // Delete existing skill assignments from junction table
        const { error: deleteError } = await supabase
          .from('executor_user_skills')
          .delete()
          .eq('executor_user_id', userId);

        if (deleteError) {
          console.warn('Error deleting existing skill assignments:', deleteError);
        }

        // Insert new skill assignments into junction table
        if (skills.length > 0) {
          const skillEntries = skills.map(skillId => ({
            executor_user_id: userId,
            executor_skill_id: skillId,
          }));

          const { error: skillsError } = await supabase
            .from('executor_user_skills')
            .insert(skillEntries);

          if (skillsError) {
            console.error('Error updating executor skills:', skillsError);
          }
        }
      }
    }

    return data as ExecutorProfileWithUser;
  },

  async deleteExecutor(id: string) {
    // First, get the executor to retrieve the user_id
    const executor = await this.getExecutorById(id);
    
    if (!executor) {
      throw new Error('Executor not found');
    }

    const userId = executor.user_id || executor.user?.id;
    
    if (!userId) {
      throw new Error('User ID not found for executor');
    }

    // Delete from executor_profiles first (to avoid foreign key constraint issues)
    const { error: profileError } = await supabase
      .from('executor_profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Error deleting executor profile:', profileError);
      throw profileError;
    }

    // Delete from users table
    try {
      await usersService.deleteUser(userId);
    } catch (userError) {
      console.error('Error deleting user:', userError);
      // If user deletion fails, we should fail the entire operation
      // to maintain data consistency. The executor profile deletion will be rolled back
      // if we're in a transaction, otherwise we need to handle this manually.
      throw new Error(`Failed to delete user: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
    }

    // Note: Supabase Auth user deletion requires admin API access
    // This would need to be done via a server-side function or Edge Function
    // with admin privileges. The auth user will remain but won't be able to log in
    // since the user record in the users table is deleted.
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
      .select(`
        *,
        user:users!executor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          phone,
          emp_code,
          department,
          manager_id,
          tenant_id,
          is_active,
          telegram_user_id,
          telegram_chat_id,
          created_at
        )
      `)
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

  // Get skills assigned to an executor
  // Note: executor_skills is the master table with tenant_id, category, and skill name
  // We query the junction table (executor_user_skills) to get assigned skills
  async getExecutorSkills(executorUserId: string): Promise<any[]> {
    try {
      // Query junction table to get skill IDs assigned to this executor
      const { data: junctionData, error: junctionError } = await supabase
        .from('executor_user_skills')
        .select('executor_skill_id')
        .eq('executor_user_id', executorUserId);

      if (junctionError) {
        // If junction table doesn't exist, return empty array
        console.warn('Junction table executor_user_skills may not exist. Error:', junctionError);
        return [];
      }

      if (!junctionData || junctionData.length === 0) {
        return [];
      }

      // Get the actual skill details from executor_skill master table
      const skillIds = junctionData.map((item: any) => item.executor_skill_id);
      const { data: skillsData, error: skillsError } = await supabase
        .from('executor_skill')
        .select('*')
        .in('id', skillIds);

      if (skillsError) {
        console.error('Error fetching executor skills:', skillsError);
        return [];
      }

      return skillsData || [];
    } catch (err) {
      console.error('Error in getExecutorSkills:', err);
      return [];
    }
  },
};
