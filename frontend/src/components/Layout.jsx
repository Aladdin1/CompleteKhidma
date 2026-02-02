import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

function Layout() {
  const location = useLocation();
  const isDashboardHome = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar variant="dashboard" />
      <main className={isDashboardHome ? 'flex-1 w-full' : 'flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6'}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
