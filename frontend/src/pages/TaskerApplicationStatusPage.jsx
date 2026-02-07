import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function TaskerApplicationStatusPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const isAr = i18n.language?.startsWith('ar');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskerAPI.getApplicationStatus();
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load application status');
      setStatus({ applied: false });
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    try {
      setResubmitLoading(true);
      setError('');
      setSuccess('');
      await taskerAPI.resubmitApplication();
      setSuccess(isAr ? 'تم إعادة تقديم طلبك للمراجعة' : 'Application resubmitted for review');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to resubmit');
    } finally {
      setResubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!status?.applied) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>{isAr ? 'حالة التقديم' : 'Application status'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              {isAr ? 'لم تتقدم بعد كعامل. قم بإكمال ملفك الشخصي أو التقديم من صفحة "أصبح مهمات".' : 'You have not applied as a tasker yet. Complete your profile or apply from the Become a tasker page.'}
            </p>
            <Button onClick={() => navigate('/dashboard/tasker/profile')}>
              {isAr ? 'الذهاب إلى الملف الشخصي' : 'Go to profile'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRejected = !!status.rejected_at;
  const isVerified = status.status === 'verified' || status.status === 'active';

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        {isAr ? 'حالة التحقق' : 'Verification status'}
      </h1>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
          {success}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>
            {isVerified
              ? (isAr ? 'تم التحقق من حسابك' : 'Your account is verified')
              : isRejected
                ? (isAr ? 'تم رفض طلبك' : 'Your application was rejected')
                : (isAr ? 'قيد المراجعة' : 'Under review')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            {isVerified && (isAr ? 'يمكنك الآن استقبال المهام والعروض من العملاء.' : 'You can now receive tasks and offers from clients.')}
            {isRejected && !isVerified && (
              <>
                {isAr ? 'سبب الرفض: ' : 'Reason: '}
                <span className="font-medium text-slate-800">{status.rejection_reason || (isAr ? '—' : '—')}</span>
                {status.rejected_at && (
                  <span className="block text-sm text-slate-500 mt-1">
                    {new Date(status.rejected_at).toLocaleString(isAr ? 'ar-EG' : 'en')}
                  </span>
                )}
              </>
            )}
            {!isVerified && !isRejected && (isAr ? 'سيقوم فريقنا بمراجعة طلبك والتحقق من هويتك. قد نتواصل معك إذا احتجنا لمزيد من المعلومات.' : 'Our team will review your application and verify your identity. We may contact you if we need more information.')}
          </p>

          {isRejected && !isVerified && (
            <Button onClick={handleResubmit} disabled={resubmitLoading}>
              {resubmitLoading ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إعادة التقديم للمراجعة' : 'Resubmit for review')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TaskerApplicationStatusPage;
