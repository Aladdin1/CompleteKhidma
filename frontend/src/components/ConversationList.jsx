import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function ConversationList({ conversations, selectedId, loading, getConversationLabel }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="conversation-list conversation-list--loading">
        <div className="conversation-list__skeleton" />
        <div className="conversation-list__skeleton" />
        <div className="conversation-list__skeleton" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="conversation-list conversation-list--empty">
        <p className="conversation-list__empty-text">{t('messages.noConversations')}</p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((c) => (
        <Link
          key={c.id}
          to={`/dashboard/messages?conversation=${c.id}`}
          className={`conversation-list__item ${selectedId === c.id ? 'conversation-list__item--active' : ''}`}
        >
          <div className="conversation-list__avatar">
            {getConversationLabel(c)?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="conversation-list__meta">
            <span className="conversation-list__label">{getConversationLabel(c)}</span>
            <span className="conversation-list__hint">
              {c.task_id ? `${t('messages.task')} ${String(c.task_id).slice(0, 8)}…` : t('messages.conversation')}
            </span>
          </div>
          {c.unread_count > 0 && (
            <span className="conversation-list__badge">{c.unread_count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default ConversationList;
