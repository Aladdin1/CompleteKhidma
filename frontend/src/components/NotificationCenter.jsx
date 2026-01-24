import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsAPI } from '../services/api';
import NotificationDropdown from './NotificationDropdown';
import '../styles/NotificationCenter.css';

function NotificationCenter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.list({ limit: 15 });
      setNotifications(data.items || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      // Refresh notifications to update unread count
      if (open) {
        fetchNotifications();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="notification-center__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('notifications.ariaLabel')}
      >
        <span className="notification-center__icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="notification-center__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onMarkRead={handleMarkRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default NotificationCenter;
