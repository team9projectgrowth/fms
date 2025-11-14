import { supabase } from '../lib/supabase';
import type { Tenant, CreateTenantInput, UpdateTenantInput, User } from '../types/database';

export const tenantsService = {
  async getTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Tenant[];
  },

  async getTenantAdminUsers(tenantId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', 'tenant_admin')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as User[];
  },

  async resetTenantAdminPassword(tenantId: string, tenantAdminId: string, newPassword: string) {
    const { data, error } = await supabase.functions.invoke('reset-tenant-admin-password', {
      body: {
        tenantId,
        tenantAdminId,
        newPassword,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to reset tenant admin password');
    }

    return data as { success: boolean };
  },

  async updateTenantAdminUser(tenantAdminId: string, updates: { name?: string; email?: string }) {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', tenantAdminId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as User;
  },

  async getTenantById(id: string) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) {
      console.error('Error fetching tenant by ID:', {
        id,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('Tenant not found or access denied:', {
        id,
        dataLength: data?.length || 0,
        message: 'This could be an RLS policy issue'
      });
      return null;
    }
    
    return data[0] as Tenant;
  },

  async createTenantAdminUser(tenantId: string, email: string, name: string, password: string) {
    // Create auth user using signUp (public API)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'tenant_admin',
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    // Create user record in users table
    const { data: userDataArray, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        role: 'tenant_admin',
        tenant_id: tenantId,
        is_active: true,
      })
      .select()
      .limit(1);

    if (userError) throw userError;
    if (!userDataArray || userDataArray.length === 0) throw new Error('Failed to create user record');
    return userDataArray[0];
  },

  async createTenant(input: CreateTenantInput, adminEmail: string, adminPassword: string, adminName: string) {
    // Create tenant - requires approval by default
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        ...input,
        subscription_status: input.subscription_status || 'trial',
        max_users: input.max_users || 10,
        approved: false, // New tenants require approval
      })
      .select()
      .limit(1);

    if (tenantError) throw tenantError;
    if (!tenantData || tenantData.length === 0) throw new Error('Failed to create tenant');
    const tenant = tenantData[0];

    // Create tenant admin user (but they won't be able to login until approved)
    try {
      await this.createTenantAdminUser(tenant.id, adminEmail, adminName, adminPassword);
    } catch (adminError) {
      // If admin creation fails, we could delete the tenant here
      // For now, we'll just throw the error
      throw adminError;
    }

    return tenant as Tenant;
  },

  async updateTenant(id: string, updates: UpdateTenantInput) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Tenant not found');
    return data[0] as Tenant;
  },

  async deleteTenant(id: string) {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, active: boolean) {
    return this.updateTenant(id, { active });
  },

  async approveTenant(id: string, approvedBy: string) {
    // First update the tenant
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Then fetch the updated tenant separately
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Tenant not found after approval');
    
    return data[0] as Tenant;
  },

  async rejectTenant(id: string) {
    return this.updateTenant(id, { approved: false });
  },
};

