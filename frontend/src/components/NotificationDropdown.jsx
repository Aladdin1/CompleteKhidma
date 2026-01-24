import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

function NotificationDropdown({ notifications, loading, onMarkRead, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    return d.toLocaleDateString();
  };

  const handleNotificationClick = (n) => {
    if (n.kind === 'message_received') {
      // Parse data if it's a string (PostgreSQL JSONB might return as string in some cases)
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
      if (data?.conversation_id) {
        onClose();
        navigate(`/messages?conversation=${data.conversation_id}`);
      }
    }
  };

  return (
    <div className="notification-dropdown" role="menu">
      <div className="notification-dropdown__header">
        <span className="notification-dropdown__title">{t('notifications.title')}</span>
        <Link to="/notifications" onClick={onClose} className="notification-dropdown__link">
          {t('notifications.viewAll')}
        </Link>
      </div>
      <div className="notification-dropdown__list">
        {loading ? (
          <div className="notification-dropdown__loading">{t('notifications.loading')}</div>
        ) : !notifications?.length ? (
          <div className="notification-dropdown__empty">{t('notifications.empty')}</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-dropdown__item ${n.read_at ? '' : 'notification-dropdown__item--unread'} ${n.kind === 'message_received' ? 'notification-dropdown__item--clickable' : ''}`}
              role="menuitem"
              onClick={() => n.kind === 'message_received' && handleNotificationClick(n)}
              style={{ cursor: n.kind === 'message_received' ? 'pointer' : 'default' }}
            >
              <div className="notification-dropdown__item-main">
                <span className="notification-dropdown__item-title">{n.title}</span>
                {n.body && (
                  <p className="notification-dropdown__item-body">{n.body}</p>
                )}
                <span className="notification-dropdown__item-time">{formatTime(n.created_at)}</span>
              </div>
              {!n.read_at && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMarkRead(n.id);
                  }}
                  className="notification-dropdown__mark-read"
                  aria-label={t('notifications.markRead')}
                >
                  {t('notifications.markRead')}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationDropdown;
