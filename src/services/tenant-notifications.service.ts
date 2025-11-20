import { supabase } from '../lib/supabase';
import { authService } from './auth.service';
import type { TenantNotification } from '../types/database';

const NOTIFICATION_FIELDS = `
  id,
  tenant_id,
  user_id,
  triggered_by,
  type,
  title,
  message,
  level,
  status,
  metadata,
  created_at,
  read_at
`;

export const tenantNotificationsService = {
  async list(limit = 20, tenantId?: string | null, tenantAdminId?: string | null): Promise<TenantNotification[]> {
    const currentUser = await authService.getCurrentUser();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('tenant_notifications')
      .select(NOTIFICATION_FIELDS)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Determine tenant scope
    const effectiveTenantId = tenantId ?? currentUser.tenant_id ?? null;

    if (effectiveTenantId) {
      query = query.eq('tenant_id', effectiveTenantId);
    } else if (currentUser.role !== 'admin') {
      // Non-admin users must have a tenant
      return [];
    }

    // Only scope by user_id when explicitly requested (e.g., admin targeting a tenant admin)
    if (tenantAdminId) {
      query = query.eq('user_id', tenantAdminId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to load notifications');
    }

    return (data || []) as TenantNotification[];
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  },

  async markAllAsRead(notificationIds: string[]): Promise<void> {
    if (!notificationIds.length) return;

    const { error } = await supabase
      .from('tenant_notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .in('id', notificationIds);

    if (error) {
      throw new Error(error.message || 'Failed to mark notifications as read');
    }
  },
};

