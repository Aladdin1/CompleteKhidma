import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { authAPI, userAPI, taskerAPI, mediaAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';

const CATEGORIES = [
  { key: 'cleaning', name: 'Cleaning', nameAr: 'تنظيف', symbol: '🧹' },
  { key: 'mounting', name: 'Mounting', nameAr: 'تركيب وتثبيت', symbol: '🔧' },
  { key: 'moving', name: 'Moving', nameAr: 'نقل وتعبئة', symbol: '📦' },
  { key: 'assembly', name: 'Assembly', nameAr: 'تركيب الأثاث', symbol: '🪑' },
  { key: 'delivery', name: 'Delivery', nameAr: 'توصيل', symbol: '🚚' },
  { key: 'handyman', name: 'Handyman', nameAr: 'سباك ونجار', symbol: '🔨' },
  { key: 'painting', name: 'Painting', nameAr: 'دهان', symbol: '🎨' },
  { key: 'plumbing', name: 'Plumbing', nameAr: 'سباكة', symbol: '🚿' },
  { key: 'electrical', name: 'Electrical', nameAr: 'كهرباء', symbol: '⚡' },
];

const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

function BecomeTaskerSignupPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth, updateUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Account creation
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState('phone'); // 'phone' or 'otp'

  // Step 2: Tasker application
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    bio: '',
    categories: [],
    skills: [],
    service_area: {
      center: { lat: 30.0444, lng: 31.2357 },
      radius_km: 10,
    },
  });

  const [emailError, setEmailError] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);

  // Steps 3 & 4: Verification documents
  const [idPhotoFront, setIdPhotoFront] = useState(null);
  const [idPhotoBack, setIdPhotoBack] = useState(null);
  const [criminalRecord, setCriminalRecord] = useState(null);
  const [docIds, setDocIds] = useState({ id_photo_front_id: null, id_photo_back_id: null, criminal_record_id: null });

  const isAr = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [isAr]);

  // If already tasker and on step 1 (hasn't started signup), redirect
  useEffect(() => {
    if (user?.role === 'tasker' && step === 1) {
      navigate('/dashboard/tasker', { replace: true });
    }
  }, [user, navigate, step]);

  // Pre-fill form from user when authenticated, fetch fresh data on step 2
  useEffect(() => {
    if (isAuthenticated && user && step === 2) {
      userAPI.getMe()
        .then((me) => {
          setFormData((prev) => ({
            ...prev,
            full_name: me.full_name || prev.full_name,
            email: me.email || prev.email,
          }));
          updateUser(me);
        })
        .catch(() => {});
    } else if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        email: user.email || prev.email,
      }));
    }
  }, [isAuthenticated, user, step]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authAPI.requestOTP(phone, isAr ? 'ar-EG' : 'en-US');
      setSuccess(t('auth.otpSent'));
      setAuthStep('otp');
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        setError(err.response?.data?.error?.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceId = getDeviceId();
      const response = await authAPI.verifyOTP(phone, otp, deviceId);
      setAuth(response.user, response.access_token, response.refresh_token);
      setSuccess(isAr ? 'تم إنشاء حسابك بنجاح!' : 'Account created successfully!');
      setTimeout(() => setStep(2), 800);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('auth.invalidOTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/become-tasker/signup')}`;
      await authAPI.initiateGoogleOAuth(redirectUri);
    } catch (err) {
      setError(err.message || 'Failed to initiate Google sign-in. Please use phone authentication.');
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/become-tasker/signup')}`;
      await authAPI.initiateFacebookOAuth(redirectUri);
    } catch (err) {
      setError(err.message || 'Failed to initiate Facebook sign-in. Please use phone authentication.');
      setLoading(false);
    }
  };

  // OAuth callback: user lands here after OAuth - move to step 2
  useEffect(() => {
    if (isAuthenticated && step === 1 && !phone) {
      setStep(2);
    }
  }, [isAuthenticated, step, phone]);

  const handleCategoryToggle = (key) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(key)
        ? prev.categories.filter((c) => c !== key)
        : [...prev.categories, key],
    }));
  };

  const handleSkillAdd = (e) => {
    e?.preventDefault();
    const input = document.getElementById('new-skill');
    const val = (input?.value ?? '').trim();
    if (val && !formData.skills.includes(val)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, val] }));
      if (input) input.value = '';
    }
  };

  const handleSkillRemove = (skill) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleEmailBlur = async () => {
    const email = formData.email?.trim();
    setEmailError('');
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setEmailChecking(true);
    try {
      const { available } = await userAPI.checkEmail(email, user?.id);
      if (!available) {
        setEmailError(isAr ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered');
      }
    } catch (err) {
      // Ignore network errors for blur check
    } finally {
      setEmailChecking(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');

    if (emailError) return;

    // Pre-submit email check if email is provided
    const email = formData.email?.trim();
    if (email) {
      try {
        const { available } = await userAPI.checkEmail(email, user?.id);
        if (!available) {
          setEmailError(isAr ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered');
          return;
        }
      } catch (err) {
        // Continue if check fails (e.g. network)
      }
    }

    setLoading(true);

    try {
      // Build update payload - only include non-empty values
      const userUpdates = { full_name: formData.full_name.trim() };
      if (email) userUpdates.email = email;
      await userAPI.updateMe(userUpdates);
      updateUser({ ...user, ...userUpdates });

      // Create or update tasker profile with our data
      const status = await taskerAPI.getApplicationStatus();
      if (status?.applied === false) {
        // Apply with full profile data - this creates the tasker profile with our data
        await taskerAPI.apply({
          categories: formData.categories,
          skills: formData.skills,
          bio: formData.bio?.trim() || undefined,
          service_area: formData.service_area,
        });
      }

      // Change role to tasker (profile already exists from apply, so ON CONFLICT DO NOTHING)
      const result = await userAPI.becomeTasker();
      const accessToken = result.access_token || result.accessToken;
      const refreshToken = result.refresh_token || result.refreshToken;
      const userData = result.user;
      if (accessToken && refreshToken && userData) {
        setAuth(userData, accessToken, refreshToken);
      } else {
        updateUser({ role: 'tasker', ...userData });
        // Fallback: refresh token to get access token with correct role (avoids role mismatch)
        try {
          const refreshResult = await authAPI.refreshToken(localStorage.getItem('refresh_token'));
          const newAccessToken = refreshResult?.access_token || refreshResult?.accessToken;
          if (newAccessToken) {
            setAuth(userData || { ...user, role: 'tasker' }, newAccessToken, localStorage.getItem('refresh_token'));
          }
        } catch (_) {
          /* ignore */
        }
      }

      // If they already had a profile, update it with our form data (must be tasker first)
      if (status?.applied !== false) {
        await taskerAPI.updateProfile({
          bio: formData.bio?.trim(),
          categories: formData.categories,
          skills: formData.skills,
          service_area: formData.service_area,
        });
      }

      setSuccess(isAr ? 'تم تقديم طلبك بنجاح!' : 'Application submitted successfully!');
      setStep(3);
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || err.message;
      if (errCode === 'EMAIL_TAKEN' || (err.response?.status === 409 && msg?.toLowerCase().includes('email'))) {
        setEmailError(msg || (isAr ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered'));
      } else if (errCode === 'ALREADY_APPLIED' || (err.response?.status === 409 && msg?.toLowerCase().includes('already applied'))) {
        // Already applied - just become tasker and go to step 3
        try {
          const result = await userAPI.becomeTasker();
          const accessToken = result.access_token || result.accessToken;
          const refreshToken = result.refresh_token || result.refreshToken;
          const userData = result.user;
          if (accessToken && refreshToken && userData) {
            setAuth(userData, accessToken, refreshToken);
          } else {
            updateUser({ role: 'tasker', ...userData });
            try {
              const refreshResult = await authAPI.refreshToken(localStorage.getItem('refresh_token'));
              const newAccessToken = refreshResult?.access_token || refreshResult?.accessToken;
              if (newAccessToken) {
                setAuth(userData || { ...user, role: 'tasker' }, newAccessToken, localStorage.getItem('refresh_token'));
              }
            } catch (_) {
              /* ignore */
            }
          }
          setSuccess(isAr ? 'تم تقديم طلبك بنجاح!' : 'Application submitted successfully!');
          setStep(3);
        } catch (err2) {
          setError(err2.response?.data?.error?.message || 'Failed to complete application');
        }
      } else {
        setError(msg || 'Failed to submit application');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Next = async () => {
    setError('');
    if (!idPhotoFront || !idPhotoBack) {
      setError(isAr ? 'يرجى رفع صورة الهوية من الأمام والخلف' : 'Please upload both ID photos (front and back)');
      return;
    }
    setLoading(true);
    try {
      const [frontRes, backRes] = await Promise.all([
        mediaAPI.upload(idPhotoFront, 'image'),
        mediaAPI.upload(idPhotoBack, 'image'),
      ]);
      setDocIds((prev) => ({
        ...prev,
        id_photo_front_id: frontRes.id,
        id_photo_back_id: backRes.id,
      }));
      setSuccess(isAr ? 'تم رفع صور الهوية' : 'ID photos uploaded');
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload ID photos');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Submit = async () => {
    setError('');
    if (!criminalRecord) {
      setError(isAr ? 'يرجى رفع وثيقة السجل الجنائي' : 'Please upload your criminal record document');
      return;
    }
    setLoading(true);
    try {
      const recordRes = await mediaAPI.upload(criminalRecord, 'document');
      const payload = {
        ...docIds,
        criminal_record_id: recordRes.id,
      };
      await taskerAPI.submitVerificationDocuments(payload);
      setSuccess(isAr ? 'تم إرسال جميع المستندات بنجاح!' : 'All documents submitted successfully!');
      setTimeout(() => navigate('/dashboard/tasker'), 1200);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: isAr ? 'إنشاء حساب' : 'Create account' },
    { id: 2, label: isAr ? 'الملف الشخصي والتقديم' : 'Profile & apply' },
    { id: 3, label: isAr ? 'صور الهوية' : 'ID photos' },
    { id: 4, label: isAr ? 'السجل الجنائي' : 'Criminal record' },
  ];

  const canProceedStep1 = isAuthenticated || (authStep === 'otp' && otp.length === 6);
  const canSubmitStep2 =
    formData.full_name?.trim() &&
    formData.categories.length >= 1 &&
    !emailError;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1">
        {/* Hero - same style as LandingPage */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
              {isAr ? 'كن مهمات' : 'Become a Tasker'}
            </h1>
            <p className="text-lg text-gray-600 text-center mb-8">
              {isAr ? 'اتبع الخطوات لإنشاء حسابك والتقديم' : 'Follow the steps to create your account and apply'}
            </p>

            {/* Stepper */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      step > s.id
                        ? 'bg-teal-600 text-white'
                        : step === s.id
                        ? 'bg-teal-600 text-white ring-4 ring-teal-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.id ? <CheckCircle size={18} /> : s.id}
                  </div>
                  <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${step >= s.id ? 'text-teal-600' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className={`w-4 sm:w-12 h-0.5 mx-1 sm:mx-2 ${step > s.id ? 'bg-teal-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            <Card className="bg-white shadow-xl rounded-2xl border-0 overflow-hidden">
              <div className="p-8 sm:p-10">
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200">
                    {success}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    {!isAuthenticated ? (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                          {isAr ? 'إنشاء حسابك' : 'Create your account'}
                        </h2>
                        <div className="space-y-4">
                          <div className="grid gap-3">
                            <Button
                              type="button"
                              onClick={handleGoogleSignIn}
                              variant="outline"
                              className="w-full h-12"
                              size="lg"
                              disabled={loading}
                            >
                              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                              {isAr ? 'المتابعة مع Google' : 'Continue with Google'}
                            </Button>
                            <Button
                              type="button"
                              onClick={handleFacebookSignIn}
                              variant="outline"
                              className="w-full h-12"
                              size="lg"
                              disabled={loading}
                            >
                              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                              {isAr ? 'المتابعة مع Facebook' : 'Continue with Facebook'}
                            </Button>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">
                                {isAr ? 'أو المتابعة بالهاتف' : 'Or continue with phone'}
                              </span>
                            </div>
                          </div>
                          {authStep === 'phone' ? (
                            <form onSubmit={handleRequestOTP} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="phone">{t('auth.phoneNumber')}</Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  placeholder="+201234567890"
                                  required
                                  dir="ltr"
                                  disabled={loading}
                                  className="h-12"
                                />
                              </div>
                              <Button type="submit" disabled={loading} className="w-full h-12" size="lg">
                                {loading ? '...' : t('auth.requestOTP')}
                              </Button>
                            </form>
                          ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="otp">{t('auth.enterOTP')}</Label>
                                <Input
                                  id="otp"
                                  type="text"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  placeholder="123456"
                                  maxLength={6}
                                  required
                                  dir="ltr"
                                  disabled={loading}
                                  className="h-12 text-center text-2xl tracking-widest"
                                />
                              </div>
                              <Button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full h-12"
                                size="lg"
                              >
                                {loading ? '...' : t('auth.verifyOTP')}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setAuthStep('phone');
                                  setOtp('');
                                  setError('');
                                  setSuccess('');
                                }}
                              >
                                {t('auth.changePhone')}
                              </Button>
                            </form>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="mx-auto text-teal-600 mb-4" size={48} />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {isAr ? 'مرحباً!' : 'Welcome!'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                          {isAr ? 'أنت مسجل الدخول. تابع للخطوة التالية.' : 'You are signed in. Continue to the next step.'}
                        </p>
                        <Button
                          onClick={() => setStep(2)}
                          className="bg-teal-600 hover:bg-teal-700 h-12 px-8"
                        >
                          {isAr ? 'التالي' : 'Next'}
                          <ArrowRight className="ml-2" size={20} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <form onSubmit={handleApply} className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isAr ? 'أكمل ملفك الشخصي والتقديم' : 'Complete your profile and apply'}
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">{isAr ? 'الاسم الكامل' : 'Full name'}</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            setEmailError('');
                          }}
                          onBlur={handleEmailBlur}
                          placeholder="email@example.com"
                          dir="ltr"
                          className={`h-12 ${emailError ? 'border-destructive' : ''}`}
                          disabled={emailChecking}
                        />
                        {emailError && (
                          <p className="text-sm text-destructive">{emailError}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">{isAr ? 'نبذة عنك' : 'About you'}</Label>
                      <textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder={isAr ? 'أخبرنا عن مهاراتك وخبراتك' : 'Tell us about your skills and experience'}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>{isAr ? 'الخدمات التي تقدمها (اختر واحدة على الأقل)' : 'Services you offer (select at least one)'}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => handleCategoryToggle(cat.key)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                              formData.categories.includes(cat.key)
                                ? 'border-teal-600 bg-teal-50 text-teal-700'
                                : 'border-gray-200 hover:border-teal-300'
                            }`}
                          >
                            <span className="text-xl">{cat.symbol}</span>
                            <span className="text-sm font-medium">{isAr ? cat.nameAr : cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{isAr ? 'مهارات إضافية' : 'Additional skills'}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-skill"
                          placeholder={isAr ? 'أضف مهارة' : 'Add a skill'}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd(e))}
                          className="flex-1 h-12"
                        />
                        <Button type="button" variant="outline" onClick={handleSkillAdd}>
                          {isAr ? 'إضافة' : 'Add'}
                        </Button>
                      </div>
                      {formData.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.skills.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-sm"
                            >
                              {s}
                              <button
                                type="button"
                                onClick={() => handleSkillRemove(s)}
                                className="hover:text-teal-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{isAr ? 'منطقة الخدمة (كم)' : 'Service area radius (km)'}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={formData.service_area.radius_km}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            service_area: {
                              ...formData.service_area,
                              radius_km: parseInt(e.target.value, 10) || 10,
                            },
                          })
                        }
                        className="h-12 w-32"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="sm:order-2"
                      >
                        <ArrowLeft className="mr-2" size={20} />
                        {isAr ? 'السابق' : 'Back'}
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || !canSubmitStep2}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 h-12"
                      >
                        {loading
                          ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                          : (isAr ? 'تقديم الطلب' : 'Submit application')}
                        <ArrowRight className="ml-2" size={20} />
                      </Button>
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isAr ? 'رفع صور الهوية' : 'Upload ID photos'}
                    </h2>
                    <p className="text-gray-600">
                      {isAr ? 'ارفع صوراً واضحة من وجهي بطاقة الهوية الوطنية (أمامي وخلفي)' : 'Upload clear photos of both sides of your national ID card'}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>{isAr ? 'الوجه الأمامي' : 'Front side'}</Label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id="id-front"
                            className="hidden"
                            onChange={(e) => setIdPhotoFront(e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor="id-front"
                            className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer transition-colors"
                          >
                            {idPhotoFront ? (
                              <>
                                <img src={URL.createObjectURL(idPhotoFront)} alt="ID front" className="h-32 w-full object-contain rounded-lg" />
                                <span className="text-sm text-teal-600 mt-2">{idPhotoFront.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setIdPhotoFront(null); }}
                                  className="mt-1 text-sm text-destructive hover:underline"
                                >
                                  {isAr ? 'إزالة' : 'Remove'}
                                </button>
                              </>
                            ) : (
                              <>
                                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">{isAr ? 'اختر الصورة' : 'Choose image'}</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{isAr ? 'الوجه الخلفي' : 'Back side'}</Label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id="id-back"
                            className="hidden"
                            onChange={(e) => setIdPhotoBack(e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor="id-back"
                            className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer transition-colors"
                          >
                            {idPhotoBack ? (
                              <>
                                <img src={URL.createObjectURL(idPhotoBack)} alt="ID back" className="h-32 w-full object-contain rounded-lg" />
                                <span className="text-sm text-teal-600 mt-2">{idPhotoBack.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setIdPhotoBack(null); }}
                                  className="mt-1 text-sm text-destructive hover:underline"
                                >
                                  {isAr ? 'إزالة' : 'Remove'}
                                </button>
                              </>
                            ) : (
                              <>
                                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">{isAr ? 'اختر الصورة' : 'Choose image'}</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => setStep(2)}>
                        <ArrowLeft className="mr-2" size={20} />
                        {isAr ? 'السابق' : 'Back'}
                      </Button>
                      <Button
                        onClick={handleStep3Next}
                        disabled={loading || !idPhotoFront || !idPhotoBack}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 h-12"
                      >
                        {loading ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'التالي' : 'Next')}
                        <ArrowRight className="ml-2" size={20} />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isAr ? 'رفع السجل الجنائي' : 'Upload criminal record'}
                    </h2>
                    <p className="text-gray-600">
                      {isAr ? 'ارفع وثيقة السجل الجنائي (PDF أو صورة)' : 'Upload your criminal record document (PDF or image)'}
                    </p>

                    <div className="space-y-2">
                      <Label>{isAr ? 'وثيقة السجل الجنائي' : 'Criminal record document'}</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          id="criminal-record"
                          className="hidden"
                          onChange={(e) => setCriminalRecord(e.target.files?.[0] || null)}
                        />
                        <label
                          htmlFor="criminal-record"
                          className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer transition-colors"
                        >
                          {criminalRecord ? (
                            <>
                              <div className="flex items-center gap-2 text-teal-600">
                                <CheckCircle size={32} />
                                <span className="font-medium">{criminalRecord.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setCriminalRecord(null); }}
                                className="mt-2 text-sm text-destructive hover:underline"
                              >
                                {isAr ? 'إزالة' : 'Remove'}
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload className="w-12 h-12 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-600">{isAr ? 'اختر ملف PDF أو صورة' : 'Choose PDF or image file'}</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => setStep(3)}>
                        <ArrowLeft className="mr-2" size={20} />
                        {isAr ? 'السابق' : 'Back'}
                      </Button>
                      <Button
                        onClick={handleStep4Submit}
                        disabled={loading || !criminalRecord}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 h-12"
                      >
                        {loading
                          ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                          : (isAr ? 'إرسال وإنهاء' : 'Submit & finish')}
                        <ArrowRight className="ml-2" size={20} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

export default BecomeTaskerSignupPage;
