import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/TaskerDashboardPage.css';

function TaskerDashboardPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language?.startsWith('ar');
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
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
      const profileData = await taskerAPI.getProfile().catch(() => null);
      if (profileData) {
        setProfile(profileData);
      }

      setStats({
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
        <button onClick={() => navigate('/dashboard/tasker/profile')}>Complete Your Profile</button>
      </div>
    );
  }

  const isVerified = profile?.status === 'verified' || profile?.status === 'active';

  return (
    <div className="tasker-dashboard">
      <div className="page-header">
        <h1>لوحة تحكم المهمات</h1>
        <p>مرحباً {user?.full_name || user?.phone}</p>
      </div>

      {!isVerified && profile && (
        <div className="pending-verification-banner" style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#92400e' }}>
            {isAr ? 'طلبك قيد المراجعة' : 'Application under review'}
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#78350f', fontSize: '0.95rem' }}>
            {isAr
              ? 'تم استلام طلبك ومستنداتك. سنقوم بمراجعة طلبك والتحقق من هويتك. ستتمكن من تصفح المهام واستقبال العروض بعد الموافقة على طلبك.'
              : 'We have received your application and documents. Our team will review and verify your identity. You will be able to browse tasks and receive offers once your application is approved.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/tasker/application-status')}
            style={{
              background: '#d97706',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isAr ? 'عرض حالة التقديم' : 'View application status'}
          </button>
        </div>
      )}

      {profile && isVerified && (
        <div className="profile-summary">
          <div className="rating">
            <span className="rating-value">{profile.rating?.average?.toFixed(1) || '0.0'}</span>
            <span className="rating-count">({profile.rating?.count || 0} تقييم)</span>
          </div>
          <div className="stats-grid">
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


      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default TaskerDashboardPage;
