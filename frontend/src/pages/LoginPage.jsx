import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, user } = useAuthStore();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate device ID (stored in localStorage)
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    // Check for redirect parameter and error messages
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const errorParam = urlParams.get('error');
    const errorMessage = urlParams.get('message');
    
    if (errorParam) {
      setError(errorMessage || `OAuth error: ${errorParam}`);
    }
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      const isAdminOrSupport = user && (user.role === 'admin' || user.role === 'ops' || user.role === 'customer_service');
      if (redirect) {
        navigate(redirect);
      } else if (isAdminOrSupport) {
        navigate('/admin');
      } else if (user?.role === 'tasker') {
        navigate('/dashboard/tasker');
      } else {
        navigate('/dashboard');
      }
    }
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [isAuthenticated, user, navigate, i18n.language]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      const redirectUri = redirect 
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${window.location.origin}/auth/callback`;
      await authAPI.initiateGoogleOAuth(redirectUri);
    } catch (err) {
      setError(err.message || 'Failed to initiate Google sign-in. Please use phone authentication instead.');
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      const redirectUri = redirect 
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${window.location.origin}/auth/callback`;
      await authAPI.initiateFacebookOAuth(redirectUri);
    } catch (err) {
      setError(err.message || 'Failed to initiate Facebook sign-in. Please use phone authentication instead.');
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log('Requesting OTP for phone:', phone);
      const response = await authAPI.requestOTP(phone, i18n.language === 'ar' ? 'ar-EG' : 'en-US');
      console.log('OTP request response:', response);
      setSuccess(t('auth.otpSent'));
      setStep('otp');
    } catch (err) {
      console.error('OTP request error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code
      });
      
      // Better error messages
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please make sure the backend is running on port 3000.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error?.message || 'Invalid phone number format');
      } else if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError(err.message || 'Failed to send OTP. Check console for details.');
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
      
      // Check for redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      const userRole = response.user?.role;
      
      if (redirect) {
        navigate(redirect);
      } else if (userRole === 'tasker') {
        navigate('/dashboard/tasker');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || t('auth.invalidOTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">{t('app.name')}</CardTitle>
          <CardDescription className="text-base mt-2">{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
              {success}
            </div>
          )}

          {step === 'phone' ? (
            <div className="space-y-4">
              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  onClick={handleFacebookSignIn}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Continue with Facebook
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or continue with phone</span>
                </div>
              </div>

              {/* Phone Form */}
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
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? '...' : t('auth.requestOTP')}
                </Button>
              </form>
            </div>
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
                  autoFocus
                  disabled={loading}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length !== 6} 
                className="w-full" 
                size="lg"
              >
                {loading ? '...' : t('auth.verifyOTP')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
                variant="outline"
                className="w-full"
              >
                {t('auth.changePhone')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
