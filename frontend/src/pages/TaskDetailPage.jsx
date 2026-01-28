import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Star, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { taskAPI, bidAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import ReviewForm from '@/components/ReviewForm';
import { services } from '@/data/services';

function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [availableTaskers, setAvailableTaskers] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ amount: '', message: '' });
  const [submittingQuote, setSubmittingQuote] = useState(false);
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

      // Load bids if task is posted and client owns it (show any pending quotes)
      if ((taskData.state === 'posted' || taskData.state === 'matching') && taskData.client_id === user?.id && !taskData.assigned_tasker) {
        loadBids();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const loadBids = async () => {
    if (!taskId || !user) return;
    try {
      setBidsLoading(true);
      const data = await taskAPI.getBids(taskId);
      setBids(data.bids || []);
    } catch (err) {
      console.error('Failed to load bids:', err);
    } finally {
      setBidsLoading(false);
    }
  };

  const loadAvailableTaskers = async () => {
    if (!taskId || !user) return;
    try {
      setCandidatesLoading(true);
      const data = await taskAPI.getAvailableTaskers(taskId);
      setAvailableTaskers(data.items || []);
      setShowCandidates(true);
      await loadBids();
    } catch (err) {
      console.error('Failed to load available taskers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load available taskers');
      setAvailableTaskers([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleRequestQuote = async (taskerId) => {
    try {
      await taskAPI.requestQuote(taskId, taskerId);
      setError('');
      alert(i18n.language === 'ar' ? 'تم طلب السعر من هذا العامل. سيتم إشعاره لتقديم تكلفته.' : 'Quote requested. Tasker will be notified to propose their cost.');
      await loadBids();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to request quote');
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!window.confirm(i18n.language === 'ar' ? 'قبول هذا العرض؟' : 'Accept this quote?')) return;
    try {
      await bidAPI.accept(bidId);
      setError('');
      alert(i18n.language === 'ar' ? 'تم قبول العرض. في انتظار تأكيد العامل.' : 'Quote accepted. Waiting for tasker to confirm.');
      await loadTask();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept quote');
    }
  };

  const handleDeclineBid = async (bidId) => {
    if (!window.confirm(i18n.language === 'ar' ? 'رفض هذا العرض؟' : 'Decline this quote?')) return;
    try {
      await bidAPI.decline(bidId);
      await loadBids();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to decline quote');
    }
  };

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    const amount = parseInt(quoteForm.amount, 10);
    if (!amount || amount <= 0) {
      setError(i18n.language === 'ar' ? 'أدخل المبلغ' : 'Enter amount');
      return;
    }
    try {
      setSubmittingQuote(true);
      await bidAPI.submit(taskId, { amount, message: quoteForm.message || undefined });
      setError('');
      setQuoteForm({ amount: '', message: '' });
      alert(i18n.language === 'ar' ? 'تم إرسال السعر للعميل.' : 'Quote sent to client.');
      await loadTask();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const loadCandidates = async (taskOverride = null) => {
    const ctx = taskOverride || task;
    if (!ctx || !user || ctx.client_id !== user.id) return;
    try {
      setCandidatesLoading(true);
      const response = await taskAPI.getCandidates(taskId);
      setCandidates(response.items || []);
      setShowCandidates(true);
      setError('');
    } catch (err) {
      console.error('Failed to load candidates:', err);
      const errorMsg = err.response?.data?.error?.message || 'Failed to load available taskers';
      setError(i18n.language === 'ar' ? `تعذر تحميل العمال المتاحين: ${errorMsg}` : errorMsg);
      setShowCandidates(true);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه المهمة؟')) return;

    try {
      await taskAPI.cancel(taskId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to cancel task');
    }
  };

  const handleAccept = async () => {
    if (!window.confirm('هل أنت متأكد من قبول هذه المهمة؟')) return;

    try {
      await taskAPI.accept(taskId);
      setError('');
      alert(i18n.language === 'ar' ? 'تم قبول المهمة بنجاح!' : 'Task accepted!');
      navigate('/dashboard/tasker/bookings');
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
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 text-red-800 p-4">{error}</div>
        <Link to="/dashboard"><Button variant="outline" className="mt-4">← {i18n.language === 'ar' ? 'رجوع' : 'Back'}</Button></Link>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">{i18n.language === 'ar' ? 'المهمة غير موجودة' : 'Task not found'}</p>
        <Link to="/dashboard"><Button variant="outline">← {i18n.language === 'ar' ? 'رجوع' : 'Back'}</Button></Link>
      </div>
    );
  }

  const service = services.find((s) => s.id === task.category);
  const categoryName = service ? (i18n.language === 'ar' ? service.nameAr : service.name) : task.category;
  const categoryIcon = service?.icon ?? '📋';
  const categoryImage = service?.image;
  const averagePrice = service?.averagePrice ?? (task.pricing?.estimate
    ? `${task.pricing.estimate.min_total?.amount}–${task.pricing.estimate.max_total?.amount} ${task.pricing.estimate.min_total?.currency}`
    : null);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1">
        {/* Header — same vibe as /services/cleaning */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/dashboard" className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors">
              <ArrowLeft className="mr-2" size={20} />
              {i18n.language === 'ar' ? 'العودة إلى المهام' : 'Back to my tasks'}
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                ['posted', 'matching'].includes(task.state) ? 'bg-amber-100 text-amber-800' :
                task.state === 'completed' || task.state === 'reviewed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {getStateLabel(task.state)}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-6xl mb-4">{categoryIcon}</div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{categoryName}</h1>
                <p className="text-xl text-gray-700 mb-4">{task.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  {averagePrice && (
                    <>
                      <span className="font-semibold">{averagePrice}</span>
                      <span className="text-gray-400">•</span>
                    </>
                  )}
                  <span className="flex items-center gap-2">
                    <MapPin size={18} className="text-gray-400" />
                    {task.location?.address || task.location?.city}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">
                  {new Date(task.schedule?.starts_at || task.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                  {task.schedule?.flexibility_minutes > 0 && (
                    <span> ({t('task.flexibility')}: {task.schedule.flexibility_minutes} {t('task.minutes')})</span>
                  )}
                </p>
              </div>
              {categoryImage && (
                <div>
                  <img src={categoryImage} alt={categoryName} className="rounded-2xl shadow-2xl w-full object-cover max-h-64 md:max-h-80" />
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="rounded-lg bg-red-50 text-red-800 p-4 text-sm">{error}</div>
          </div>
        )}

        {/* Edit description/schedule — compact */}
        {isTaskOwner && ['draft', 'posted', 'matching'].includes(task.state) && (
          <section className="py-6 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {isEditing ? (
                <Card className="p-6">
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg mb-4 min-h-[100px]"
                    placeholder={t('task.description')}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">{t('task.startTime')}</span>
                      <input
                        type="datetime-local"
                        value={editFormData.starts_at}
                        onChange={(e) => setEditFormData({ ...editFormData, starts_at: e.target.value })}
                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">{t('task.flexibilityMinutes')}</span>
                      <input
                        type="number"
                        value={editFormData.flexibility_minutes}
                        onChange={(e) => setEditFormData({ ...editFormData, flexibility_minutes: parseInt(e.target.value, 10) || 0 })}
                        className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                        min="0"
                      />
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveEdit} className="bg-teal-600 hover:bg-teal-700">{t('task.save')}</Button>
                    <Button variant="outline" onClick={handleCancelEdit}>{t('task.cancel')}</Button>
                  </div>
                </Card>
              ) : (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleEdit}>{t('task.edit')}</Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Assigned tasker — card style */}
        {isTaskOwner && task.assigned_tasker && (
          <section className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {i18n.language === 'ar' ? 'العامل المكلف' : 'Assigned Tasker'}
              </h2>
              <Card className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback>
                      {(task.assigned_tasker.full_name || 'T').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{task.assigned_tasker.full_name}</h3>
                      {task.assigned_tasker.verification?.is_verified && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-800">✓ {i18n.language === 'ar' ? 'موثق' : 'Verified'}</span>
                      )}
                      {task.assigned_tasker.booking_status === 'offered' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          ⏳ {i18n.language === 'ar' ? 'في انتظار القبول' : 'Waiting for acceptance'}
                        </span>
                      )}
                      {task.assigned_tasker.booking_status === 'accepted' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800">✓ {i18n.language === 'ar' ? 'تم القبول' : 'Accepted'}</span>
                      )}
                    </div>
                    {task.assigned_tasker.booking_status === 'offered' && (
                      <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="font-medium text-amber-800">
                          ⏳ {i18n.language === 'ar' ? 'في انتظار رد العامل على العرض' : 'Waiting for tasker to accept or decline.'}
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          {i18n.language === 'ar' ? 'سيتم إشعارك عند قبول أو رفض العرض' : 'You’ll be notified when they respond.'}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Star className="text-yellow-500 fill-yellow-500" size={16} />
                        {task.assigned_tasker.rating?.average?.toFixed(1) || '0.0'} ({task.assigned_tasker.rating?.count || 0} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})
                      </span>
                      {task.assigned_tasker.stats && (
                        <span>
                          {i18n.language === 'ar' ? 'قبول' : 'Acceptance'} {(task.assigned_tasker.stats.acceptance_rate * 100).toFixed(0)}% · {i18n.language === 'ar' ? 'إكمال' : 'Completion'} {(task.assigned_tasker.stats.completion_rate * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {task.assigned_tasker.bio && <p className="text-gray-600 mb-2">{task.assigned_tasker.bio}</p>}
                    {task.assigned_tasker.skills?.length > 0 && (
                      <p className="text-sm text-gray-600 mb-4">
                        <strong>{i18n.language === 'ar' ? 'المهارات:' : 'Skills:'}</strong> {task.assigned_tasker.skills.join(', ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {task.assigned_tasker.booking_id && (
                        <Link to={`/dashboard/messages?booking=${task.assigned_tasker.booking_id}`}>
                          <Button className="bg-teal-600 hover:bg-teal-700">💬 {t('messages.title') || (i18n.language === 'ar' ? 'رسالة' : 'Message')}</Button>
                        </Link>
                      )}
                      <Link
                        to={`/dashboard/taskers/${task.assigned_tasker.user_id}`}
                        state={{ from: `/dashboard/tasks/${taskId}` }}
                      >
                        <Button variant="outline">{i18n.language === 'ar' ? 'عرض الملف الشخصي' : 'View profile'}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}

        {isAssignedTasker && task.assigned_tasker?.booking_id && (
          <section className="py-6 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Link to={`/dashboard/messages?booking=${task.assigned_tasker.booking_id}`}>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">💬 {t('messages.title') || (i18n.language === 'ar' ? 'رسالة العميل' : 'Message client')}</Button>
              </Link>
            </div>
          </section>
        )}

        {/* Bid-based: Quotes for this task + Choose taskers & request quote */}
        {isTaskOwner && (task.state === 'posted' || task.state === 'matching') && !task.assigned_tasker && (
          <section className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {i18n.language === 'ar' ? 'العروض والطلبات' : 'Quotes & choose tasker'}
              </h2>

              {/* Quotes received */}
              {bids.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {i18n.language === 'ar' ? 'العروض الواردة' : 'Quotes received'}
                  </h3>
                  {bidsLoading ? (
                    <div className="animate-pulse h-24 bg-gray-100 rounded-lg" />
                  ) : (
                    <div className="space-y-4">
                      {bids.map((b) => (
                        <Card key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-900">{b.tasker_name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Star className="text-yellow-500 fill-yellow-500" size={14} />
                              {b.rating?.toFixed(1) || '—'} ({b.review_count ?? 0} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})
                            </div>
                            {b.status === 'requested' && (
                              <p className="text-amber-700 text-sm mt-2">
                                {i18n.language === 'ar' ? 'في انتظار العامل لتقديم السعر' : 'Waiting for tasker to propose cost'}
                              </p>
                            )}
                            {b.status === 'pending' && b.amount != null && (
                              <p className="text-gray-800 font-semibold mt-2">
                                {b.amount} {b.currency || 'EGP'}
                                {b.message && <span className="block text-sm font-normal text-gray-600 mt-1">{b.message}</span>}
                              </p>
                            )}
                          </div>
                          {b.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => handleAcceptBid(b.id)}>
                                {i18n.language === 'ar' ? 'قبول' : 'Accept'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeclineBid(b.id)}>
                                {i18n.language === 'ar' ? 'رفض' : 'Decline'}
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Choose taskers & request quote */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {i18n.language === 'ar' ? 'اختر عاملاً واطلب سعره' : 'Choose a tasker and request a quote'}
                </h3>
                {!showCandidates && !candidatesLoading && (
                  <div className="flex justify-center py-8">
                    <Button onClick={() => loadAvailableTaskers()} className="bg-teal-600 hover:bg-teal-700">
                      {i18n.language === 'ar' ? 'عرض العمال المتاحين' : 'Load available taskers'}
                    </Button>
                  </div>
                )}
                {candidatesLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-6 animate-pulse">
                        <div className="flex gap-6">
                          <div className="w-16 h-16 rounded-full bg-gray-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-5 w-32 bg-gray-200 rounded" />
                            <div className="h-4 w-48 bg-gray-100 rounded" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {showCandidates && !candidatesLoading && availableTaskers.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-600 mb-4">{i18n.language === 'ar' ? 'لا يوجد عاملون متاحون لهذه الفئة/المكان حالياً' : 'No taskers available for this category or area.'}</p>
                    <Button onClick={() => loadAvailableTaskers()} variant="outline">{i18n.language === 'ar' ? 'تحديث' : 'Refresh'}</Button>
                  </div>
                )}
                {showCandidates && !candidatesLoading && availableTaskers.length > 0 && (
                  <div className="space-y-4">
                    {availableTaskers.map((t) => {
                      const alreadyRequested = bids.some((b) => b.tasker_id === t.id && (b.status === 'requested' || b.status === 'pending'));
                      return (
                        <Card key={t.id} className="p-6 hover:shadow-lg transition-shadow">
                          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-14 h-14">
                                <AvatarFallback>{(t.name || t.full_name || 'T').slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-bold text-gray-900">{t.name || t.full_name || 'Tasker'}</h3>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Star className="text-yellow-500 fill-yellow-500" size={14} />
                                  {(t.rating ?? 0).toFixed(1)} ({t.reviews ?? 0} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700"
                                onClick={() => handleRequestQuote(t.id)}
                                disabled={alreadyRequested}
                              >
                                {alreadyRequested ? (i18n.language === 'ar' ? 'تم الطلب' : 'Quote requested') : (i18n.language === 'ar' ? 'طلب السعر' : 'Request quote')}
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/dashboard/taskers/${t.id}`} state={{ from: `/dashboard/tasks/${taskId}` }}>
                                  {i18n.language === 'ar' ? 'الملف' : 'Profile'}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tasker: Submit quote form when client requested a quote */}
        {user?.role === 'tasker' && task?.my_bid?.status === 'requested' && (
          <section className="py-8 bg-amber-50 border border-amber-200 rounded-xl max-w-2xl mx-auto px-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {i18n.language === 'ar' ? 'العميل طلب منك تقديم السعر' : 'Client requested a quote from you'}
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              {i18n.language === 'ar' ? 'أدخل التكلفة المقترحة واختيارياً رسالة، وسيتم إرسالها للعميل لقبولها أو رفضها.' : 'Enter your proposed cost and optionally a message. It will be sent to the client to accept or decline.'}
            </p>
            <form onSubmit={handleSubmitQuote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{i18n.language === 'ar' ? 'المبلغ' : 'Amount'} (EGP)</label>
                <input
                  type="number"
                  min="1"
                  value={quoteForm.amount}
                  onChange={(e) => setQuoteForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{i18n.language === 'ar' ? 'رسالة (اختياري)' : 'Message (optional)'}</label>
                <textarea
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" disabled={submittingQuote} className="bg-teal-600 hover:bg-teal-700">
                {submittingQuote ? (i18n.language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (i18n.language === 'ar' ? 'إرسال السعر للعميل' : 'Send quote to client')}
              </Button>
            </form>
          </section>
        )}

        {/* Review form */}
        {canReview && !hasReviewed && (
          <section className="py-12 bg-white border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {!showReviewForm ? (
                <Card className="p-8 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('task.review')}</h3>
                  <p className="text-gray-600 mb-4">
                    {isTaskOwner ? (t('task.rateTasker') || (i18n.language === 'ar' ? 'قيم العامل' : 'Rate the tasker')) : (t('task.rateClient') || (i18n.language === 'ar' ? 'قيم العميل' : 'Rate the client'))}
                  </p>
                  <Button onClick={() => setShowReviewForm(true)} className="bg-teal-600 hover:bg-teal-700">
                    {t('task.writeReview') || (i18n.language === 'ar' ? 'اكتب تقييم' : 'Write review')}
                  </Button>
                </Card>
              ) : (
                <ReviewForm
                  bookingId={task.assigned_tasker.booking_id}
                  revieweeName={isTaskOwner ? task.assigned_tasker.full_name : (t('task.client') || (i18n.language === 'ar' ? 'العميل' : 'Client'))}
                  onSuccess={() => {
                    setShowReviewForm(false);
                    setHasReviewed(true);
                    loadTask();
                    alert(t('task.reviewSubmitted') || (i18n.language === 'ar' ? 'تم إرسال التقييم بنجاح' : 'Review submitted'));
                  }}
                  onCancel={() => setShowReviewForm(false)}
                />
              )}
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="py-8 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-3">
            {isTaskOwner && task.state === 'draft' && (
              <Button onClick={() => taskAPI.post(taskId).then(() => loadTask())} className="bg-teal-600 hover:bg-teal-700">
                {t('task.postTask')}
              </Button>
            )}
            {isTaskOwner && ['draft', 'posted', 'matching'].includes(task.state) && (
              <Button variant="destructive" onClick={handleCancel}>
                {i18n.language === 'ar' ? 'إلغاء المهمة' : 'Cancel task'}
              </Button>
            )}
            {user?.role === 'tasker' && (task.state === 'posted' || task.state === 'matching') && (
              <Button onClick={handleAccept} className="bg-teal-600 hover:bg-teal-700">
                {i18n.language === 'ar' ? 'قبول المهمة' : 'Accept task'}
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TaskDetailPage;
