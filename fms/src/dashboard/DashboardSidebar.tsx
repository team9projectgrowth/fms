import { LayoutDashboard, Ticket, Users, Settings, FileText, ClipboardList, Building, Shield, UserCog } from 'lucide-react';

interface DashboardSidebarProps {
  userRole: 'admin' | 'executor' | 'complainant' | 'tenant_admin';
  onNavigate: (page: string) => void;
}

export default function DashboardSidebar({ userRole, onNavigate }: DashboardSidebarProps) {
  const adminMenu = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'super-admin-tenants', label: 'Tenant Management', icon: Shield },
    { id: 'admin-tickets', label: 'All Tickets', icon: Ticket },
    { id: 'complainants', label: 'Complainants', icon: Users },
    { id: 'executors', label: 'Executors', icon: Building },
    { id: 'config-categories', label: 'Categories', icon: FileText, isConfig: true },
    { id: 'config-executor-skills', label: 'Skills', icon: UserCog, isConfig: true },
    { id: 'config-allocation', label: 'Allocation Rules', icon: ClipboardList, isConfig: true },
    { id: 'config-sla', label: 'SLA Settings', icon: Settings, isConfig: true },
    { id: 'config-priority', label: 'Priority Levels', icon: Settings, isConfig: true },
    { id: 'config-hours', label: 'Business Hours', icon: Settings, isConfig: true },
  ];

  const tenantAdminMenu = [
    { id: 'tenant-admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenant-management', label: 'Tenant Settings', icon: Building },
    { id: 'admin-tickets', label: 'All Tickets', icon: Ticket },
    { id: 'complainants', label: 'Complainants', icon: Users },
    { id: 'executors', label: 'Executors', icon: Users },
    { id: 'config-categories', label: 'Categories', icon: FileText },
    { id: 'config-executor-skills', label: 'Skills', icon: UserCog },
    { id: 'config-priority', label: 'Priority Levels', icon: Settings },
    { id: 'config-allocation', label: 'Allocation Rules', icon: ClipboardList },
    { id: 'config-sla', label: 'SLA Settings', icon: Settings },
    { id: 'config-hours', label: 'Business Hours', icon: Settings },
  ];

  const executorMenu = [
    { id: 'executor-dashboard', label: 'Assigned Tickets', icon: Ticket },
  ];

  const menu = userRole === 'admin' 
    ? adminMenu 
    : userRole === 'tenant_admin' 
    ? tenantAdminMenu 
    : executorMenu;
  
  const defaultPage = userRole === 'admin' 
    ? 'admin-dashboard' 
    : userRole === 'tenant_admin' 
    ? 'tenant-admin-dashboard' 
    : 'executor-dashboard';
  
  const currentPage = window.location.hash.slice(1) || defaultPage;

  return (
    <div className="w-60 bg-white border-r border-gray-300 flex flex-col">
      <div className="p-6 border-b border-gray-300">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Building className="text-white" size={24} />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">FMS</h1>
            <p className="text-xs text-gray-500">Facility Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={20} className="mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-300">
        <div className="text-xs text-gray-500">
          {userRole === 'admin' 
            ? 'Admin Account' 
            : userRole === 'tenant_admin' 
            ? 'Tenant Admin Account' 
            : 'Executor Account'}
        </div>
      </div>
    </div>
  );
}
