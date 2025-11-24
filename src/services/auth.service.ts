import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'executor' | 'tenant_admin';
  name: string;
  tenant_id?: string;
}

export const authService = {
  async signIn(email: string, password: string): Promise<{ user: AuthUser }> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message || 'Invalid email or password');
    }

    if (!authData.user) {
      throw new Error('Invalid email or password');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name, tenant_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userError || !userData) {
      await supabase.auth.signOut();
      throw new Error('User profile not found');
    }

    if (userData.role !== 'admin' && userData.role !== 'executor' && userData.role !== 'tenant_admin') {
      await supabase.auth.signOut();
      throw new Error('Invalid user role. Only admin, executor, and tenant_admin accounts can sign in.');
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      role: userData.role as 'admin' | 'executor' | 'tenant_admin',
      name: userData.full_name || 'User',
      tenant_id: userData.tenant_id || undefined
    };

    return { user };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error getting current user:', authError);
      return null;
    }

    if (!user) {
      console.warn('No authenticated user found');
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name, tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user data:', {
        userId: user.id,
        error: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code
      });
      return null;
    }

    if (!userData) {
      console.warn('User data not found in users table:', user.id);
      return null;
    }

    if (userData.role !== 'admin' && userData.role !== 'executor' && userData.role !== 'tenant_admin') {
      console.warn('User has invalid role:', {
        userId: user.id,
        role: userData.role
      });
      return null;
    }

    const authUser = {
      id: user.id,
      email: user.email!,
      role: userData.role as 'admin' | 'executor' | 'tenant_admin',
      name: userData.full_name || 'User',
      tenant_id: userData.tenant_id || undefined
    };

    console.log('Current user loaded:', {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      tenant_id: authUser.tenant_id
    });

    return authUser;
  },

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Get current user to get their email
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Verify current password by attempting sign-in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });

    if (verifyError) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password length
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update password');
    }
  },

  async signUp(email: string, password: string, metadata?: { name?: string; user_type?: string }): Promise<{ user: AuthUser }> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata?.name || email.split('@')[0],
          user_type: metadata?.user_type || 'complainant',
        }
      }
    });

    if (authError) {
      throw new Error(authError.message || 'Sign up failed');
    }

    if (!authData.user) {
      throw new Error('Sign up failed');
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: metadata?.name || email.split('@')[0],
        role: metadata?.user_type || 'complainant',
        is_active: true,
      });

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create user profile');
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      role: (metadata?.user_type === 'admin' || metadata?.user_type === 'executor')
        ? metadata.user_type as 'admin' | 'executor'
        : 'admin',
      name: metadata?.name || email.split('@')[0]
    };

    return { user };
  }
};
