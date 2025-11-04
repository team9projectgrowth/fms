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
import DashboardLoginPage from './pages/DashboardLoginPage';
import SetupAdminPage from './pages/SetupAdminPage';
import DashboardLayout from './dashboard/DashboardLayout';
import ExecutorDashboard from './dashboard/screens/ExecutorDashboard';
import ExecutorTicketDetail from './dashboard/screens/ExecutorTicketDetail';
import AdminDashboard from './dashboard/screens/AdminDashboard';
import AdminAllTickets from './dashboard/screens/AdminAllTickets';
import UserManagementComplainants from './dashboard/screens/UserManagementComplainants';
import UserManagementExecutors from './dashboard/screens/UserManagementExecutors';
import CreateEditUserForm from './dashboard/screens/CreateEditUserForm';
import ConfigCategories from './dashboard/screens/ConfigCategories';
import ConfigAllocationRules from './dashboard/screens/ConfigAllocationRules';
import ConfigSLASettings from './dashboard/screens/ConfigSLASettings';
import ConfigPriorityLevels from './dashboard/screens/ConfigPriorityLevels';
import ConfigBusinessHours from './dashboard/screens/ConfigBusinessHours';

function App() {
  const { setActiveTenantId } = useTenant();
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'tenant_admin' | 'executor' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userFormType, setUserFormType] = useState<string>('complainant');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize page from hash on mount and listen for hash changes
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setCurrentPage(hash);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash) {
        setCurrentPage(newHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: string, param?: string) => {
    if (page === 'executor-ticket') {
      setSelectedTicketId(param || null);
    }
    if (page === 'create-user') {
      setShowUserForm(true);
      setEditUserId(null);
      setUserFormType(param || 'complainant');
      return;
    }
    if (page === 'edit-user') {
      setShowUserForm(true);
      setEditUserId(param || null);
      return;
    }
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (role: 'admin' | 'tenant_admin' | 'executor', isSuperAdmin: boolean = false) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setIsSuperAdmin(isSuperAdmin);
    // tenant id should already be available from authService; we set it elsewhere in DashboardLoginPage
    setCurrentPage(role === 'executor' ? 'executor-dashboard' : 'admin-dashboard');
    window.location.hash = role === 'executor' ? 'executor-dashboard' : 'admin-dashboard';
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setIsSuperAdmin(false);
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
      case 'config-allocation':
        return <ConfigAllocationRules />;
      case 'config-sla':
        return <ConfigSLASettings />;
      case 'config-priority':
        return <ConfigPriorityLevels />;
      case 'config-hours':
        return <ConfigBusinessHours />;
      default:
        return userRole === 'admin' ? <AdminDashboard /> : <ExecutorDashboard onNavigate={handleNavigate} />;
    }
  };

  if (currentPage === 'setup') {
    return <SetupAdminPage />;
  }

  if (currentPage === 'login') {
    return <DashboardLoginPage onLogin={handleLogin} />;
  }

  if (!isAuthenticated) {
    const showNavAndFooter = currentPage !== 'register';
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
      <DashboardLayout userRole={userRole!} isSuperAdmin={isSuperAdmin} onNavigate={handleNavigate} onLogout={handleLogout}>
        {renderDashboardContent()}
      </DashboardLayout>
      {showUserForm && (
        <CreateEditUserForm
          userId={editUserId || undefined}
          userType={userFormType}
          onClose={() => {
            setShowUserForm(false);
            setEditUserId(null);
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
