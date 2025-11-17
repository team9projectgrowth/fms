import { supabase } from '../lib/supabase';
import type { User, UserType, CreateUserInput } from '../types/database';

export const usersService = {
  async getUsers(userType?: UserType, tenantId?: string | null) {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (userType) {
      // Database uses 'role' column, map userType to role
      const roleMap: Record<UserType, string> = {
        'admin': 'admin',
        'executor': 'executor',
        'complainant': 'complainant',
        'tenant_admin': 'tenant_admin',
      };
      query = query.eq('role', roleMap[userType]);
    }

    // Filter by tenant if provided
    if (tenantId !== undefined) {
      if (tenantId === null) {
        // Super admin - show users with null tenant_id
        query = query.is('tenant_id', null);
      } else {
        // Filter by specific tenant
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // For tenant admins, automatically filter by their tenant
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
          query = query.eq('tenant_id', currentUser.tenant_id);
        }
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Map database columns to TypeScript interface
    return (data || []).map((user: any) => ({
      ...user,
      name: user.full_name,
      user_type: user.role,
      employee_id: user.emp_code,
      designation_id: user.designation_id,
      active: user.is_active,
      telegram_chat_id: user.telegram_chat_id,
      telegram_user_id: user.telegram_user_id,
      bot_onboarding_status: user.bot_onboarding_status,
      bot_onboarding_started_at: user.bot_onboarding_started_at,
      bot_onboarding_completed_at: user.bot_onboarding_completed_at,
      bot_onboarding_error: user.bot_onboarding_error,
      bot_onboarding_retry_count: user.bot_onboarding_retry_count,
      bot_deep_link: user.bot_deep_link,
      bot_correlation_id: user.bot_correlation_id,
    })) as User[];
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    // Map database columns to TypeScript interface
    const user = data as any;
    return {
      ...user,
      name: user.full_name,
      user_type: user.role,
      employee_id: user.emp_code,
      designation_id: user.designation_id,
      active: user.is_active,
      telegram_chat_id: user.telegram_chat_id,
      telegram_user_id: user.telegram_user_id,
      bot_onboarding_status: user.bot_onboarding_status,
      bot_onboarding_started_at: user.bot_onboarding_started_at,
      bot_onboarding_completed_at: user.bot_onboarding_completed_at,
      bot_onboarding_error: user.bot_onboarding_error,
      bot_onboarding_retry_count: user.bot_onboarding_retry_count,
      bot_deep_link: user.bot_deep_link,
      bot_correlation_id: user.bot_correlation_id,
    } as User;
  },

  async createUser(input: CreateUserInput) {
    const { data, error } = await supabase.functions.invoke<{
      status: string;
      user?: any;
      error?: string;
    }>('tenant-create-user', {
      body: input,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create user.');
    }

    if (!data?.user) {
      throw new Error(data?.error || 'User creation failed.');
    }

    const user = data.user;

    return {
      ...user,
      name: user.full_name,
      user_type: user.role,
      employee_id: user.emp_code,
      designation_id: user.designation_id,
      active: user.is_active,
      telegram_chat_id: user.telegram_chat_id,
      telegram_user_id: user.telegram_user_id,
    } as User;
  },

  async updateUser(id: string, updates: Partial<User>) {
    // Map TypeScript User interface to database schema
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.user_type) dbUpdates.role = updates.user_type;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.department !== undefined) dbUpdates.department = updates.department || null;
    // Convert empty string emp_code to NULL to avoid unique constraint violations
    if (updates.employee_id !== undefined) {
      dbUpdates.emp_code = updates.employee_id && updates.employee_id.trim() !== '' 
        ? updates.employee_id.trim() 
        : null;
    }
    if (updates.tenant_id !== undefined) dbUpdates.tenant_id = updates.tenant_id;
    if ((updates as any).designation_id !== undefined) {
      dbUpdates.designation_id = (updates as any).designation_id && (updates as any).designation_id.trim() !== '' 
        ? (updates as any).designation_id 
        : null;
    }
    if (updates.active !== undefined) dbUpdates.is_active = updates.active;
    if ((updates as any).telegram_chat_id !== undefined) {
      const chatId = (updates as any).telegram_chat_id;
      dbUpdates.telegram_chat_id = chatId && (typeof chatId === 'string' ? chatId.trim() !== '' : chatId !== null)
        ? (typeof chatId === 'string' ? parseFloat(chatId) || null : chatId)
        : null;
    }
    if ((updates as any).telegram_user_id !== undefined) {
      dbUpdates.telegram_user_id = (updates as any).telegram_user_id && (updates as any).telegram_user_id.trim() !== '' 
        ? (updates as any).telegram_user_id 
        : null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Map back to TypeScript interface
    const user = data as any;
    return {
      ...user,
      name: user.full_name,
      user_type: user.role,
      employee_id: user.emp_code,
      active: user.is_active,
      telegram_chat_id: user.telegram_chat_id,
      telegram_user_id: user.telegram_user_id,
    } as User;
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, active: boolean) {
    return this.updateUser(id, { active });
  },
};
