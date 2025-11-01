import { supabase } from '../lib/supabase';
import type { User, UserType, CreateUserInput } from '../types/database';

export const usersService = {
  async getUsers(userType?: UserType) {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (userType) {
      query = query.eq('user_type', userType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as User[];
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as User | null;
  },

  async createUser(input: CreateUserInput) {
    const { email, password, ...userData } = input;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        ...userData,
      })
      .select()
      .single();

    if (userError) throw userError;
    return user as User;
  },

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
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
