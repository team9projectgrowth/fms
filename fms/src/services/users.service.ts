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
            throw new Error('Failed to verify user permissions. Please try again.');
          }
          
          // If current user is tenant_admin, use their tenant_id for new users
          if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
            tenantId = currentUser.tenant_id;
            console.log('Setting tenant_id for new user:', tenantId);
          } else if (currentUser?.role === 'tenant_admin' && !currentUser.tenant_id) {
            throw new Error('Tenant admin has no tenant assigned. Please contact support.');
          } else if (currentUser?.role === 'admin' && currentUser.tenant_id === null) {
            // Super admin can create users without tenant_id (for admin users)
            // But executors and complainants require tenant_id
            if (user_type === 'executor' || user_type === 'complainant') {
              throw new Error('Tenant ID is required for executors and complainants. Please select a tenant.');
            }
            tenantId = null; // Super admin creating admin user
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Tenant ID is required')) {
            throw err;
          }
          console.error('Error getting tenant_id for new user:', err);
          throw new Error('Failed to determine tenant. Please try again.');
        }
      }
    }
    
    // REQUIRE tenant_id for executors and complainants (unless super admin explicitly sets it to null)
    if ((user_type === 'executor' || user_type === 'complainant') && !tenantId) {
      throw new Error(`Tenant ID is required for ${user_type} users. Please ensure you are logged in as a tenant admin or select a tenant.`);
    }
    
    // Super admin users can have null tenant_id, but others should have it
    if (!tenantId && user_type !== 'admin') {
      throw new Error('Tenant ID is required for this user type. Please contact support if you are a tenant admin.');
    }

    // Check if user already exists in users table for this tenant
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error('Error checking for existing user:', checkError);
      throw new Error('Failed to check for existing user. Please try again.');
    }

    if (existingUser) {
      throw new Error('A user with this email already exists in this tenant.');
    }

    // Check if email exists in users table for any tenant (to detect cross-tenant conflicts)
    const { data: crossTenantUser } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', email)
      .maybeSingle();

    if (crossTenantUser && crossTenantUser.tenant_id !== tenantId) {
      throw new Error(`This email is already registered with a different tenant. Please use a different email or contact support.`);
    }

    // Try to sign up the user in Supabase Auth
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

    // Handle "User already registered" error from Supabase Auth
    if (authError) {
      if (authError.message?.includes('already registered') || authError.message?.includes('User already registered')) {
        // Check if there's an orphaned auth user (exists in auth but not in users table)
        // This requires admin API access, so we'll provide a helpful error message
        throw new Error(
          `This email is already registered in Supabase Auth. ` +
          `If this is the first user for this tenant, the email may have been used previously. ` +
          `Please use a different email, or contact support to clean up the orphaned auth user.`
        );
      }
      throw authError;
    }

    if (!authData?.user) {
      throw new Error('User creation failed');
    }

    // Map user_type to role and handle column name differences
    // Convert empty string emp_code to NULL to avoid unique constraint violations
    const empCode = userData.employee_id && userData.employee_id.trim() !== '' 
      ? userData.employee_id.trim() 
      : null;

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: input.name,
        role: user_type, // Database uses 'role' column
        phone: userData.phone || null,
        department: userData.department || null,
        emp_code: empCode, // Use NULL instead of empty string
        designation_id: (userData as any).designation_id && (userData as any).designation_id.trim() !== '' 
          ? (userData as any).designation_id 
          : null,
        tenant_id: tenantId,
        is_active: userData.active !== false,
        telegram_chat_id: (userData as any).telegram_chat_id && (userData as any).telegram_chat_id.trim() !== '' 
          ? parseFloat((userData as any).telegram_chat_id) || null 
          : null,
        telegram_user_id: (userData as any).telegram_user_id && (userData as any).telegram_user_id.trim() !== '' 
          ? (userData as any).telegram_user_id 
          : null,
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
      
      // Provide user-friendly error messages
      if (userError.code === '23505') { // Unique constraint violation
        if (userError.message?.includes('users_tenant_id_emp_code_key')) {
          throw new Error('An employee code already exists for this tenant. Please use a unique employee code or leave it empty.');
        } else if (userError.message?.includes('users_tenant_id_email_key')) {
          throw new Error('A user with this email already exists in this tenant.');
        } else {
          throw new Error('A user with this information already exists. Please check email and employee code.');
        }
      }
      
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
