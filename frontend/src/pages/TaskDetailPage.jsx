import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI, taskerAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import ReviewForm from '../components/ReviewForm';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: '',
    starts_at: '',
    flexibility_minutes: 0,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskData = await taskAPI.get(taskId);
      setTask(taskData);

      // Initialize edit form data
      setEditFormData({
        description: taskData.description || '',
        starts_at: taskData.schedule?.starts_at 
          ? new Date(taskData.schedule.starts_at).toISOString().slice(0, 16)
          : '',
        flexibility_minutes: taskData.schedule?.flexibility_minutes || 0,
      });

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
      alert('تم إرسال العرض للعامل. في انتظار قبوله...');
      loadTask(); // Reload to show assigned tasker with pending status
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to select tasker');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original task data
    if (task) {
      setEditFormData({
        description: task.description || '',
        starts_at: task.schedule?.starts_at 
          ? new Date(task.schedule.starts_at).toISOString().slice(0, 16)
          : '',
        flexibility_minutes: task.schedule?.flexibility_minutes || 0,
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {
        description: editFormData.description,
      };

      if (editFormData.starts_at) {
        updates.schedule = {
          starts_at: new Date(editFormData.starts_at).toISOString(),
          flexibility_minutes: editFormData.flexibility_minutes,
        };
      }

      await taskAPI.update(taskId, updates);
      setIsEditing(false);
      setError('');
      await loadTask(); // Reload task to show updated data
      alert(t('task.editSuccess') || 'تم تحديث المهمة بنجاح');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update task');
    }
  };

  // Check if current user is the task owner (client)
  const isTaskOwner = task && user && task.client_id === user.id;
  
  // Check if current user is the assigned tasker
  const isAssignedTasker = task && user && task.assigned_tasker?.user_id === user.id;
  
  // Check if user can review (either task owner or assigned tasker)
  const canReview = (isTaskOwner || isAssignedTasker) && 
                    (task?.state === 'completed' || task?.state === 'reviewed') &&
                    task?.assigned_tasker?.booking_id;

  const getStateLabel = (state) => {
    const stateMap = {
      draft: t('task.draft'),
      posted: t('task.posted'),
      matching: t('task.matching'),
      accepted: t('task.accepted'),
      in_progress: t('task.inProgress'),
      completed: t('task.completed'),
      reviewed: t('task.reviewed') || 'تم التقييم',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3>{t('task.description')}</h3>
            {isTaskOwner && ['draft', 'posted'].includes(task.state) && !isEditing && (
              <button onClick={handleEdit} className="edit-btn">
                {t('task.edit')}
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="edit-form">
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="edit-textarea"
                rows="4"
              />
              <div className="edit-actions">
                <button onClick={handleSaveEdit} className="save-btn">
                  {t('task.save')}
                </button>
                <button onClick={handleCancelEdit} className="cancel-btn">
                  {t('task.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <p>{task.description}</p>
          )}
        </div>

        <div className="task-section">
          <h3>الموقع</h3>
          <p>📍 {task.location?.address || task.location?.city}</p>
          {task.location?.district && <p>المنطقة: {task.location.district}</p>}
        </div>

        <div className="task-section">
          <h3>{t('task.schedule')}</h3>
          {isEditing ? (
            <div className="edit-form">
              <label>
                {t('task.startTime')}
                <input
                  type="datetime-local"
                  value={editFormData.starts_at}
                  onChange={(e) => setEditFormData({ ...editFormData, starts_at: e.target.value })}
                  className="edit-input"
                />
              </label>
              <label>
                {t('task.flexibilityMinutes')}
                <input
                  type="number"
                  value={editFormData.flexibility_minutes}
                  onChange={(e) => setEditFormData({ ...editFormData, flexibility_minutes: parseInt(e.target.value) || 0 })}
                  className="edit-input"
                  min="0"
                />
              </label>
            </div>
          ) : (
            <p>
              {new Date(task.schedule?.starts_at || task.created_at).toLocaleString('ar-EG', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
              {task.schedule?.flexibility_minutes > 0 && (
                <span> ({t('task.flexibility')}: {task.schedule.flexibility_minutes} {t('task.minutes')})</span>
              )}
            </p>
          )}
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

        {/* Show assigned tasker if task has an assigned tasker (offered or accepted) */}
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
                  {/* Show booking status badge */}
                  {task.assigned_tasker.booking_status === 'offered' && (
                    <span className="status-badge status-offered" style={{ marginLeft: '0.5rem' }}>
                      ⏳ في انتظار القبول
                    </span>
                  )}
                  {task.assigned_tasker.booking_status === 'accepted' && (
                    <span className="status-badge status-accepted" style={{ marginLeft: '0.5rem' }}>
                      ✓ تم القبول
                    </span>
                  )}
                </div>
                <div className="tasker-rating">
                  ⭐ {task.assigned_tasker.rating?.average?.toFixed(1) || '0.0'} (
                  {task.assigned_tasker.rating?.count || 0} تقييم)
                </div>
              </div>
              {task.assigned_tasker.booking_status === 'offered' && (
                <div className="waiting-notice" style={{ 
                  padding: '1rem', 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffc107', 
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#856404' }}>
                    ⏳ في انتظار رد العامل على العرض
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
                    سيتم إشعارك عند قبول أو رفض العرض
                  </p>
                </div>
              )}
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
        {isTaskOwner && (task.state === 'posted' || task.state === 'matching') && !task.assigned_tasker && (
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

        {/* Show review form for completed tasks */}
        {canReview && !hasReviewed && (
          <div className="task-section">
            {!showReviewForm ? (
              <div className="review-prompt">
                <h3>{t('task.review')}</h3>
                <p>
                  {isTaskOwner 
                    ? (t('task.rateTasker') || 'قيم العامل')
                    : (t('task.rateClient') || 'قيم العميل')
                  }
                </p>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="primary-btn"
                >
                  {t('task.writeReview') || 'اكتب تقييم'}
                </button>
              </div>
            ) : (
              <ReviewForm
                bookingId={task.assigned_tasker.booking_id}
                revieweeName={
                  isTaskOwner 
                    ? task.assigned_tasker.full_name
                    : (t('task.client') || 'العميل')
                }
                onSuccess={() => {
                  setShowReviewForm(false);
                  setHasReviewed(true);
                  loadTask(); // Reload to refresh task state
                  alert(t('task.reviewSubmitted') || 'تم إرسال التقييم بنجاح');
                }}
                onCancel={() => setShowReviewForm(false)}
              />
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
