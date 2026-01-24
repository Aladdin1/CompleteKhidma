import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
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
import BecomeTaskerPage from './pages/BecomeTaskerPage';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleBasedRoute({ allowedRoles, children }) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/payments" element={<PaymentMethodsPage />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
