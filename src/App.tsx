import { useState, useEffect } from 'react';
import { useTenant } from './hooks/useTenant';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProductsPage from './pages/ProductsPage';
import TeamPage from './pages/TeamPage';
import FAQPage from './pages/FAQPage';
import TestimonialsPage from './pages/TestimonialsPage';
import SupportPage from './pages/SupportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TenantRegistrationPage from './pages/TenantRegistrationPage';
import DashboardLoginPage from './pages/DashboardLoginPage';
import SetupAdminPage from './pages/SetupAdminPage';
import DashboardLayout from './dashboard/DashboardLayout';
import ExecutorDashboard from './dashboard/screens/ExecutorDashboard';
import ExecutorTicketDetail from './dashboard/screens/ExecutorTicketDetail';
import AdminDashboard from './dashboard/screens/AdminDashboard';
import AdminAllTickets from './dashboard/screens/AdminAllTickets';
import UserManagementComplainants from './dashboard/screens/UserManagementComplainants';
import UserManagementExecutors from './dashboard/screens/UserManagementExecutors';
import CreateEditExecutorForm from './dashboard/screens/CreateEditExecutorForm';
import CreateEditComplainantForm from './dashboard/screens/CreateEditComplainantForm';
import ConfigCategories from './dashboard/screens/ConfigCategories';
import ConfigDesignations from './dashboard/screens/ConfigDesignations';
import ConfigExecutorSkills from './dashboard/screens/ConfigExecutorSkills';
import ConfigAllocationRules from './dashboard/screens/ConfigAllocationRules';
import ConfigSLASettings from './dashboard/screens/ConfigSLASettings';
import ConfigPriorityLevels from './dashboard/screens/ConfigPriorityLevels';
import ConfigBusinessHours from './dashboard/screens/ConfigBusinessHours';
import TenantAdminDashboard from './dashboard/screens/TenantAdminDashboard';
import TenantTicketDashboard from './dashboard/screens/TenantTicketDashboard';
import TenantManagement from './dashboard/screens/TenantManagement';
import SuperAdminTenantManagement from './dashboard/screens/SuperAdminTenantManagement';
import ChangePassword from './dashboard/screens/ChangePassword';

