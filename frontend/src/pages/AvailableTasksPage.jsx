import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import '../styles/AvailableTasksPage.css';

function AvailableTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskerAPI.getAvailableTasks({
        limit: 20,
        cursor: nextCursor,
      });
      setTasks(data.items || []);
      setNextCursor(data.next_cursor);
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message || 'Failed to load tasks';
      const currentRole = err.response?.data?.error?.current_role;
      
      if (errorCode === 'FORBIDDEN' || errorCode === 'UNAUTHORIZED') {
        let msg = 'ليس لديك صلاحية للوصول.';
        if (currentRole) {
          msg += ` دورك الحالي: '${currentRole}'.`;
        }
        msg += ' يرجى التأكد من أن دورك في قاعدة البيانات هو "tasker" ثم تسجيل الخروج وإعادة تسجيل الدخول.';
        setError(msg);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  if (loading && tasks.length === 0) {
    return <div className="available-tasks loading">Loading available tasks...</div>;
  }

  return (
    <div className="available-tasks">
      <div className="page-header">
        <h1>المهام المتاحة</h1>
        <p>تصفح المهام المتاحة في منطقتك</p>
      </div>

      {error && <div className="error">{error}</div>}

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
                  {task.distance_km && (
                    <span className="task-distance">{task.distance_km.toFixed(1)} كم</span>
                  )}
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-details">
                  <div className="task-location">
                    <span>📍</span> {task.location.address}, {task.location.city}
                  </div>
                  <div className="task-schedule">
                    <span>🕐</span> {new Date(task.schedule.starts_at).toLocaleString('ar-EG')}
                  </div>
                  {task.pricing?.estimate && (
                    <div className="task-pricing">
                      <span>💰</span>{' '}
                      {task.pricing.estimate.min_total?.amount} -{' '}
                      {task.pricing.estimate.max_total?.amount}{' '}
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
              <button onClick={loadTasks} disabled={loading}>
                {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AvailableTasksPage;
