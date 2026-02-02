import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/TaskerDashboardPage.css';

function TaskerDashboardPage() {
  useTranslation(); // i18n available when needed
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    availableTasks: 0,
    offeredTasks: 0,
    completedTasks: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [profileData, availableData] = await Promise.all([
        taskerAPI.getProfile().catch(() => null),
        taskerAPI.getAvailableTasks({ limit: 1 }).catch(() => ({ items: [], total_count: 0 })),
      ]);

      if (profileData) {
        setProfile(profileData);
      }

      setStats({
        availableTasks: availableData.total_count || 0,
        offeredTasks: profileData?.stats?.offered_bookings_count || 0,
        completedTasks: profileData?.stats?.completed_tasks_count || 0,
        totalEarnings: profileData?.stats?.total_earnings || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="tasker-dashboard loading">Loading...</div>;
  }

  if (error && !profile) {
    return (
      <div className="tasker-dashboard error">
        <p>{error}</p>
        <button onClick={() => navigate('/profile')}>Complete Your Profile</button>
      </div>
    );
  }

  return (
    <div className="tasker-dashboard">
      <div className="page-header">
        <h1>لوحة تحكم المهمات</h1>
        <p>مرحباً {user?.full_name || user?.phone}</p>
      </div>

      {profile && (
        <div className="profile-summary">
          <div className="rating">
            <span className="rating-value">{profile.rating?.average?.toFixed(1) || '0.0'}</span>
            <span className="rating-count">({profile.rating?.count || 0} تقييم)</span>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.availableTasks}</div>
              <div className="stat-label">مهام متاحة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.offeredTasks}</div>
              <div className="stat-label">عروض واردة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completedTasks}</div>
              <div className="stat-label">مهام مكتملة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalEarnings.toLocaleString()}</div>
              <div className="stat-label">إجمالي الأرباح (EGP)</div>
            </div>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <button
          className="action-btn primary"
          onClick={() => navigate('/tasker/tasks/available')}
        >
          تصفح المهام المتاحة
        </button>
        <button
          className="action-btn primary"
          onClick={() => navigate('/tasker/bookings')}
        >
          مهامي المقبولة
        </button>
        <button
          className="action-btn secondary"
          onClick={() => navigate('/tasker/tasks/offered')}
        >
          عروضي
        </button>
        <button
          className="action-btn secondary"
          onClick={() => navigate('/tasker/profile')}
        >
          ملفي الشخصي
        </button>
        <button
          className="action-btn secondary"
          onClick={() => navigate('/tasker/earnings')}
        >
          أرباحي
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default TaskerDashboardPage;
