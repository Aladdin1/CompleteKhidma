import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI } from '../services/api';
import '../styles/DashboardPage.css';

function DashboardPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.list();
      setTasks(response.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStateLabel = (state) => {
    const stateMap = {
      draft: t('task.draft'),
      posted: t('task.posted'),
      matching: t('task.matching'),
      accepted: t('task.accepted'),
      in_progress: t('task.inProgress'),
      completed: t('task.completed'),
    };
    return stateMap[state] || state;
  };

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>{t('task.myTasks')}</h1>
        <Link to="/tasks/create" className="create-btn">
          + {t('task.create')}
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد مهام بعد</p>
          <Link to="/tasks/create" className="create-btn">
            {t('task.create')}
          </Link>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="task-card">
              <div className="task-header">
                <h3>{task.category}</h3>
                <span className={`state-badge state-${task.state}`}>
                  {getStateLabel(task.state)}
                </span>
              </div>
              <p className="task-description">{task.description}</p>
              <div className="task-footer">
                <span className="task-location">📍 {task.location?.address || task.location?.city}</span>
                <span className="task-date">
                  {new Date(task.schedule?.starts_at || task.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
