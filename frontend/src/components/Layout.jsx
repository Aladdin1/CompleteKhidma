import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import '../styles/Layout.css';

function Layout() {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

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
                <Link to="/tasker/profile">ملفي</Link>
              </>
            )}
            {user?.role === 'client' && (
              <>
                <Link to="/">{t('task.myTasks')}</Link>
                <Link to="/tasks/create">{t('task.create')}</Link>
                <Link to="/profile">{t('profile.title')}</Link>
                <Link to="/become-tasker">أصبح مهمات</Link>
              </>
            )}
            {(!user?.role || (user?.role !== 'tasker' && user?.role !== 'client')) && (
              <>
                <Link to="/">{t('task.myTasks')}</Link>
                <Link to="/profile">{t('profile.title')}</Link>
              </>
            )}
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
