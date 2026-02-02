import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function TaskerApplicationStatusPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [nationalIdLast4, setNationalIdLast4] = useState('');
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

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
      if (data?.national_id_last4) setNationalIdLast4(data.national_id_last4);
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

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    const trimmed = nationalIdLast4.replace(/\D/g, '').slice(0, 4);
    if (trimmed.length !== 4) {
      setError(isAr ? 'أدخل 4 أرقام من الرقم القومي' : 'Enter 4 digits of national ID');
      return;
    }
    try {
      setVerificationLoading(true);
      setError('');
      setSuccess('');
      await taskerAPI.submitVerification(trimmed);
      setVerificationSubmitted(true);
      setSuccess(isAr ? 'تم إرسال بيانات التحقق للمراجعة' : 'Verification info submitted for review');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit verification');
    } finally {
      setVerificationLoading(false);
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

      {status.applied && !isVerified && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>{isAr ? 'التحقق من الهوية (اختياري)' : 'Identity verification (optional)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">
              {isAr ? 'أدخل آخر 4 أرقام من الرقم القومي لمساعدة المراجع في التحقق من هويتك.' : 'Enter the last 4 digits of your national ID to help reviewers verify your identity.'}
            </p>
            {!verificationSubmitted && !status.national_id_last4 ? (
              <form onSubmit={handleSubmitVerification} className="flex gap-2 flex-wrap items-end">
                <div className="grid gap-1">
                  <Label htmlFor="national_id_last4">{isAr ? 'آخر 4 أرقام' : 'Last 4 digits'}</Label>
                  <Input
                    id="national_id_last4"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={nationalIdLast4}
                    onChange={(e) => setNationalIdLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-24"
                  />
                </div>
                <Button type="submit" disabled={verificationLoading}>
                  {verificationLoading ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال' : 'Submit')}
                </Button>
              </form>
            ) : (
              <p className="text-slate-600 text-sm">
                {isAr ? 'تم إرسال بيانات التحقق.' : 'Verification info submitted.'}
                {status.national_id_last4 && ` (••••${status.national_id_last4})`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TaskerApplicationStatusPage;
