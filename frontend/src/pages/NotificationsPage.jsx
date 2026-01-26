import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import '../styles/NotificationsPage.css';

function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor = null) => {
    try {
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError('');
      const params = { limit: 20 };
      if (cursor) params.cursor = cursor;
      const data = await notificationsAPI.list(params);
      const items = data.items || [];
      setNotifications((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('notifications.loadError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = (n) => {
    if (n.kind === 'message_received') {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
      if (data?.conversation_id) {
        navigate(`/dashboard/messages?conversation=${data.conversation_id}`);
      }
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="notifications-page">
      <header className="notifications-page__header">
        <h1 className="notifications-page__title">{t('notifications.pageTitle')}</h1>
      </header>

      {error && (
        <div className="notifications-page__error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="notifications-page__loading">{t('notifications.loading')}</div>
      ) : !notifications.length ? (
        <div className="notifications-page__empty">
          <p>{t('notifications.empty')}</p>
        </div>
      ) : (
        <ul className="notifications-page__list">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`notifications-page__item ${n.read_at ? '' : 'notifications-page__item--unread'} ${n.kind === 'message_received' ? 'notifications-page__item--clickable' : ''}`}
              onClick={() => n.kind === 'message_received' && handleNotificationClick(n)}
              style={{ cursor: n.kind === 'message_received' ? 'pointer' : 'default' }}
            >
              <div className="notifications-page__item-main">
                <span className="notifications-page__item-title">{n.title}</span>
                {n.body && (
                  <p className="notifications-page__item-body">{n.body}</p>
                )}
                <time className="notifications-page__item-time" dateTime={n.created_at}>
                  {formatDate(n.created_at)}
                </time>
              </div>
              {!n.read_at && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkRead(n.id);
                  }}
                  className="notifications-page__mark-read"
                >
                  {t('notifications.markRead')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && nextCursor && (
        <div className="notifications-page__more">
          <button
            type="button"
            onClick={() => load(nextCursor)}
            disabled={loadingMore}
            className="notifications-page__load-more"
          >
            {loadingMore ? t('notifications.loading') : t('notifications.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
