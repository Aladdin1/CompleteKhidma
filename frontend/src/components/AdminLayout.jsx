import { Link, Outlet, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Users, AlertCircle, ArrowLeft, FileText, UserCheck, Headphones } from 'lucide-react';
import Navbar from './Navbar';
import useAuthStore from '@/store/authStore';

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/taskers/pending', label: 'Pending taskers', icon: UserCheck },
  { path: '/admin/support-tickets', label: 'Support tickets', icon: Headphones },
  { path: '/admin/disputes', label: 'Disputes', icon: AlertCircle },
  { path: '/admin/audit-log', label: 'Audit log', icon: FileText },
];

const customerServiceNav = [
  { path: '/admin/users', label: 'Look up user', icon: Users },
  { path: '/admin/support-tickets', label: 'Support tickets', icon: Headphones },
];

function AdminLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isCustomerService = user?.role === 'customer_service';
  const navItems = isCustomerService ? customerServiceNav : adminNav;

  // Customer service: Support tickets, user lookup, and task details (when ?taskId= from ticket)
  const supportTicketPath = '/admin/support-tickets';
  const usersPath = '/admin/users';
  const tasksPath = '/admin/tasks';
  const isViewingTaskFromTicket = location.pathname === tasksPath && searchParams.get('taskId');
  const isAllowedPath =
    location.pathname === supportTicketPath ||
    location.pathname.startsWith(supportTicketPath + '/') ||
    location.pathname === usersPath ||
    location.pathname.match(/^\/admin\/users\/[^/]+$/) ||
    isViewingTaskFromTicket;
  if (isCustomerService && !isAllowedPath) {
    return <Navigate to={supportTicketPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar variant="dashboard" />
      <div className="flex flex-1">
        <aside className="w-56 min-h-[calc(100vh-4rem)] bg-white border-r border-slate-200 py-4 px-3 hidden md:block">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-teal-600 text-sm font-medium mb-4 px-3 py-2 rounded-md hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <nav className="space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = path === '/admin' ? location.pathname === path : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
