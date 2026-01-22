import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI, taskerAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/TaskDetailPage.css';

function TaskDetailPage() {
  const { t } = useTranslation();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCandidates, setShowCandidates] = useState(false);
  const [canAccept, setCanAccept] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskData = await taskAPI.get(taskId);
      setTask(taskData);

      // For taskers, allow accepting tasks in 'posted' or 'matching' state
      // (backend will validate - matching service not yet implemented)
      if (user?.role === 'tasker' && (taskData.state === 'posted' || taskData.state === 'matching')) {
        setCanAccept(true);
      }

      // Load candidates if task is posted (for clients to see)
      if ((taskData.state === 'posted' || taskData.state === 'matching') && taskData.client_id === user?.id) {
        await loadCandidates();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    // Only load for clients (task owners)
    // Note: task state is checked before calling this function
    if (!task || !user || task.client_id !== user.id) {
      console.warn('Cannot load candidates: not task owner');
      return;
    }
    
    try {
      const response = await taskAPI.getCandidates(taskId);
      setCandidates(response.items || []);
      setShowCandidates(true);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Failed to load candidates:', err);
      const errorMsg = err.response?.data?.error?.message || 'Failed to load available taskers';
      setError(`تعذر تحميل العمال المتاحين: ${errorMsg}`);
      setShowCandidates(true); // Still show the section even if empty
      setCandidates([]);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه المهمة؟')) return;

    try {
      await taskAPI.cancel(taskId);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to cancel task');
    }
  };

  const handleAccept = async () => {
    if (!window.confirm('هل أنت متأكد من قبول هذه المهمة؟')) return;

    try {
      await taskAPI.accept(taskId);
      setError('');
      alert('تم قبول المهمة بنجاح!');
      navigate('/tasker/bookings');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept task');
    }
  };

  const handleSelectTasker = async (taskerId) => {
    if (!window.confirm('هل أنت متأكد من اختيار هذا العامل؟')) return;

    try {
      await taskAPI.selectTasker(taskId, taskerId);
      setError('');
      alert('تم اختيار العامل بنجاح!');
      loadTask(); // Reload to show assigned tasker
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to select tasker');
    }
  };

  // Check if current user is the task owner (client)
  const isTaskOwner = task && user && task.client_id === user.id;

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

  if (error && !task) {
    return <div className="error">{error}</div>;
  }

  if (!task) {
    return <div>Task not found</div>;
  }

  return (
    <div className="task-detail-page">
      <div className="page-header">
        <Link to="/" className="back-link">← رجوع</Link>
        <h1>تفاصيل المهمة</h1>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="task-detail-card">
        <div className="task-header">
          <h2>{task.category}</h2>
          <span className={`state-badge state-${task.state}`}>
            {getStateLabel(task.state)}
          </span>
        </div>

        <div className="task-section">
          <h3>الوصف</h3>
          <p>{task.description}</p>
        </div>

        <div className="task-section">
          <h3>الموقع</h3>
          <p>📍 {task.location?.address || task.location?.city}</p>
          {task.location?.district && <p>المنطقة: {task.location.district}</p>}
        </div>

        <div className="task-section">
          <h3>الموعد</h3>
          <p>
            {new Date(task.schedule?.starts_at || task.created_at).toLocaleString('ar-EG', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
        </div>

        {task.pricing?.estimate && (
          <div className="task-section">
            <h3>التكلفة المقدرة</h3>
            <p>
              {task.pricing.estimate.min_total?.amount} - {task.pricing.estimate.max_total?.amount}{' '}
              {task.pricing.estimate.min_total?.currency}
            </p>
          </div>
        )}

        {/* Show assigned tasker if task is accepted */}
        {isTaskOwner && task.assigned_tasker && (
          <div className="task-section">
            <h3>العامل المكلف</h3>
            <div className="assigned-tasker-card">
              <div className="tasker-header">
                <div className="tasker-main-info">
                  <h4>{task.assigned_tasker.full_name}</h4>
                  {task.assigned_tasker.verification?.is_verified && (
                    <span className="verified-badge">✓ موثق</span>
                  )}
                </div>
                <div className="tasker-rating">
                  ⭐ {task.assigned_tasker.rating?.average?.toFixed(1) || '0.0'} (
                  {task.assigned_tasker.rating?.count || 0} تقييم)
                </div>
              </div>
              {task.assigned_tasker.bio && (
                <p className="tasker-bio">{task.assigned_tasker.bio}</p>
              )}
              {task.assigned_tasker.skills && task.assigned_tasker.skills.length > 0 && (
                <div className="tasker-skills">
                  <strong>المهارات:</strong> {task.assigned_tasker.skills.join('، ')}
                </div>
              )}
              <div className="tasker-stats">
                <span>معدل القبول: {(task.assigned_tasker.stats?.acceptance_rate * 100).toFixed(0)}%</span>
                <span>معدل الإكمال: {(task.assigned_tasker.stats?.completion_rate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Show candidates section to task owners (clients) when task is posted or matching */}
        {isTaskOwner && (task.state === 'posted' || task.state === 'matching') && (
          <div className="task-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>العمال المتاحون</h3>
              {!showCandidates && (
                <button
                  onClick={() => loadCandidates()}
                  className="primary-btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  عرض العمال المتاحين
                </button>
              )}
            </div>
            
            {showCandidates ? (
              candidates.length > 0 ? (
                <div className="candidates-list">
                  {candidates.map((candidate, index) => (
                    <div key={candidate.tasker?.user_id || index} className="candidate-card">
                      <div className="candidate-main">
                        <div className="candidate-header">
                          <div className="candidate-info">
                            <div className="candidate-name-row">
                              <h4>{candidate.tasker?.full_name || 'Tasker'}</h4>
                              {candidate.tasker?.verification?.is_verified && (
                                <span className="verified-badge-small">✓ موثق</span>
                              )}
                              <span className="candidate-rank-badge">#{candidate.rank}</span>
                            </div>
                            <div className="candidate-rating">
                              ⭐ {candidate.tasker?.rating?.average?.toFixed(1) || 'N/A'} (
                              {candidate.tasker?.rating?.count || 0} تقييم)
                            </div>
                          </div>
                        </div>

                        {candidate.tasker?.bio && (
                          <p className="candidate-bio">{candidate.tasker.bio}</p>
                        )}

                        <div className="candidate-details">
                          {candidate.distance_km !== null && (
                            <div className="detail-item">
                              <span className="detail-icon">📍</span>
                              <span>{candidate.distance_km} كم</span>
                            </div>
                          )}
                          {candidate.tasker?.skills && candidate.tasker.skills.length > 0 && (
                            <div className="detail-item">
                              <span className="detail-icon">🛠️</span>
                              <span>{candidate.tasker.skills.slice(0, 3).join('، ')}{candidate.tasker.skills.length > 3 ? '...' : ''}</span>
                            </div>
                          )}
                          {candidate.pricing?.estimate && (
                            <div className="detail-item">
                              <span className="detail-icon">💰</span>
                              <span>
                                {candidate.pricing.estimate.min_total?.amount} - {candidate.pricing.estimate.max_total?.amount} {candidate.pricing.estimate.min_total?.currency}
                              </span>
                            </div>
                          )}
                          {candidate.tasker?.stats && (
                            <div className="detail-item">
                              <span className="detail-icon">📊</span>
                              <span>
                                قبول: {(candidate.tasker.stats.acceptance_rate * 100).toFixed(0)}% | 
                                إكمال: {(candidate.tasker.stats.completion_rate * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="candidate-actions">
                        <button
                          className="select-tasker-btn"
                          onClick={() => handleSelectTasker(candidate.tasker?.user_id)}
                        >
                          اختر هذا العامل
                        </button>
                        <button
                          className="view-profile-btn"
                          onClick={() => {
                            // Could navigate to tasker profile page or show modal
                            alert(`ملف ${candidate.tasker?.full_name} الشخصي`);
                          }}
                        >
                          عرض الملف الشخصي
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  <p>لا يوجد عمال متاحون حالياً</p>
                  <button
                    onClick={() => loadCandidates()}
                    className="primary-btn"
                    style={{ marginTop: '1rem' }}
                  >
                    تحديث
                  </button>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>اضغط على الزر أعلاه لعرض العمال المتاحين</p>
              </div>
            )}
          </div>
        )}

        <div className="task-actions">
          {/* Show actions for task owner (client) */}
          {isTaskOwner && (
            <>
              {task.state === 'draft' && (
                <button
                  onClick={() => taskAPI.post(taskId).then(() => loadTask())}
                  className="primary-btn"
                >
                  {t('task.postTask')}
                </button>
              )}
              {['draft', 'posted', 'matching'].includes(task.state) && (
                <button onClick={handleCancel} className="danger-btn">
                  إلغاء المهمة
                </button>
              )}
            </>
          )}
          
          {/* Show accept button for taskers viewing posted/matching tasks */}
          {user?.role === 'tasker' && (task.state === 'posted' || task.state === 'matching') && (
            <button onClick={handleAccept} className="primary-btn">
              قبول المهمة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPage;
