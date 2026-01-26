import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import BrowseServices from './pages/BrowseServices';
import ServiceDetails from './pages/ServiceDetails';
import HowItWorks from './pages/HowItWorks';
import BecomeTaskerPublic from './pages/BecomeTaskerPublic';
import BookTask from './pages/BookTask';
import DashboardPage from './pages/DashboardPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProfilePage from './pages/ProfilePage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import SpendingAnalyticsPage from './pages/SpendingAnalyticsPage';
import TaskerDashboardPage from './pages/TaskerDashboardPage';
import AvailableTasksPage from './pages/AvailableTasksPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import TaskerProfilePage from './pages/TaskerProfilePage';
import TaskerViewPage from './pages/TaskerViewPage';
import BecomeTaskerPage from './pages/BecomeTaskerPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import Layout from './components/Layout';
import { Toaster } from './components/ui/toaster';

function TaskIdRedirect() {
  const { taskId } = useParams();
  return <Navigate to={`/dashboard/tasks/${taskId}`} replace />;
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
        <Route path="/book/:serviceId" element={<BookTask />} />
        <Route path="/login" element={<LoginPage />} />

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
          <Route index element={<DashboardPage />} />
          <Route
            path="tasks/create"
            element={
              <RoleBasedRoute allowedRoles={['client']}>
                <TaskCreatePage />
              </RoleBasedRoute>
            }
          />
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
        </Route>

        {/* Redirect old routes to new structure */}
        <Route path="/tasks/create" element={<Navigate to="/dashboard/tasks/create" replace />} />
        <Route 
          path="/tasks/:taskId" 
          element={<TaskIdRedirect />} 
        />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/tasker/profile" element={<Navigate to="/dashboard/tasker/profile" replace />} />
        <Route path="/tasker" element={<Navigate to="/dashboard/tasker" replace />} />
        <Route path="/tasker/tasks/available" element={<Navigate to="/dashboard/tasker/tasks/available" replace />} />
        <Route path="/tasker/tasks/offered" element={<Navigate to="/dashboard/tasker/tasks/offered" replace />} />
        <Route path="/tasker/bookings" element={<Navigate to="/dashboard/tasker/bookings" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
