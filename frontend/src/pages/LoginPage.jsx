import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/LoginPage.css';

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
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
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
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || t('auth.invalidOTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>{t('app.name')}</h1>
          <p className="tagline">{t('app.tagline')}</p>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOTP}>
              <div className="form-group">
                <label htmlFor="phone">{t('auth.phoneNumber')}</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+201234567890"
                  required
                  dir="ltr"
                />
              </div>
              <button type="submit" disabled={loading} className="primary-btn">
                {loading ? '...' : t('auth.requestOTP')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label htmlFor="otp">{t('auth.enterOTP')}</label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  dir="ltr"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="primary-btn">
                {loading ? '...' : t('auth.verifyOTP')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
                className="secondary-btn"
              >
                {t('auth.changePhone')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
