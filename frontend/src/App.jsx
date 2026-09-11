import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { CustomizationProvider } from './context/CustomizationContext';

// Layout Elements
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BranchManagement from './pages/BranchManagement';
import UserManagement from './pages/UserManagement';
import BrokerManagement from './pages/BrokerManagement';
import PropertySearch from './pages/PropertySearch';
import PropertyDetail from './pages/PropertyDetail';
import PropertyForm from './pages/PropertyForm';
import PropertyApprovalQueue from './pages/PropertyApprovalQueue';
import LeadList from './pages/LeadList';
import Landing from './pages/Landing';
import PropertyDetailPublic from './pages/PropertyDetailPublic';

// Layout wrapper to inject sidebar and navbar on authenticated pages
const AppLayout = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Automatically close mobile sidebar drawer on route navigation
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // If on login, landing page, or public detail view, do not show sidebar or navbar
  const isPublicRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/property-public/');
  if (isPublicRoute || !user) {
    return <div className="animate-fade-in">{children}</div>;
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={closeSidebar}></div>
      )}

      {/* Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Panel Content Wrapper */}
      <div className="main-content-wrapper">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};


const App = () => {
  return (
    <CustomizationProvider>
      <AuthProvider>
        <Router>
        <AppLayout>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Branches Management */}
            <Route 
              path="/branches" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <BranchManagement />
                </ProtectedRoute>
              } 
            />

            {/* Staff Directory */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'assistant_admin', 'branch_admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />

            {/* Broker Management Sub-module */}
            <Route 
              path="/brokers" 
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'assistant_admin', 'branch_admin']}>
                  <BrokerManagement />
                </ProtectedRoute>
              } 
            />

            {/* Properties Searching Catalog */}
            <Route 
              path="/properties" 
              element={
                <ProtectedRoute>
                  <PropertySearch />
                </ProtectedRoute>
              } 
            />

            {/* New Property Creator & Editor */}
            <Route 
              path="/properties/new" 
              element={
                <ProtectedRoute allowedRoles={['branch_admin', 'super_admin']}>
                  <PropertyForm />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/properties/edit/:id" 
              element={
                <ProtectedRoute allowedRoles={['branch_admin', 'super_admin']}>
                  <PropertyForm />
                </ProtectedRoute>
              } 
            />

            {/* Property Detail page */}
            <Route 
              path="/property/:slug" 
              element={
                <ProtectedRoute>
                  <PropertyDetail />
                </ProtectedRoute>
              } 
            />

            {/* Super Admin Review Approvals Queue */}
            <Route 
              path="/approvals" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <PropertyApprovalQueue />
                </ProtectedRoute>
              } 
            />

            {/* Leads referral inbox */}
            <Route 
              path="/leads" 
              element={
                <ProtectedRoute>
                  <LeadList />
                </ProtectedRoute>
              } 
            />

            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/property-public/:slug" element={<PropertyDetailPublic />} />

            {/* Fallbacks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        </Router>
      </AuthProvider>
    </CustomizationProvider>
  );
};

export default App;
