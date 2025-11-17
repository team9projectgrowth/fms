import { supabase } from '../lib/supabase';
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
  async list(limit = 20): Promise<TenantNotification[]> {
    const { data, error } = await supabase
      .from('tenant_notifications')
      .select(NOTIFICATION_FIELDS)
      .order('created_at', { ascending: false })
      .limit(limit);

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

