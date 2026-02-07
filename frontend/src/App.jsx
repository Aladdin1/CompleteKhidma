import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import LandingPage from './pages/LandingPage';
import BrowseServices from './pages/BrowseServices';
import ServiceDetails from './pages/ServiceDetails';
import HowItWorks from './pages/HowItWorks';
import BecomeTaskerPublic from './pages/BecomeTaskerPublic';
import BecomeTaskerSignupPage from './pages/BecomeTaskerSignupPage';
import DashboardPage from './pages/DashboardPage';
import MyTasksPage from './pages/MyTasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import FindTaskerPage from './pages/FindTaskerPage';
import ProfilePage from './pages/ProfilePage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import SpendingAnalyticsPage from './pages/SpendingAnalyticsPage';
import TaskerDashboardPage from './pages/TaskerDashboardPage';
import AvailableTasksPage from './pages/AvailableTasksPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import QuoteRequestsPage from './pages/QuoteRequestsPage';
import OpenForBidsPage from './pages/OpenForBidsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import TaskerProfilePage from './pages/TaskerProfilePage';
import TaskerViewPage from './pages/TaskerViewPage';
import BecomeTaskerPage from './pages/BecomeTaskerPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminTasksPage from './pages/AdminTasksPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminDisputeDetailPage from './pages/AdminDisputeDetailPage';
import AdminAuditLogPage from './pages/AdminAuditLogPage';
import AdminPendingTaskersPage from './pages/AdminPendingTaskersPage';
import AdminSupportTicketsPage from './pages/AdminSupportTicketsPage';
import AdminSupportTicketDetailPage from './pages/AdminSupportTicketDetailPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import TaskerApplicationStatusPage from './pages/TaskerApplicationStatusPage';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { Toaster } from './components/ui/toaster';

function TaskIdRedirect() {
  const { taskId } = useParams();
  return <Navigate to={`/dashboard/tasks/${taskId}`} replace />;
}

function BookRedirect() {
  const { serviceId } = useParams();
  return <Navigate to={`/services/${serviceId}`} replace />;
}

function TaskCreateRedirect() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  return <Navigate to={category ? `/services/${category}` : '/services'} replace />;
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleBasedRoute({ allowedRoles, children }) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function DashboardIndexRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'tasker') {
    return <Navigate to="/dashboard/tasker" replace />;
  }
  return <DashboardPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<BrowseServices />} />
        <Route path="/services/:categoryId" element={<ServiceDetails />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/become-tasker" element={<BecomeTaskerPublic />} />
        <Route path="/become-tasker/signup" element={<BecomeTaskerSignupPage />} />
        <Route path="/book/:serviceId" element={<BookRedirect />} />
        <Route path="/tasks/create" element={<TaskCreateRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* Admin Routes (admin, ops, or customer_service for support tickets only) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <RoleBasedRoute allowedRoles={['admin', 'ops', 'customer_service']}>
                <AdminLayout />
              </RoleBasedRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="tasks" element={<AdminTasksPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<ErrorBoundary backTo="/admin/users" backLabel="Back to Users" message="User detail page failed to load. You may see this if the API response format changed or data is missing."><AdminUserDetailPage /></ErrorBoundary>} />
          <Route path="disputes" element={<AdminDisputesPage />} />
          <Route path="disputes/:disputeId" element={<AdminDisputeDetailPage />} />
          <Route path="taskers/pending" element={<AdminPendingTaskersPage />} />
          <Route path="support-tickets" element={<AdminSupportTicketsPage />} />
          <Route path="support-tickets/:ticketId" element={<AdminSupportTicketDetailPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
        </Route>

        {/* Authenticated Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Client routes */}
          <Route index element={<DashboardIndexRoute />} />
          <Route path="my-tasks" element={<MyTasksPage />} />
          <Route path="tasks/:taskId/find-tasker" element={<FindTaskerPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="taskers/:taskerId" element={<TaskerViewPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/payments" element={<PaymentMethodsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="payments/history" element={<PaymentHistoryPage />} />
          <Route path="payments/analytics" element={<SpendingAnalyticsPage />} />
          <Route path="become-tasker" element={<BecomeTaskerPage />} />

          {/* Tasker routes */}
          <Route
            path="tasker"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <TaskerDashboardPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/tasks/available"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <AvailableTasksPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/tasks/offered"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <MyApplicationsPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/quote-requests"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <QuoteRequestsPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/open-for-bid"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <OpenForBidsPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/bookings"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <MyBookingsPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/profile"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <TaskerProfilePage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="tasker/application-status"
            element={
              <RoleBasedRoute allowedRoles={['tasker']}>
                <TaskerApplicationStatusPage />
              </RoleBasedRoute>
            }
          />
        </Route>

        {/* Redirect old routes to new structure */}
        <Route path="/dashboard/tasks/create" element={<Navigate to="/tasks/create" replace />} />
        <Route 
          path="/tasks/:taskId" 
          element={<TaskIdRedirect />} 
        />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
        <Route path="/tasker/profile" element={<Navigate to="/dashboard/tasker/profile" replace />} />
        <Route path="/tasker" element={<Navigate to="/dashboard/tasker" replace />} />
        <Route path="/tasker/tasks/available" element={<Navigate to="/dashboard/tasker/tasks/available" replace />} />
        <Route path="/tasker/tasks/offered" element={<Navigate to="/dashboard/tasker/tasks/offered" replace />} />
        <Route path="/tasker/quote-requests" element={<Navigate to="/dashboard/tasker/quote-requests" replace />} />
        <Route path="/tasker/open-for-bid" element={<Navigate to="/dashboard/tasker/open-for-bid" replace />} />
        <Route path="/tasker/bookings" element={<Navigate to="/dashboard/tasker/bookings" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
