import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Star, User, Megaphone, Loader2, MessageCircle, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { taskAPI, taskerAPI, bidAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { getCategoryInfo } from '@/data/categoryInfo';
import { services } from '@/data/services';

export default function FindTaskerPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { i18n } = useTranslation();

  const [task, setTask] = useState(null);
  const [taskers, setTaskers] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskersLoading, setTaskersLoading] = useState(false);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(null);
  const [acceptingBid, setAcceptingBid] = useState(null);
  const [error, setError] = useState('');

  const isAr = i18n.language === 'ar';
  const categoryInfo = task?.category ? getCategoryInfo(services.find((s) => s.id === task.category) || { id: task.category }) : null;

  const loadTask = async () => {
    if (!taskId || !user) return;
    try {
      setLoading(true);
      setError('');
      const data = await taskAPI.get(taskId);
      if (data.client_id !== user.id) {
        setError(isAr ? 'غير مصرح' : 'Not authorized');
        navigate('/dashboard');
        return;
      }
      setTask(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || (isAr ? 'فشل تحميل المهمة' : 'Failed to load task'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskers = async () => {
    if (!task?.category) return;
    setTaskersLoading(true);
    try {
      const lat = task.location?.point?.lat ?? 30.0444;
      const lng = task.location?.point?.lng ?? 31.2357;
      const data = await taskerAPI.getAvailableByLocation(task.category, lat, lng);
      setTaskers(data.items || []);
    } catch (err) {
      console.error('Failed to load taskers:', err);
      toast({
        title: isAr ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message || (isAr ? 'فشل تحميل المهمات' : 'Failed to load taskers'),
        variant: 'destructive',
      });
    } finally {
      setTaskersLoading(false);
    }
  };

  const loadBids = async () => {
    if (!taskId || !user) return;
    setBidsLoading(true);
    try {
      const data = await taskAPI.getBids(taskId);
      setBids(data.bids || []);
    } catch (err) {
      console.error('Failed to load bids:', err);
    } finally {
      setBidsLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId, user?.id]);

  useEffect(() => {
    if (task) loadTaskers();
  }, [task?.id, task?.category, task?.location?.point?.lat, task?.location?.point?.lng]);

  useEffect(() => {
    if (task && (task.state === 'posted' || task.state === 'matching')) loadBids();
  }, [taskId, task?.state]);

  const handleGetBestOfferFromAll = async () => {
    if (!taskId || task?.state !== 'draft') return;
    setPosting(true);
    setError('');
    try {
      await taskAPI.post(taskId, { bid_mode: 'open_for_bids' });
      toast({
        title: isAr ? 'تم نشر المهمة للجميع!' : 'Task shared with all nearby taskers!',
        description: isAr ? 'سترى المهمة في لوحة التحكم بحالة «في انتظار العروض».' : 'You will see your task on the dashboard with status "Waiting for offers".',
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || (isAr ? 'فشل نشر المهمة' : 'Failed to post task'));
      toast({
        title: isAr ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message,
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const handleRequestQuote = async (taskerId) => {
    if (!taskId) return;
    setRequestingQuote(taskerId);
    try {
      if (task?.state === 'draft') {
        await taskAPI.post(taskId, { bid_mode: 'invite_only' });
        await loadTask();
      }
      await taskAPI.requestQuote(taskId, taskerId);
      toast({
        title: isAr ? 'تم إرسال طلب السعر!' : 'Quote requested!',
        description: isAr ? 'سيقوم المهمات بالرد قريباً.' : 'The tasker will respond shortly.',
      });
      await loadBids();
    } catch (err) {
      toast({
        title: isAr ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message || (isAr ? 'فشل طلب السعر' : 'Failed to request quote'),
        variant: 'destructive',
      });
    } finally {
      setRequestingQuote(null);
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!window.confirm(isAr ? 'قبول هذا العرض؟' : 'Accept this quote?')) return;
    setAcceptingBid(bidId);
    try {
      await bidAPI.accept(bidId);
      toast({
        title: isAr ? 'تم قبول العرض!' : 'Quote accepted!',
        description: isAr ? 'في انتظار تأكيد المهمات.' : 'Waiting for tasker to confirm.',
      });
      await loadTask();
      await loadBids();
    } catch (err) {
      toast({
        title: isAr ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message || (isAr ? 'فشل قبول العرض' : 'Failed to accept quote'),
        variant: 'destructive',
      });
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleDeclineBid = async (bidId) => {
    if (!window.confirm(isAr ? 'رفض هذا العرض؟' : 'Decline this quote?')) return;
    try {
      await bidAPI.decline(bidId);
      await loadBids();
    } catch (err) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.response?.data?.error?.message, variant: 'destructive' });
    }
  };

  if (loading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  const isDraft = task.state === 'draft';
  const isPosted = task.state === 'posted' || task.state === 'matching';
  const hasBids = bids.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAr ? 'لوحة التحكم' : 'Dashboard'}
        </Link>

        {/* Task summary */}
        <Card className="p-6 mb-6">
          <h1 className="text-xl font-bold text-foreground mb-2">
            {isAr ? 'المهمة' : 'Task'} · {categoryInfo ? (isAr ? categoryInfo.nameAr : categoryInfo.name) : task.category}
          </h1>
          <p className="text-muted-foreground text-sm line-clamp-2">{task.description}</p>
          {task.location?.address && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{task.location.address}</span>
            </div>
          )}
          <div className="mt-4">
            <Link to={`/dashboard/tasks/${taskId}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
              {isAr ? 'عرض تفاصيل المهمة' : 'View full task details'}
            </Link>
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {/* Get the best offer from all — top */}
        {isDraft && (
          <div className="mb-6">
            <Button
              onClick={handleGetBestOfferFromAll}
              disabled={posting}
              className="w-full h-12 text-base bg-teal-600 hover:bg-teal-700"
            >
              {posting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Megaphone className="w-5 h-5 mr-2" />
                  {isAr ? 'احصل على أفضل عرض من الجميع' : 'Get the best offer from all'}
                </>
              )}
            </Button>
            <p className="text-muted-foreground text-sm mt-2 text-center">
              {isAr ? 'يتم مشاركة المهمة مع جميع المهمات القريبين. كل واحد يرد بعرضه أو بأسئلة للمزيد من التفاصيل.' : 'Task is shared with all nearby taskers. Each can respond with an offer or questions for more details.'}
            </p>
          </div>
        )}

        {/* Offers & questions (bids) — when posted */}
        {isPosted && hasBids && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {isAr ? 'العروض والأسئلة' : 'Offers & questions'}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {isAr ? 'يمكنك الرد على الأسئلة أو رفع صورة/فيديو من صفحة المهمة، ثم اختيار أحد العروض.' : 'You can answer questions or upload image/video from the task page, then select one offer.'}
            </p>
            {bidsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarFallback>{(b.tasker_name || 'T').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{b.tasker_name}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          {(b.rating ?? 0).toFixed(1)} ({b.review_count ?? 0} {isAr ? 'تقييم' : 'reviews'})
                        </div>
                        {b.status === 'requested' && (
                          <p className="text-amber-700 text-sm mt-1">
                            {isAr ? 'في انتظار العامل لتقديم السعر' : 'Waiting for tasker to propose'}
                          </p>
                        )}
                        {b.status === 'pending' && (
                          <>
                            {b.amount != null && (
                              <p className="font-semibold text-foreground mt-1">
                                {b.amount} {b.currency || 'EGP'}
                              </p>
                            )}
                            {b.message && (
                              <p className="text-muted-foreground text-sm mt-1">{b.message}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() => handleAcceptBid(b.id)}
                          disabled={acceptingBid !== null}
                        >
                          {acceptingBid === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'قبول' : 'Accept')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeclineBid(b.id)}>
                          {isAr ? 'رفض' : 'Decline'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/tasks/${taskId}`}>
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {isAr ? 'الرد على الأسئلة' : 'Answer questions'}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/tasks/${taskId}`}>
                  <ImagePlus className="w-4 h-4 mr-1" />
                  {isAr ? 'رفع صورة/فيديو' : 'Upload image/video'}
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Nearby taskers (by distance) */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isAr ? 'المهمات القريبون منك (حسب المسافة)' : 'Nearby taskers (by distance)'}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {isAr ? 'يمكنك طلب سعر من مهمات محدد، أو استخدام الزر أعلاه لمشاركة المهمة مع الجميع.' : 'Request a quote from a specific tasker, or use the button above to share with all.'}
          </p>
          {taskersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
          ) : taskers.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {isAr ? 'لا يوجد مهمات متاحون لهذه الخدمة في منطقتك حالياً.' : 'No taskers available for this service in your area right now.'}
            </p>
          ) : (
            <ul className="space-y-4">
              {taskers.map((t) => {
                const alreadyRequested = bids.some((b) => b.tasker_id === t.id && (b.status === 'requested' || b.status === 'pending'));
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-teal-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarFallback>{(t.name || t.full_name || 'T').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{t.name || t.full_name || 'Tasker'}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {t.rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              {t.rating.toFixed(1)} ({t.reviews})
                            </span>
                          )}
                          {t.distance_km != null && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {t.distance_km.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={alreadyRequested ? 'secondary' : 'default'}
                        className={alreadyRequested ? '' : 'bg-teal-600 hover:bg-teal-700'}
                        onClick={() => !alreadyRequested && handleRequestQuote(t.id)}
                        disabled={alreadyRequested || requestingQuote !== null}
                      >
                        {requestingQuote === t.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : alreadyRequested ? (
                          (isAr ? 'تم الطلب' : 'Quote requested')
                        ) : (
                          (isAr ? 'طلب السعر' : 'Request quote')
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/dashboard/taskers/${t.id}`} state={{ from: `/dashboard/tasks/${taskId}/find-tasker` }}>
                          {isAr ? 'الملف' : 'Profile'}
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
