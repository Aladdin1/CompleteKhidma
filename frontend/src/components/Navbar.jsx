import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { notificationsAPI } from '@/services/api';
import NotificationCenter from '@/components/NotificationCenter';

const linkClass = 'text-gray-700 hover:text-teal-600 font-medium transition-colors';

const Navbar = ({ variant = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const isDashboard = variant === 'dashboard' || (variant === 'auto' && isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetch = async () => {
      try {
        const data = await notificationsAPI.list({ limit: 100, unread_only: 'true' });
        const n = (data.items || []).filter((x) => x.kind === 'message_received');
        setUnreadMessageCount(n.length);
      } catch {
        setUnreadMessageCount(0);
      }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  const closeMobile = () => setIsOpen(false);

  const langButtons = (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <button
        onClick={() => handleLanguageChange('ar')}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          i18n.language === 'ar' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-teal-600'
        }`}
      >
        عربي
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          i18n.language === 'en' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-teal-600'
        }`}
      >
        EN
      </button>
    </div>
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center shrink-0">
              <img
                src="/logo.png"
                alt={t('app.name')}
                className="h-12 sm:h-14 w-auto object-contain object-left"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="flex items-center space-x-2 hidden fallback-logo">
                <span className="text-lg font-bold">
                  <span className="text-[#ea580c]">Khidma</span>
                  <span className="text-[#1e3a8a]">Mart</span>
                </span>
                <span className="text-[10px] text-gray-500 hidden sm:inline">— {t('app.tagline')}</span>
              </div>
            </Link>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {isDashboard ? (
              <>
                {(user?.role === 'admin' || user?.role === 'ops') && (
                  <>
                    <Link to="/admin" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'الإدارة' : 'Admin'}
                    </Link>
                    <Link to="/dashboard" className={`text-sm ${linkClass}`}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/profile" className={`text-sm ${linkClass}`}>
                      {t('profile.title')}
                    </Link>
                  </>
                )}
                {user?.role === 'tasker' && (
                  <>
                    <Link to="/dashboard/tasker" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'لوحة المهمات' : 'Dashboard'}
                    </Link>
                    <Link to="/dashboard/tasker/tasks/available" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'المهام المتاحة' : 'Available Tasks'}
                    </Link>
                    <Link to="/dashboard/tasker/tasks/offered" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'عروضي' : 'My Offers'}
                    </Link>
                    <Link to="/dashboard/tasker/quote-requests" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'طلبات السعر' : 'Quote requests'}
                    </Link>
                    <Link to="/dashboard/tasker/open-for-bid" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'مهام مفتوحة للعروض' : 'Open for bids'}
                    </Link>
                    <Link to="/dashboard/tasker/bookings" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'حجوزاتي' : 'My Bookings'}
                    </Link>
                    <Link to="/dashboard/messages" className={`relative text-sm ${linkClass}`}>
                      {t('messages.title')}
                      {unreadMessageCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Badge>
                      )}
                    </Link>
                    <Link to="/dashboard/tasker/profile" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'ملفي' : 'Profile'}
                    </Link>
                  </>
                )}
                {user?.role === 'client' && (
                  <>
                    <Link to="/dashboard" className={`text-sm ${linkClass}`}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/tasks/create" className={`text-sm ${linkClass}`}>
                      {t('task.create')}
                    </Link>
                    <Link to="/dashboard/messages" className={`relative text-sm ${linkClass}`}>
                      {t('messages.title')}
                      {unreadMessageCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Badge>
                      )}
                    </Link>
                    <Link to="/dashboard/payments/history" className={`text-sm ${linkClass}`}>
                      {t('payment.paymentHistory')}
                    </Link>
                    <Link to="/dashboard/profile" className={`text-sm ${linkClass}`}>
                      {t('profile.title')}
                    </Link>
                    <Link to="/dashboard/become-tasker" className={`text-sm ${linkClass}`}>
                      {i18n.language === 'ar' ? 'أصبح مهمات' : 'Become a Tasker'}
                    </Link>
                  </>
                )}
                {(!user?.role || (user?.role !== 'tasker' && user?.role !== 'client' && user?.role !== 'admin' && user?.role !== 'ops')) && (
                  <>
                    <Link to="/dashboard" className={`text-sm ${linkClass}`}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/messages" className={`relative text-sm ${linkClass}`}>
                      {t('messages.title')}
                      {unreadMessageCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Badge>
                      )}
                    </Link>
                    <Link to="/dashboard/profile" className={`text-sm ${linkClass}`}>
                      {t('profile.title')}
                    </Link>
                  </>
                )}
                <NotificationCenter />
                {langButtons}
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-teal-600" onClick={handleLogout}>
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/services" className={linkClass}>
                  {i18n.language === 'ar' ? 'الخدمات' : 'Services'}
                </Link>
                <Link to="/how-it-works" className={linkClass}>
                  {i18n.language === 'ar' ? 'كيف يعمل' : 'How it works'}
                </Link>
                <Link to="/become-tasker" className={linkClass}>
                  {i18n.language === 'ar' ? 'كن مهمات' : 'Become a Tasker'}
                </Link>
                {langButtons}
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard">
                      <Button variant="ghost" className="text-gray-700 hover:text-teal-600">
                        <UserCircle className="mr-2 h-5 w-5" />
                        {user?.full_name || user?.name || t('auth.dashboard')}
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={handleLogout}>
                      {t('auth.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="ghost" className="text-gray-700 hover:text-teal-600">
                        <UserCircle className="mr-2 h-5 w-5" />
                        {t('auth.login')}
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        {t('auth.signup')}
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-teal-600 transition-colors p-1"
              aria-label="Menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-3">
            {isDashboard ? (
              <>
                {(user?.role === 'admin' || user?.role === 'ops') && (
                  <>
                    <Link to="/admin" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'الإدارة' : 'Admin'}
                    </Link>
                    <Link to="/dashboard" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/profile" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('profile.title')}
                    </Link>
                  </>
                )}
                {user?.role === 'tasker' && (
                  <>
                    <Link to="/dashboard/tasker" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'لوحة المهمات' : 'Dashboard'}
                    </Link>
                    <Link to="/dashboard/tasker/tasks/available" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'المهام المتاحة' : 'Available Tasks'}
                    </Link>
                    <Link to="/dashboard/tasker/tasks/offered" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'عروضي' : 'My Offers'}
                    </Link>
                    <Link to="/dashboard/tasker/quote-requests" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'طلبات السعر' : 'Quote requests'}
                    </Link>
                    <Link to="/dashboard/tasker/open-for-bid" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'مهام مفتوحة للعروض' : 'Open for bids'}
                    </Link>
                    <Link to="/dashboard/tasker/bookings" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'حجوزاتي' : 'My Bookings'}
                    </Link>
                    <Link to="/dashboard/messages" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('messages.title')}
                      {unreadMessageCount > 0 && ` (${unreadMessageCount})`}
                    </Link>
                    <Link to="/dashboard/tasker/profile" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'ملفي' : 'Profile'}
                    </Link>
                  </>
                )}
                {user?.role === 'client' && (
                  <>
                    <Link to="/dashboard" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/tasks/create" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('task.create')}
                    </Link>
                    <Link to="/dashboard/messages" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('messages.title')}
                      {unreadMessageCount > 0 && ` (${unreadMessageCount})`}
                    </Link>
                    <Link to="/dashboard/payments/history" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('payment.paymentHistory')}
                    </Link>
                    <Link to="/dashboard/profile" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('profile.title')}
                    </Link>
                    <Link to="/dashboard/become-tasker" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {i18n.language === 'ar' ? 'أصبح مهمات' : 'Become a Tasker'}
                    </Link>
                  </>
                )}
                {(!user?.role || (user?.role !== 'tasker' && user?.role !== 'client' && user?.role !== 'admin' && user?.role !== 'ops')) && (
                  <>
                    <Link to="/dashboard" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('task.myTasks')}
                    </Link>
                    <Link to="/dashboard/messages" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('messages.title')}
                    </Link>
                    <Link to="/dashboard/profile" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                      {t('profile.title')}
                    </Link>
                  </>
                )}
                <div className="pt-2 flex gap-2">
                  {langButtons}
                  <Button variant="outline" className="flex-1" onClick={handleLogout}>
                    {t('auth.logout')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/services" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                  {i18n.language === 'ar' ? 'الخدمات' : 'Services'}
                </Link>
                <Link to="/how-it-works" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                  {i18n.language === 'ar' ? 'كيف يعمل' : 'How it works'}
                </Link>
                <Link to="/become-tasker" className={`block py-2 ${linkClass}`} onClick={closeMobile}>
                  {i18n.language === 'ar' ? 'كن مهمات' : 'Become a Tasker'}
                </Link>
                <div className="pt-2 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link to="/dashboard" onClick={closeMobile}>
                        <Button variant="outline" className="w-full">
                          {t('auth.dashboard')}
                        </Button>
                      </Link>
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                        {t('auth.logout')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={closeMobile}>
                        <Button variant="outline" className="w-full">
                          {t('auth.login')}
                        </Button>
                      </Link>
                      <Link to="/login" onClick={closeMobile}>
                        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                          {t('auth.signup')}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
