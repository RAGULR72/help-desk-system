import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TranslationProvider } from './context/TranslationContext';
import { ChatProvider } from './chat_system/ChatContext';
import { ToastProvider } from './context/ToastContext';

import ChatPage from './chat_system/ChatPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

import TicketPage from './ticket_system/TicketPage';
import UserDashboard from './ticket_system/UserDashboard';
import AdminDashboard from './ticket_system/AdminDashboard';
import ManagerDashboard from './ticket_system/ManagerDashboard';
import TechnicianDashboard from './ticket_system/TechnicianDashboard';
import SLAMonitoring from './sla_system/SLAMonitoring';
import SLAConfiguration from './sla_system/SLAConfiguration';
import ProfilePage from './pages/ProfilePage';
import ActivityPage from './pages/ActivityPage';
import TicketDetailView from './ticket_system/components/TicketDetailView';
import QRAuthPage from './pages/QRAuthPage';
import Setup2FA from './pages/Setup2FA';
import ExpenseDashboard from './expense_system/ExpenseDashboard';
import ExpenseCreatePage from './expense_system/ExpenseCreatePage';
import DashboardLayout from './ticket_system/components/DashboardLayout';


import AnalyticsDashboard from './ticket_system/components/AnalyticsDashboard';
import CommandCenterView from './ticket_system/components/CommandCenterView';
import EditUserPage from './pages/EditUserPage';
import AdminUserViewPage from './pages/AdminUserViewPage';
import EmployeeDetailPage from './attendance_system/EmployeeDetailPage';

import './index.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

const DashboardWrapper = ({ children, tab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleTabChange = (newTab) => {
    // Navigate to respective dashboard with new tab
    if (user.role === 'admin') navigate('/dashboard/admin', { state: { activeTab: newTab } });
    else if (user.role === 'manager') navigate('/dashboard/manager', { state: { activeTab: newTab } });
    else if (user.role === 'technician') navigate('/dashboard/technician', { state: { activeTab: newTab } });
    else navigate('/dashboard/user', { state: { activeTab: newTab } });
  };

  return (
    <DashboardLayout activeTab={tab} userRole={user?.role} onTabChange={handleTabChange}>
      {children}
    </DashboardLayout>
  );
};



function App() {
  return (

    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <TranslationProvider>
            <ChatProvider>
              <Router>

                <Routes>
                  {/* Main Help Desk Route */}
                  <Route path="/" element={<TicketPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/qr-auth" element={<QRAuthPage />} />
                  <Route path="/setup-2fa" element={<Setup2FA />} />

                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin/edit-user/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><EditUserPage /></ProtectedRoute>} />
                  <Route path="/admin/user-profile/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminUserViewPage /></ProtectedRoute>} />
                  <Route path="/chats" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/expenses" element={
                    <ProtectedRoute>
                      <DashboardWrapper tab="expenses">
                        <ExpenseDashboard />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/create" element={
                    <ProtectedRoute>
                      <ExpenseCreatePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/edit/:id" element={
                    <ProtectedRoute>
                      <ExpenseCreatePage />
                    </ProtectedRoute>
                  } />


                  {/* Dashboard Routes */}
                  <Route path="/dashboard/user" element={
                    <ProtectedRoute allowedRoles={['user', 'admin']}>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/manager" element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <ManagerDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/technician" element={
                    <ProtectedRoute allowedRoles={['technician', 'admin']}>
                      <TechnicianDashboard />
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard/tickets/:id" element={
                    <ProtectedRoute>
                      <TicketDetailView />
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard/sla-monitoring" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <SLAMonitoring />
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard/sla-configuration" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SLAConfiguration />
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard/analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <AnalyticsDashboard />
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard/command-center" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <CommandCenterView />
                    </ProtectedRoute>
                  } />

                  <Route path="/attendance/employee/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <EmployeeDetailPage />
                    </ProtectedRoute>
                  } />


                  {/* Catch-all Redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

              </Router>
            </ChatProvider>
          </TranslationProvider>
        </ToastProvider>
      </AuthProvider >
    </ThemeProvider>

  );
}

export default App;
