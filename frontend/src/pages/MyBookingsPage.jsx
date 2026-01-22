import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingAPI } from '../services/api';
import '../styles/MyBookingsPage.css';

function MyBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bookingAPI.list({
        limit: 20,
        cursor: nextCursor,
      });
      setBookings(data.items || []);
      setNextCursor(data.next_cursor);
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load bookings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      offered: 'معروض',
      accepted: 'مقبول',
      confirmed: 'مؤكد',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      canceled: 'ملغي',
      disputed: 'نزاع',
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const handleViewTask = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  if (loading && bookings.length === 0) {
    return <div className="my-bookings loading">جاري التحميل...</div>;
  }

  return (
    <div className="my-bookings">
      <div className="page-header">
        <h1>مهامي المقبولة</h1>
        <p>إدارة المهام التي قبلتها</p>
      </div>

      {error && <div className="error">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد مهام مقبولة حالياً</p>
          <p className="hint">عندما تقبل مهمة، ستظهر هنا</p>
          <button
            className="primary-btn"
            onClick={() => navigate('/tasker/tasks/available')}
          >
            تصفح المهام المتاحة
          </button>
        </div>
      ) : (
        <>
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-info">
                    <h3>{booking.task.category}</h3>
                    <span className={`status-badge ${getStatusClass(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                  {booking.agreed_rate?.amount && (
                    <div className="booking-rate">
                      {booking.agreed_rate.amount} {booking.agreed_rate.currency}
                    </div>
                  )}
                </div>

                <p className="booking-description">{booking.task.description}</p>

                <div className="booking-details">
                  <div className="detail-item">
                    <span className="detail-label">📍 الموقع:</span>
                    <span>{booking.task.location.address}, {booking.task.location.city}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🕐 الموعد:</span>
                    <span>
                      {new Date(booking.task.schedule.starts_at).toLocaleString('ar-EG', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {booking.started_at && (
                    <div className="detail-item">
                      <span className="detail-label">⏱️ بدأ في:</span>
                      <span>
                        {new Date(booking.started_at).toLocaleString('ar-EG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}
                  {booking.completed_at && (
                    <div className="detail-item">
                      <span className="detail-label">✅ اكتمل في:</span>
                      <span>
                        {new Date(booking.completed_at).toLocaleString('ar-EG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="booking-actions">
                  <button
                    className="primary-btn"
                    onClick={() => handleViewTask(booking.task.id)}
                  >
                    عرض التفاصيل
                  </button>
                  {booking.status === 'offered' && (
                    <button
                      className="secondary-btn"
                      onClick={async () => {
                        try {
                          await bookingAPI.updateStatus(booking.id, 'accepted');
                          loadBookings();
                        } catch (err) {
                          setError(err.response?.data?.error?.message || 'Failed to confirm booking');
                        }
                      }}
                    >
                      تأكيد القبول
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button
                      className="primary-btn"
                      onClick={async () => {
                        try {
                          await bookingAPI.updateStatus(booking.id, 'in_progress');
                          loadBookings();
                        } catch (err) {
                          setError(err.response?.data?.error?.message || 'Failed to start task');
                        }
                      }}
                    >
                      بدء المهمة
                    </button>
                  )}
                  {booking.status === 'in_progress' && (
                    <button
                      className="primary-btn"
                      onClick={async () => {
                        if (!window.confirm('هل أكملت المهمة؟')) return;
                        try {
                          await bookingAPI.updateStatus(booking.id, 'completed');
                          loadBookings();
                        } catch (err) {
                          setError(err.response?.data?.error?.message || 'Failed to complete task');
                        }
                      }}
                    >
                      إكمال المهمة
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="load-more">
              <button onClick={loadBookings} disabled={loading}>
                {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyBookingsPage;
