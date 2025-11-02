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

    const role = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
    const name = authData.user.user_metadata?.name || authData.user.email?.split('@')[0];

    if (!role || (role !== 'admin' && role !== 'executor')) {
      await supabase.auth.signOut();
      throw new Error('Invalid user role. Only admin and executor accounts can sign in.');
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      role: role as 'admin' | 'executor',
      name: name || 'User'
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

    const role = user.user_metadata?.role || user.app_metadata?.role;
    const name = user.user_metadata?.name || user.email?.split('@')[0];

    if (!role || (role !== 'admin' && role !== 'executor')) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: role as 'admin' | 'executor',
      name: name || 'User'
    };
  },

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
