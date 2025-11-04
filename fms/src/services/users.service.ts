import { supabase } from '../lib/supabase';
import type { User, UserType, CreateUserInput } from '../types/database';

export const usersService = {
  async getUsers(userType?: UserType) {
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

    const { data, error } = await query;

    if (error) throw error;
    
    // Map database columns to TypeScript interface
    return (data || []).map((user: any) => ({
      ...user,
      name: user.full_name,
      user_type: user.role,
      employee_id: user.emp_code,
      active: user.is_active,
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
      active: user.is_active,
    } as User;
  },

  async createUser(input: CreateUserInput) {
    const { email, password, user_type, ...userData } = input;

    // For tenant admins, automatically set tenant_id from current user
    let tenantId = (userData as any).tenant_id;
    if (!tenantId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        try {
          const { data: currentUser, error: userFetchError } = await supabase
            .from('users')
            .select('tenant_id, role')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (userFetchError) {
            console.error('Error fetching current user for tenant_id:', userFetchError);
          }
          
          // If current user is tenant_admin, use their tenant_id for new users
          if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
            tenantId = currentUser.tenant_id;
            console.log('Setting tenant_id for new user:', tenantId);
          } else if (currentUser?.role === 'tenant_admin' && !currentUser.tenant_id) {
            console.warn('Tenant admin has no tenant_id set!');
          }
        } catch (err) {
          console.error('Error getting tenant_id for new user:', err);
        }
      }
    }
    
    if (!tenantId && user_type !== 'admin') {
      console.warn('Warning: tenant_id not set for non-admin user:', user_type);
    }

    // Use signUp for public API (works for tenant admins)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: input.name,
          role: user_type,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Map user_type to role and handle column name differences
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: input.name,
        role: user_type, // Database uses 'role' column
        phone: userData.phone,
        department: userData.department,
        emp_code: userData.employee_id,
        tenant_id: tenantId,
        is_active: userData.active !== false,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user in users table:', {
        error: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code,
        userId: authData.user.id,
        tenantId,
        userType: user_type
      });
      throw userError;
    }
    return user as User;
  },

  async updateUser(id: string, updates: Partial<User>) {
    // Map TypeScript User interface to database schema
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.user_type) dbUpdates.role = updates.user_type;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.employee_id !== undefined) dbUpdates.emp_code = updates.employee_id;
    if (updates.tenant_id !== undefined) dbUpdates.tenant_id = updates.tenant_id;
    if (updates.active !== undefined) dbUpdates.is_active = updates.active;

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
