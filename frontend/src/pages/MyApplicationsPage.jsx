import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI, taskAPI } from '../services/api';
import '../styles/MyApplicationsPage.css';

function MyApplicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(new Set());

  useEffect(() => {
    loadOfferedTasks();
  }, []);

  const loadOfferedTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskerAPI.getOfferedTasks({ limit: 50 });
      setTasks(data.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load offered tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (taskId) => {
    try {
      setProcessing(prev => new Set(prev).add(taskId));
      await taskAPI.accept(taskId);
      await loadOfferedTasks(); // Reload to update list
      navigate(`/tasks/${taskId}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept task');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDecline = async (taskId) => {
    try {
      setProcessing(prev => new Set(prev).add(taskId));
      await taskAPI.decline(taskId);
      await loadOfferedTasks(); // Reload to update list
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to decline task');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  if (loading) {
    return <div className="my-applications loading">Loading...</div>;
  }

  return (
    <div className="my-applications">
      <div className="page-header">
        <h1>عروضي</h1>
        <p>المهام المعروضة عليك</p>
      </div>

      {error && <div className="error">{error}</div>}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد عروض حالياً</p>
          <p className="hint">سيتم إرسال عروض المهام إليك بناءً على ملفك الشخصي</p>
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map((task) => {
            const isProcessing = processing.has(task.id);
            return (
              <div key={task.id} className="task-card offered">
                <div className="task-header">
                  <span className="task-category">{task.category}</span>
                  {task.score && (
                    <span className="task-score">نقاط التطابق: {task.score}</span>
                  )}
                </div>
                {task.explanation && (
                  <div className="task-explanation">{task.explanation}</div>
                )}
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
                <div className="task-actions">
                  <button
                    className="btn-accept"
                    onClick={() => handleAccept(task.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'جاري المعالجة...' : 'قبول'}
                  </button>
                  <button
                    className="btn-decline"
                    onClick={() => handleDecline(task.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'جاري المعالجة...' : 'رفض'}
                  </button>
                  <button
                    className="btn-view"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyApplicationsPage;
