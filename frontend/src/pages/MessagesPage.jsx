import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { conversationsAPI, taskAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../contexts/ToastContext';
import ConversationList from '../components/ConversationList';
import MessageBubble from '../components/MessageBubble';
import '../styles/MessagesPage.css';

const POLL_INTERVAL_MS = 8000;

function MessagesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const bookingId = searchParams.get('booking');
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [conversationTasks, setConversationTasks] = useState({});
  const [messages, setMessages] = useState([]);
  const previousMessageIdsRef = useRef(new Set());
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError('');
      const data = await conversationsAPI.list({ limit: 50 });
      const items = data.items || [];
      setConversations(items);

      const taskIds = [...new Set(items.map((c) => c.task_id).filter(Boolean))];
      const tasks = {};
      await Promise.all(
        taskIds.map(async (tid) => {
          try {
            const task = await taskAPI.get(tid);
            tasks[tid] = task;
          } catch {
            tasks[tid] = null;
          }
        })
      );
      setConversationTasks(tasks);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('messages.loadError'));
    } finally {
      setLoadingConversations(false);
    }
  }, [t]);

  const loadMessages = useCallback(
    async (convId) => {
      if (!convId) {
        setMessages([]);
        previousMessageIdsRef.current = new Set();
        return;
      }
      try {
        setLoadingMessages(true);
        setError('');
        const data = await conversationsAPI.getMessages(convId, { limit: 100 });
        const newMessages = data.items || [];
        
        // Detect new incoming messages (not sent by current user)
        if (previousMessageIdsRef.current.size > 0 && newMessages.length > 0) {
          const newIncoming = newMessages.filter(
            (m) => !previousMessageIdsRef.current.has(m.id) && m.sender_id !== user?.id
          );
          if (newIncoming.length > 0) {
            showToast(t('messages.newMessage') || 'رسالة جديدة');
          }
        }
        
        setMessages(newMessages);
        previousMessageIdsRef.current = new Set(newMessages.map((m) => m.id));
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        setError(err.response?.data?.error?.message || t('messages.loadError'));
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [t, user?.id, showToast]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (bookingId && !conversationId) {
      setLoadingMessages(true);
      conversationsAPI
        .getByBooking(bookingId)
        .then((conv) => {
          setSearchParams({ conversation: conv.id }, { replace: true });
          // Reload conversations to include the new one
          loadConversations();
        })
        .catch((err) => {
          setError(err.response?.data?.error?.message || t('messages.loadError'));
          setLoadingMessages(false);
        });
      return;
    }
    loadMessages(conversationId);
  }, [bookingId, conversationId, loadMessages, setSearchParams, t, loadConversations]);

  useEffect(() => {
    if (!conversationId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    pollTimerRef.current = setInterval(() => {
      loadMessages(conversationId);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [conversationId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !conversationId || sending) return;

    setSending(true);
    try {
      const sent = await conversationsAPI.sendMessage(conversationId, { kind: 'text', text });
      setMessages((prev) => [...prev, sent]);
      setInputText('');
      scrollToBottom();
      showToast(t('messages.sent'));
    } catch (err) {
      setError(err.response?.data?.error?.message || t('messages.sendError'));
    } finally {
      setSending(false);
    }
  };

  const getConversationLabel = (c) => {
    if (!c?.task_id) return t('messages.conversation');
    const task = conversationTasks[c.task_id];
    if (task) {
      const cat = task.category || '';
      const desc = task.description ? String(task.description).slice(0, 30) : '';
      return [cat, desc].filter(Boolean).join(' – ') || t('messages.task');
    }
    return `${t('messages.task')} ${String(c.task_id).slice(0, 8)}…`;
  };

  const selectedConversation = conversations.find((c) => c.id === conversationId);

  return (
    <div className="messages-page" style={{ width: '100%', maxWidth: 'none', margin: 0 }}>
      <header className="messages-page__header">
        <h1 className="messages-page__title">{t('messages.title')}</h1>
      </header>

      <div className="messages-page__layout">
        <aside className="messages-page__sidebar">
          <ConversationList
            conversations={conversations}
            selectedId={conversationId}
            loading={loadingConversations}
            getConversationLabel={getConversationLabel}
          />
        </aside>

        <section className="messages-page__main">
          {error && (
            <div className="messages-page__error" role="alert">
              {error}
            </div>
          )}

          {!conversationId ? (
            <div className="messages-page__empty">
              <p>{t('messages.selectConversation')}</p>
              {conversations.length === 0 && !loadingConversations && (
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  {t('messages.noConversations')}
                  <br />
                  <span style={{ fontSize: '0.85rem' }}>
                    {user?.role === 'client' 
                      ? 'ابدأ محادثة من صفحة تفاصيل المهمة'
                      : 'ابدأ محادثة من صفحة المهام المقبولة'
                    }
                  </span>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="messages-page__chat-header">
                <span className="messages-page__chat-label">
                  {selectedConversation ? getConversationLabel(selectedConversation) : t('messages.conversation')}
                </span>
              </div>

              <div className="messages-page__thread">
                {loadingMessages ? (
                  <div className="messages-page__loading">{t('messages.loading')}</div>
                ) : (
                  <>
                    {messages.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form onSubmit={handleSend} className="messages-page__form">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('messages.placeholder')}
                  className="messages-page__input"
                  disabled={sending}
                  maxLength={2000}
                  aria-label={t('messages.placeholder')}
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="messages-page__send"
                >
                  {sending ? t('messages.sending') : t('messages.send')}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default MessagesPage;
