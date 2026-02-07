import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingAPI } from '../services/api';
import '../styles/MyBookingsPage.css';

const CATEGORIES = [
  'cleaning', 'mounting', 'moving', 'assembly', 'delivery',
  'handyman', 'painting', 'plumbing', 'electrical',
];

const STATUS_OPTIONS = [
  { value: '', labelKey: 'task.allStatuses' },
  { value: 'offered', labelKey: 'tasker.offered' },
  { value: 'accepted', labelKey: 'tasker.accepted' },
  { value: 'confirmed', labelKey: 'tasker.confirmed' },
  { value: 'in_progress', labelKey: 'task.inProgress' },
  { value: 'completed', labelKey: 'task.completed' },
  { value: 'canceled', labelKey: 'tasker.canceled' },
  { value: 'disputed', labelKey: 'tasker.disputed' },
];

function MyBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const loadBookings = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 20, cursor: cursor || undefined };
      if (searchQ.trim()) params.q = searchQ.trim();
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();
      if (sort) params.sort = sort;
      const data = await bookingAPI.list(params);
      if (cursor) {
        setBookings((prev) => [...prev, ...(data.items || [])]);
      } else {
        setBookings(data.items || []);
      }
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [searchQ, statusFilter, categoryFilter, dateFrom, dateTo, sort]);

  useEffect(() => {
    loadBookings(null);
  }, [loadBookings]);

  const getStatusLabel = (status) => {
    const map = {
      offered: 'معروض',
      accepted: 'مقبول',
      confirmed: 'مؤكد',
      in_progress: t('task.inProgress'),
      completed: t('task.completed'),
      canceled: 'ملغي',
      disputed: 'نزاع',
    };
    return map[status] || status;
  };

  const getStatusClass = (s) => `status-${s}`;

  const handleViewTask = (taskId) => navigate(`/dashboard/tasks/${taskId}`);

  const refreshList = () => loadBookings(null);

  const handleMarkArrived = async (bookingId) => {
    try {
      await bookingAPI.markArrived(bookingId);
      setError('');
      refreshList();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to mark arrived');
    }
  };

  const handleAcceptOffer = async (bookingId) => {
    if (!window.confirm('هل أنت متأكد من قبول هذا العرض؟')) return;
    
    try {
      await bookingAPI.accept(bookingId);
      setError('');
      alert('تم قبول العرض بنجاح!');
      refreshList();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept offer');
    }
  };

  const handleRejectOffer = async (bookingId) => {
    const reason = window.prompt('سبب الرفض (اختياري):');
    if (reason === null) return; // User cancelled
    
    if (!window.confirm('هل أنت متأكد من رفض هذا العرض؟')) return;
    
    try {
      await bookingAPI.reject(bookingId, reason || undefined);
      setError('');
      alert('تم رفض العرض بنجاح');
      refreshList();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reject offer');
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await bookingAPI.updateStatus(bookingId, status);
      setError('');
      refreshList();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update');
    }
  };

  const clearFilters = () => {
    setSearchQ('');
    setStatusFilter('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
    setSort('newest');
  };

  if (loading && bookings.length === 0) {
    return <div className="my-bookings loading">{t('tasker.loading') || 'جاري التحميل...'}</div>;
  }

  return (
    <div className="my-bookings">
      <div className="page-header">
        <h1>{t('tasker.myBookings')}</h1>
        <p>إدارة المهام التي قبلتها</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="bookings-search-filter">
        <div className="search-row">
          <input
            type="text"
            placeholder={t('tasker.searchBookings')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadBookings(null)}
            className="search-input"
          />
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            {t('task.filters')} {showFilters ? '▲' : '▼'}
          </button>
        </div>
        {showFilters && (
          <div className="filters-row">
            <div className="filter-group">
              <label>{t('tasker.filterStatus')}</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterCategory')}</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">{t('task.allCategories')}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t('task.sortBy')}</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">{t('tasker.sortNewest')}</option>
                <option value="oldest">{t('tasker.sortOldest')}</option>
                <option value="earnings_desc">{t('tasker.sortEarnings')}</option>
              </select>
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterStartsAfter')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterStartsBefore')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button type="button" className="clear-filters" onClick={clearFilters}>
              {t('task.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>{t('tasker.noBookings')}</p>
          <p className="hint">عندما تقبل مهمة، ستظهر هنا</p>
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
                    {booking.task.client_name && (
                      <span className="client-name">
                        {t('tasker.client')}: {booking.task.client_name}
                      </span>
                    )}
                  </div>
                  {booking.agreed_rate?.amount != null && (
                    <div className="booking-rate">
                      {booking.agreed_rate.amount} {booking.agreed_rate.currency}
                    </div>
                  )}
                </div>

                <p className="booking-description">{booking.task.description}</p>

                <div className="booking-details">
                  <div className="detail-item">
                    <span className="detail-label">📍 {t('task.location')}</span>
                    <span>{booking.task.location?.address}, {booking.task.location?.city}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🕐 {t('task.schedule')}</span>
                    <span>
                      {new Date(booking.task.schedule?.starts_at).toLocaleString('ar-EG', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {booking.arrived_at && (
                    <div className="detail-item">
                      <span className="detail-label">📍 {t('tasker.arrivedAt')}</span>
                      <span>
                        {new Date(booking.arrived_at).toLocaleString('ar-EG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}
                  {booking.started_at && (
                    <div className="detail-item">
                      <span className="detail-label">⏱️ {t('tasker.startedAt')}</span>
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
                      <span className="detail-label">✅ {t('tasker.completedAt')}</span>
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
                    {t('tasker.viewDetails')}
                  </button>
                  <Link
                    to={`/messages?booking=${booking.id}`}
                    className="primary-btn"
                    style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                  >
                    💬 {t('messages.title') || 'رسالة'}
                  </Link>
                  {booking.status === 'offered' && (
                    <>
                      <button
                        className="primary-btn"
                        onClick={() => handleAcceptOffer(booking.id)}
                      >
                        {t('tasker.acceptOffer') || 'قبول العرض'}
                      </button>
                      <button
                        className="danger-btn"
                        onClick={() => handleRejectOffer(booking.id)}
                      >
                        {t('tasker.rejectOffer') || 'رفض العرض'}
                      </button>
                    </>
                  )}
                  {booking.status === 'accepted' && (
                    <button
                      className="secondary-btn"
                      onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                    >
                      {t('tasker.confirmAccept')}
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <>
                      {!booking.arrived_at && (
                        <button
                          className="secondary-btn"
                          onClick={() => handleMarkArrived(booking.id)}
                        >
                          {t('tasker.markArrived')}
                        </button>
                      )}
                      <button
                        className="primary-btn"
                        onClick={() => handleStatusUpdate(booking.id, 'in_progress')}
                      >
                        {t('tasker.startTask')}
                      </button>
                    </>
                  )}
                  {booking.status === 'in_progress' && (
                    <button
                      className="primary-btn"
                      onClick={async () => {
                        if (!window.confirm('هل أكملت المهمة؟')) return;
                        await handleStatusUpdate(booking.id, 'completed');
                      }}
                    >
                      {t('tasker.completeTask')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="load-more">
              <button
                onClick={() => loadBookings(nextCursor)}
                disabled={loading}
              >
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
