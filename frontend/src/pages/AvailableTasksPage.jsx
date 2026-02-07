import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import '../styles/AvailableTasksPage.css';

const CATEGORIES = [
  'cleaning', 'mounting', 'moving', 'assembly', 'delivery',
  'handyman', 'painting', 'plumbing', 'electrical',
];

function AvailableTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [startsAfter, setStartsAfter] = useState('');
  const [startsBefore, setStartsBefore] = useState('');
  const [sort, setSort] = useState('');

  const loadTasks = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      setError('');
      setPendingVerification(false);
      const params = { limit: 20, cursor: cursor || undefined };
      if (categoryFilter) params.category = categoryFilter;
      if (maxDistance) params.max_distance_km = maxDistance;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (startsAfter) params.starts_after = new Date(startsAfter).toISOString();
      if (startsBefore) params.starts_before = new Date(startsBefore).toISOString();
      if (sort) params.sort = sort;
      const data = await taskerAPI.getAvailableTasks(params);
      if (cursor) {
        setTasks((prev) => [...prev, ...(data.items || [])]);
      } else {
        setTasks(data.items || []);
      }
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || 'Failed to load tasks';
      const role = err.response?.data?.error?.current_role;
      if (code === 'TASKER_NOT_VERIFIED') {
        setPendingVerification(true);
        setError(msg);
      } else if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') {
        let s = 'ليس لديك صلاحية للوصول.';
        if (role) s += ` دورك: '${role}'.`;
        s += ' سجّل الخروج ثم الدخول مجدداً.';
        setError(s);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, maxDistance, minPrice, maxPrice, startsAfter, startsBefore, sort]);

  useEffect(() => {
    loadTasks(null);
  }, [loadTasks]);

  const handleTaskClick = (taskId) => navigate(`/dashboard/tasks/${taskId}`);

  const clearFilters = () => {
    setCategoryFilter('');
    setMaxDistance('');
    setMinPrice('');
    setMaxPrice('');
    setStartsAfter('');
    setStartsBefore('');
    setSort('');
  };

  if (loading && tasks.length === 0) {
    return <div className="available-tasks loading">{t('tasker.loading') || 'جاري التحميل...'}</div>;
  }

  return (
    <div className="available-tasks">
      <div className="page-header">
        <h1>{t('tasker.availableTasks')}</h1>
        <p>تصفح المهام المتاحة في منطقتك</p>
      </div>

      {error && (
        <div className="error">
          {error}
          {pendingVerification && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/tasker/application-status')}
              style={{
                marginTop: '0.75rem',
                display: 'block',
                padding: '0.5rem 1rem',
                background: '#0d9488',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {t('tasker.applicationStatus') || 'عرض حالة التقديم'}
            </button>
          )}
        </div>
      )}

      <div className="available-filters">
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          {t('task.filters')} {showFilters ? '▲' : '▼'}
        </button>
        {showFilters && (
          <div className="filters-grid">
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
              <label>{t('tasker.filterDistance')}</label>
              <input
                type="number"
                min="1"
                placeholder="km"
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterMinPrice')}</label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterMaxPrice')}</label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterStartsAfter')}</label>
              <input
                type="date"
                value={startsAfter}
                onChange={(e) => setStartsAfter(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('tasker.filterStartsBefore')}</label>
              <input
                type="date"
                value={startsBefore}
                onChange={(e) => setStartsBefore(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>{t('task.sortBy')}</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">—</option>
                <option value="distance_asc">{t('tasker.sortDistance')}</option>
                <option value="price_asc">{t('tasker.sortPriceAsc')}</option>
                <option value="price_desc">{t('tasker.sortPriceDesc')}</option>
              </select>
            </div>
            <button type="button" className="clear-filters" onClick={clearFilters}>
              {t('task.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد مهام متاحة حالياً</p>
          <p className="hint">تأكد من إعداد ملفك الشخصي ومنطقة الخدمة</p>
        </div>
      ) : (
        <>
          <div className="tasks-list">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="task-card"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="task-header">
                  <span className="task-category">{task.category}</span>
                  {task.distance_km != null && (
                    <span className="task-distance">{task.distance_km.toFixed(1)} km</span>
                  )}
                </div>
                {task.client_name && (
                  <div className="task-client">
                    {t('tasker.client')}: {task.client_name}
                  </div>
                )}
                <p className="task-description">{task.description}</p>
                <div className="task-details">
                  <div className="task-location">
                    <span>📍</span> {task.location?.address}, {task.location?.city}
                  </div>
                  <div className="task-schedule">
                    <span>🕐</span>{' '}
                    {task.schedule?.starts_at &&
                      new Date(task.schedule.starts_at).toLocaleString('ar-EG')}
                  </div>
                  {task.pricing?.estimate && (
                    <div className="task-pricing">
                      <span>💰</span>{' '}
                      {task.pricing.estimate.min_total?.amount}–{task.pricing.estimate.max_total?.amount}{' '}
                      {task.pricing.estimate.min_total?.currency}
                    </div>
                  )}
                </div>
                <div className="task-state">
                  <span className={`state-badge ${task.state}`}>{task.state}</span>
                </div>
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="load-more">
              <button
                onClick={() => loadTasks(nextCursor)}
                disabled={loading}
              >
                {loading ? (t('tasker.loading') || 'جاري التحميل...') : 'تحميل المزيد'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AvailableTasksPage;
