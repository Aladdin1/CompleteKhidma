import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import NotificationCenter from './NotificationCenter';
import { notificationsAPI } from '../services/api';
import '../styles/Layout.css';

function Layout() {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadMessages = async () => {
      try {
        const data = await notificationsAPI.list({ limit: 100, unread_only: 'true' });
        const messageNotifications = (data.items || []).filter(
          (n) => n.kind === 'message_received'
        );
        setUnreadMessageCount(messageNotifications.length);
      } catch {
        setUnreadMessageCount(0);
      }
    };

    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            {t('app.name')}
          </Link>
          <nav className="nav">
            {user?.role === 'tasker' && (
              <>
                <Link to="/tasker">لوحة المهمات</Link>
                <Link to="/tasker/tasks/available">المهام المتاحة</Link>
                <Link to="/tasker/tasks/offered">عروضي</Link>
                <Link to="/messages" className="nav-messages-link">
                  {t('messages.title')}
                  {unreadMessageCount > 0 && (
                    <span className="nav-messages-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
                  )}
                </Link>
                <Link to="/tasker/profile">ملفي</Link>
              </>
            )}
            {user?.role === 'client' && (
              <>
                <Link to="/">{t('task.myTasks')}</Link>
                <Link to="/tasks/create">{t('task.create')}</Link>
                <Link to="/messages" className="nav-messages-link">
                  {t('messages.title')}
                  {unreadMessageCount > 0 && (
                    <span className="nav-messages-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
                  )}
                </Link>
                <Link to="/payments/history">{t('payment.paymentHistory')}</Link>
                <Link to="/profile">{t('profile.title')}</Link>
                <Link to="/become-tasker">أصبح مهمات</Link>
              </>
            )}
            {(!user?.role || (user?.role !== 'tasker' && user?.role !== 'client')) && (
              <>
                <Link to="/">{t('task.myTasks')}</Link>
                <Link to="/messages" className="nav-messages-link">
                  {t('messages.title')}
                  {unreadMessageCount > 0 && (
                    <span className="nav-messages-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
                  )}
                </Link>
                <Link to="/profile">{t('profile.title')}</Link>
              </>
            )}
            <NotificationCenter />
            <div className="language-switcher">
              <button
                onClick={() => handleLanguageChange('ar')}
                className={i18n.language === 'ar' ? 'active' : ''}
              >
                عربي
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={i18n.language === 'en' ? 'active' : ''}
              >
                EN
              </button>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              {t('auth.logout')}
            </button>
          </nav>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
