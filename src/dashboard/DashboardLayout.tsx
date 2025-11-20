import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: 'admin' | 'executor' | 'complainant' | 'tenant_admin';
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export default function DashboardLayout({ children, userRole, onNavigate, onLogout }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar userRole={userRole} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader onLogout={onLogout} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
