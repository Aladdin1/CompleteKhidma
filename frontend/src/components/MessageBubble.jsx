import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';

function MessageBubble({ message }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOwn = message.sender_id === user?.id;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (message.kind === 'text') {
      return <p className="message-bubble__text">{message.text}</p>;
    }
    if (message.kind === 'voice') {
      return (
        <div className="message-bubble__voice">
          <span className="message-bubble__voice-label">{t('messages.voiceNote')}</span>
          {message.media_url && (
            <audio controls src={message.media_url} className="message-bubble__audio" />
          )}
        </div>
      );
    }
    if (message.kind === 'image') {
      return (
        <div className="message-bubble__image">
          {message.media_url && (
            <img src={message.media_url} alt="" className="message-bubble__img" />
          )}
          {message.text && <p className="message-bubble__caption">{message.text}</p>}
        </div>
      );
    }
    return <p className="message-bubble__text">{message.text || '—'}</p>;
  };

  return (
    <div className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}`}>
      <div className="message-bubble__inner">
        {renderContent()}
        <time className="message-bubble__time" dateTime={message.created_at}>
          {formatTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}

export default MessageBubble;
