import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Users, AlertCircle, ArrowLeft, FileText, UserCheck } from 'lucide-react';
import Navbar from './Navbar';

const adminNav = [
  { path: '/admin', labelEn: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/admin/tasks', labelEn: 'Tasks', labelAr: 'المهام', icon: ListTodo },
  { path: '/admin/users', labelEn: 'Users', labelAr: 'المستخدمين', icon: Users },
  { path: '/admin/taskers/pending', labelEn: 'Pending taskers', labelAr: 'المهمات قيد المراجعة', icon: UserCheck },
  { path: '/admin/disputes', labelEn: 'Disputes', labelAr: 'النزاعات', icon: AlertCircle },
  { path: '/admin/audit-log', labelEn: 'Audit log', labelAr: 'سجل التدقيق', icon: FileText },
];

function AdminLayout() {
  const location = useLocation();
  const isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';

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
            {isAr ? 'العودة للموقع' : 'Back to site'}
          </Link>
          <nav className="space-y-1">
            {adminNav.map(({ path, labelEn, labelAr, icon: Icon }) => {
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
                  {isAr ? labelAr : labelEn}
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