function App() {
  const { setActiveTenantId } = useTenant();
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'executor' | 'tenant_admin' | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showExecutorForm, setShowExecutorForm] = useState(false);
  const [showComplainantForm, setShowComplainantForm] = useState(false);
  const [editExecutorId, setEditExecutorId] = useState<string | null>(null);
  const [editComplainantId, setEditComplainantId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize page from URL hash on mount and handle hash changes
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setCurrentPage(hash);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash) {
        setCurrentPage(newHash);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: string, param?: string) => {
    if (page === 'executor-ticket') {
      setSelectedTicketId(param || null);
    }
    if (page === 'create-executor') {
      setShowExecutorForm(true);
      setEditExecutorId(null);
      return;
    }
    if (page === 'edit-executor') {
      setShowExecutorForm(true);
      setEditExecutorId(param || null);
      return;
    }
    if (page === 'create-complainant') {
      setShowComplainantForm(true);
      setEditComplainantId(null);
      return;
    }
    if (page === 'edit-complainant') {
      setShowComplainantForm(true);
      setEditComplainantId(param || null);
      return;
    }
    // Legacy support for old routes
    if (page === 'create-user') {
      if (param === 'executor') {
        setShowExecutorForm(true);
        setEditExecutorId(null);
      } else {
        setShowComplainantForm(true);
        setEditComplainantId(null);
      }
      return;
    }
    if (page === 'edit-user') {
      // We need to determine if it's an executor or complainant
      // For now, we'll default to complainant, but this should be handled better
      setShowComplainantForm(true);
      setEditComplainantId(param || null);
      return;
    }
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async (role: 'admin' | 'executor' | 'tenant_admin') => {
    setIsAuthenticated(true);
    setUserRole(role);
    
    // Get current user's tenant_id and set it in context
    if (role === 'tenant_admin' || role === 'executor') {
      try {
        const { authService } = await import('./services/auth.service');
        const currentUser = await authService.getCurrentUser();
        if (currentUser?.tenant_id) {
          setActiveTenantId(currentUser.tenant_id);
          console.log('Set activeTenantId:', currentUser.tenant_id);
        }
      } catch (err) {
        console.error('Error getting tenant_id on login:', err);
      }
    } else {
      // Super admin - no tenant_id
      setActiveTenantId(null);
    }
    
    if (role === 'admin') {
      setCurrentPage('admin-dashboard');
      window.location.hash = 'admin-dashboard';
    } else if (role === 'executor') {
      setCurrentPage('executor-dashboard');
      window.location.hash = 'executor-dashboard';
    } else if (role === 'tenant_admin') {
      setCurrentPage('tenant-admin-dashboard');
      window.location.hash = 'tenant-admin-dashboard';
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setActiveTenantId(null);
    setCurrentPage('home');
    window.location.hash = '';
  };

  const renderMarketingPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'about':
        return <AboutPage />;
      case 'products':
        return <ProductsPage onNavigate={handleNavigate} />;
      case 'team':
        return <TeamPage />;
      case 'faq':
        return <FAQPage onNavigate={handleNavigate} />;
      case 'testimonials':
        return <TestimonialsPage onNavigate={handleNavigate} />;
      case 'support':
        return <SupportPage />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'tenant-register':
        return <TenantRegistrationPage onNavigate={handleNavigate} />;
      case 'setup-admin':
        return <SetupAdminPage />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  const renderDashboardContent = () => {
    if (!userRole) return null;

    switch (currentPage) {
      case 'executor-dashboard':
        return <ExecutorDashboard onNavigate={handleNavigate} />;
      case 'executor-ticket':
        return <ExecutorTicketDetail ticketId={selectedTicketId || ''} onNavigate={handleNavigate} />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-tickets':
        return <AdminAllTickets onNavigate={handleNavigate} />;
      case 'complainants':
        return <UserManagementComplainants key={refreshTrigger} onNavigate={handleNavigate} />;
      case 'executors':
        return <UserManagementExecutors key={refreshTrigger} onNavigate={handleNavigate} />;
      case 'config-categories':
        return <ConfigCategories />;
      case 'config-designations':
        return <ConfigDesignations />;
      case 'config-executor-skills':
        return <ConfigExecutorSkills />;
      case 'config-allocation':
        return <ConfigAllocationRules />;
      case 'config-sla':
        return <ConfigSLASettings />;
      case 'config-priority':
        return <ConfigPriorityLevels />;
      case 'config-hours':
        return <ConfigBusinessHours />;
      case 'tenant-admin-dashboard':
        return <TenantAdminDashboard onNavigate={handleNavigate} />;
      case 'tenant-ticket-dashboard':
        return <TenantTicketDashboard />;
      case 'tenant-management':
        return <TenantManagement onNavigate={handleNavigate} />;
      case 'super-admin-tenants':
        return <SuperAdminTenantManagement onNavigate={handleNavigate} />;
      case 'change-password':
        return <ChangePassword onNavigate={handleNavigate} />;
      default:
        if (userRole === 'admin') {
          return <AdminDashboard />;
        } else if (userRole === 'executor') {
          return <ExecutorDashboard onNavigate={handleNavigate} />;
        } else if (userRole === 'tenant_admin') {
          return <TenantAdminDashboard onNavigate={handleNavigate} />;
        }
        return null;
    }
  };

  if (currentPage === 'setup') {
    return <SetupAdminPage />;
  }

  if (currentPage === 'login') {
    return <DashboardLoginPage onLogin={handleLogin} />;
  }

  if (!isAuthenticated) {
    const showNavAndFooter = currentPage !== 'register' && currentPage !== 'tenant-register';
    return (
      <div className="min-h-screen flex flex-col">
        {showNavAndFooter && (
          <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
        )}
        <main className="flex-grow">
          {renderMarketingPage()}
        </main>
        {showNavAndFooter && (
          <Footer onNavigate={handleNavigate} />
        )}
      </div>
    );
  }

  return (
    <>
      <DashboardLayout userRole={userRole!} onNavigate={handleNavigate} onLogout={handleLogout}>
        {renderDashboardContent()}
      </DashboardLayout>
      {showExecutorForm && (
        <CreateEditExecutorForm
          executorId={editExecutorId || undefined}
          onClose={() => {
            setShowExecutorForm(false);
            setEditExecutorId(null);
          }}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
      {showComplainantForm && (
        <CreateEditComplainantForm
          complainantId={editComplainantId || undefined}
          onClose={() => {
            setShowComplainantForm(false);
            setEditComplainantId(null);
          }}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </>
  );
}

export default App;
