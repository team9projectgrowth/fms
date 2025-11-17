import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = authService.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { user: userData } = await authService.signIn(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signOut();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin',
    isExecutor: user?.user_type === 'executor',
    isComplainant: user?.user_type === 'complainant',
  };
}
