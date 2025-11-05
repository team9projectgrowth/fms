import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'executor';
  name: string;
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
      .select('user_type, name')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userError || !userData) {
      await supabase.auth.signOut();
      throw new Error('User profile not found');
    }

    if (userData.user_type !== 'admin' && userData.user_type !== 'executor') {
      await supabase.auth.signOut();
      throw new Error('Invalid user role. Only admin and executor accounts can sign in.');
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      role: userData.user_type as 'admin' | 'executor',
      name: userData.name || 'User'
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_type, name')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return null;
    }

    if (userData.user_type !== 'admin' && userData.user_type !== 'executor') {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: userData.user_type as 'admin' | 'executor',
      name: userData.name || 'User'
    };
  },

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
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
        name: metadata?.name || email.split('@')[0],
        user_type: metadata?.user_type || 'complainant',
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
