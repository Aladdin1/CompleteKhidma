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
  const { isAuthenticated, setAuth } = useAuthStore();
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
    // Check for redirect parameter
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      if (redirect) {
        navigate(redirect);
      } else {
        navigate('/dashboard');
      }
    }
    // Set RTL for Arabic
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [isAuthenticated, navigate, i18n.language]);

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
      
      if (redirect) {
        navigate(redirect);
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
