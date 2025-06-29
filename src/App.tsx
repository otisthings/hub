import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { AdminPage } from './pages/AdminPage';
import { SupportPage } from './pages/SupportPage';
import { SupportCategoryPage } from './pages/SupportCategoryPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CreateApplicationPage } from './pages/CreateApplicationPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { PendingApplicationPage } from './pages/PendingApplicationPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { ManagementPage } from './pages/ManagementPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { RosterViewPage } from './pages/RosterViewPage';
import { PrivateRoute } from './components/PrivateRoute';

export const App: React.FC = () => {
  useEffect(() => {
    // Set dark mode by default
    document.documentElement.classList.add('dark');
  }, []);

  // Fetch branding settings and update document title
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/settings/branding');
        if (response.ok) {
          const data = await response.json();
          document.title = data.community_name;
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      }
    };

    fetchBranding();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/new" element={<CreateTicketPage />} />
              <Route path="tickets/:id" element={<TicketDetailPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="support/category/:categoryId" element={<SupportCategoryPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/new" element={<CreateApplicationPage />} />
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route path="applications/:id/pending" element={<PendingApplicationPage />} />
              <Route path="my-profile" element={<MyProfilePage />} />
              <Route path="management" element={<ManagementPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="departments/:id/roster" element={<RosterViewPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;