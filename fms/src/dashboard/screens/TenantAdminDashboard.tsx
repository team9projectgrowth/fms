import { Ticket, Users, Building, TrendingUp, Activity, UserCheck, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tenantsService } from '../../services/tenants.service';
import { ticketsService } from '../../services/tickets.service';
import { usersService } from '../../services/users.service';
import { executorsService } from '../../services/executors.service';
import { authService } from '../../services/auth.service';
import type { Tenant, User, ExecutorWithProfile } from '../../types/database';

interface TenantAdminDashboardProps {
  onNavigate: (page: string) => void;
}

export default function TenantAdminDashboard({ onNavigate }: TenantAdminDashboardProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    totalComplainants: 0,
    totalExecutors: 0,
  });
  const [complainants, setComplainants] = useState<User[]>([]);
  const [executors, setExecutors] = useState<ExecutorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!currentUser.tenant_id) {
        throw new Error('Tenant ID not found in user profile. Please contact your administrator.');
      }

      // Load tenant info
      const tenantData = await tenantsService.getTenantById(currentUser.tenant_id);
      if (!tenantData) {
        throw new Error(`Tenant not found for ID: ${currentUser.tenant_id}. This may be an RLS policy issue or the tenant may not exist.`);
      }
      setTenant(tenantData);

      // Load statistics (tenant-scoped)
      let tenantTickets: any[] = [];
      let tenantUsers: any[] = [];
      
      try {
        const ticketsResult = await ticketsService.getTickets(undefined, 1, 1000);
        tenantTickets = ticketsResult.tickets.filter(t => t.tenant_id === currentUser.tenant_id);
      } catch (ticketError: any) {
        console.warn('Failed to load tickets for dashboard:', ticketError);
        // Continue without ticket stats - this is not critical for dashboard display
      }
      
      // Load complainants (users with role='complainant')
      let tenantComplainants: User[] = [];
      try {
        const users = await usersService.getUsers();
        tenantComplainants = users.filter(
          u => u.tenant_id === currentUser.tenant_id && u.role === 'complainant'
        );
        setComplainants(tenantComplainants);
      } catch (userError: any) {
        console.warn('Failed to load complainants for dashboard:', userError);
      }

      // Load executors
      let tenantExecutors: ExecutorWithProfile[] = [];
      try {
        const executorsData = await executorsService.getExecutors();
        tenantExecutors = executorsData; // Already filtered by tenant through executor_profiles
        setExecutors(tenantExecutors);
      } catch (executorError: any) {
        console.warn('Failed to load executors for dashboard:', executorError);
      }

      setStats({
        totalTickets: tenantTickets.length,
        openTickets: tenantTickets.filter(t => t.status === 'open').length,
        inProgressTickets: tenantTickets.filter(t => t.status === 'in-progress').length,
        resolvedTickets: tenantTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        totalComplainants: tenantComplainants.length,
        totalExecutors: tenantExecutors.length,
      });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      // Set error state so it can be displayed
      setError(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const metrics = [
    { 
      label: 'Total Tickets', 
      value: stats.totalTickets.toString(), 
      icon: Ticket, 
      color: 'bg-primary',
      onClick: () => onNavigate('admin-tickets')
    },
    { 
      label: 'Open', 
      value: stats.openTickets.toString(), 
      icon: Activity, 
      color: 'bg-info',
      onClick: () => onNavigate('admin-tickets')
    },
    { 
      label: 'In Progress', 
      value: stats.inProgressTickets.toString(), 
      icon: Activity, 
      color: 'bg-warning',
      onClick: () => onNavigate('admin-tickets')
    },
    { 
      label: 'Resolved', 
      value: stats.resolvedTickets.toString(), 
      icon: TrendingUp, 
      color: 'bg-success',
      onClick: () => onNavigate('admin-tickets')
    },
    { 
      label: 'Total Users', 
      value: (stats.totalComplainants + stats.totalExecutors).toString(), 
      icon: Users, 
      color: 'bg-purple-500',
      onClick: () => onNavigate('complainants')
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Dashboard</h1>
          {tenant && (
            <p className="text-gray-600 mt-1">{tenant.name}</p>
          )}
        </div>
        <button
          onClick={() => onNavigate('tenant-management')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Manage Tenant
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {tenant && (
        <div className="bg-white rounded-card shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Subscription Status</p>
              <p className={`text-sm font-medium mt-1 ${
                tenant.subscription_status === 'active' ? 'text-green-600' :
                tenant.subscription_status === 'trial' ? 'text-blue-600' :
                'text-red-600'
              }`}>
                {tenant.subscription_status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max Users</p>
              <p className="text-sm font-medium mt-1">{tenant.max_users}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm font-medium mt-1">{tenant.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-sm font-medium mt-1">{tenant.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <button
              key={index}
              onClick={metric.onClick}
              className="bg-white rounded-card shadow-sm p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${metric.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.label}</div>
            </button>
          );
        })}
      </div>

      {/* User Management Sections */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Complainants Section */}
        <div className="bg-white rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center mr-3">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Complainants</h2>
                <p className="text-sm text-gray-500">Users who create tickets</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{stats.totalComplainants}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {complainants.slice(0, 5).map((complainant) => (
              <div key={complainant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                    {complainant.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{complainant.full_name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{complainant.email}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  complainant.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {complainant.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
            {complainants.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">No complainants found</div>
            )}
          </div>

          <button
            onClick={() => onNavigate('complainants')}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            View All Complainants ({stats.totalComplainants})
          </button>
        </div>

        {/* Executors Section */}
        <div className="bg-white rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center mr-3">
                <UserCog className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Executors</h2>
                <p className="text-sm text-gray-500">Users who handle tickets</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{stats.totalExecutors}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {executors.slice(0, 5).map((executor) => (
              <div key={executor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                    {executor.user.name?.charAt(0).toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{executor.user.name}</div>
                    <div className="text-xs text-gray-500">{executor.user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    executor.availability === 'available' ? 'bg-green-500' :
                    executor.availability === 'busy' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-xs text-gray-600 capitalize">{executor.availability}</span>
                </div>
              </div>
            ))}
            {executors.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">No executors found</div>
            )}
          </div>

          <button
            onClick={() => onNavigate('executors')}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            View All Executors ({stats.totalExecutors})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('tenant-management')}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors"
            >
              <Building className="inline-block mr-2" size={20} />
              Manage Tenant Settings
            </button>
            <button
              onClick={() => onNavigate('admin-tickets')}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors"
            >
              <Ticket className="inline-block mr-2" size={20} />
              View All Tickets
            </button>
          </div>
        </div>

        <div className="bg-white rounded-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Status</h2>
          {tenant && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Active</span>
                <span className={`font-medium ${tenant.active ? 'text-green-600' : 'text-red-600'}`}>
                  {tenant.active ? 'Yes' : 'No'}
                </span>
              </div>
              {tenant.subscription_start_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Subscription Start</span>
                  <span className="font-medium">{new Date(tenant.subscription_start_date).toLocaleDateString()}</span>
                </div>
              )}
              {tenant.subscription_end_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Subscription End</span>
                  <span className="font-medium">{new Date(tenant.subscription_end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

