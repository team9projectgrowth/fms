import { Bell, User, LogOut, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { tenantNotificationsService } from '../services/tenant-notifications.service';
import { tenantsService } from '../services/tenants.service';
import { useTenant } from '../hooks/useTenant';
import type { Tenant, TenantNotification } from '../types/database';

interface DashboardHeaderProps {
  onLogout: () => void;
  userRole: 'admin' | 'executor' | 'complainant' | 'tenant_admin';
}

export default function DashboardHeader({ onLogout, userRole }: DashboardHeaderProps) {
  const { activeTenantId, setActiveTenantId } = useTenant();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const recalculateUnreadCount = useCallback((items: TenantNotification[]) => {
    const count = items.filter((notification) => notification.status === 'unread').length;
    setUnreadCount(count);
    return count;
  }, []);

  const loadTenantOptions = useCallback(async () => {
    if (userRole !== 'admin') return;

    try {
      setLoadingTenants(true);
      setTenantError(null);
      const data = await tenantsService.getTenants();
      setTenantOptions(data);
    } catch (error: any) {
      console.error('Failed to load tenants:', error);
      setTenantError(error?.message || 'Unable to load tenants. Please try again.');
    } finally {
      setLoadingTenants(false);
    }
  }, [userRole]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      setNotificationsError(null);
      const data = await tenantNotificationsService.list(
        20,
        userRole === 'admin' ? activeTenantId : undefined,
        undefined,
      );
      setNotifications(data);
      recalculateUnreadCount(data);
    } catch (error) {
      console.error('Failed to load tenant notifications:', error);
      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Unable to load notifications at this time.',
      );
    } finally {
      setLoadingNotifications(false);
    }
  }, [activeTenantId, userRole, recalculateUnreadCount]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadTenantOptions();
    }
  }, [userRole, loadTenantOptions]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications().catch((err) =>
        console.error('Notification poll failed:', err),
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      await loadNotifications();
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await tenantNotificationsService.markAsRead(notificationId);
      setNotifications((prev) => {
        const updated = prev.map((item) =>
          item.id === notificationId
            ? { ...item, status: 'read', read_at: new Date().toISOString() }
            : item,
        );
        recalculateUnreadCount(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unreadIds = notifications
      .filter((notification) => notification.status === 'unread')
      .map((notification) => notification.id);

    if (!unreadIds.length) return;

    try {
      await tenantNotificationsService.markAllAsRead(unreadIds);
      setNotifications((prev) => {
        const updated = prev.map((item) =>
          unreadIds.includes(item.id)
            ? { ...item, status: 'read', read_at: new Date().toISOString() }
            : item,
        );
        recalculateUnreadCount(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    setExpandedNotificationId((prev) => (prev === notificationId ? null : notificationId));
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification && notification.status !== 'read') {
      await markNotificationAsRead(notificationId);
    }
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return value;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-300 flex items-center justify-between px-8">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-gray-900">Facility Management System</h2>

        {userRole === 'admin' && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Tenant</label>
            <div className="flex items-center space-x-2">
              <select
                value={activeTenantId || ''}
                onChange={(e) => setActiveTenantId(e.target.value || null)}
                disabled={loadingTenants}
                className="min-w-[220px] px-3 py-1.5 border border-gray-300 rounded-card text-sm focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select tenant...</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadTenantOptions}
                disabled={loadingTenants}
                title="Refresh tenant list"
                className="p-2 text-gray-600 hover:text-primary disabled:text-gray-300"
              >
                <RefreshCcw size={16} className={loadingTenants ? 'animate-spin' : ''} />
              </button>
            </div>
            {tenantError && (
              <span className="text-xs text-danger mt-1">{tenantError}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-danger text-white rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 py-3 z-20">
                <div className="px-4 pb-2 flex items-center justify-between border-b border-gray-200">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : 'All caught up'}
                    </p>
                  </div>
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notificationsError && (
                    <div className="px-4 py-3 text-xs text-danger">
                      {notificationsError}
                    </div>
                  )}

                  {loadingNotifications && !notifications.length ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const isExpanded = expandedNotificationId === notification.id;
                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                            notification.status === 'unread' ? 'bg-primary/5' : ''
                          } ${isExpanded ? 'bg-gray-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {notification.type.replace('onboarding.', '').replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {formatTimestamp(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.metadata?.correlation_id && (
                            <p className="text-[10px] text-gray-400 mt-2">
                              Correlation: {notification.metadata.correlation_id}
                            </p>
                          )}
                          {isExpanded && (
                            <div className="mt-2 text-[11px] text-gray-500 space-y-1">
                              {notification.triggered_by && (
                                <div>Triggered By: {notification.triggered_by}</div>
                              )}
                              {notification.read_at && (
                                <div>Read At: {formatTimestamp(notification.read_at)}</div>
                              )}
                              {notification.metadata && (
                                <pre className="mt-1 bg-gray-100 rounded p-2 text-[10px] text-gray-600 overflow-x-auto">
                                  {JSON.stringify(notification.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium">Admin User</span>
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-300 py-2 z-20">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
