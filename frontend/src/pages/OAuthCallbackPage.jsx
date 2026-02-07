import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (error) {
      // OAuth failed or was cancelled
      console.error('OAuth error:', error, errorMessage);
      navigate(`/login?error=${encodeURIComponent(error)}${errorMessage ? `&message=${encodeURIComponent(errorMessage)}` : ''}`);
      return;
    }

    if (accessToken && refreshToken && userParam) {
      try {
        const user = JSON.parse(userParam);
        setAuth(user, accessToken, refreshToken);

        const redirect = searchParams.get('redirect');
        const isAdminOrSupport = user && (user.role === 'admin' || user.role === 'ops' || user.role === 'customer_service');
        const destination = redirect || (isAdminOrSupport ? '/admin' : (user.role === 'tasker' ? '/dashboard/tasker' : '/dashboard'));
        navigate(destination, { replace: true });
      } catch (err) {
        console.error('Failed to parse user data:', err);
        navigate('/login?error=oauth_parse_error', { replace: true });
      }
    } else {
      // Missing required parameters
      console.error('Missing OAuth callback parameters');
      navigate('/login?error=oauth_missing_params');
    }
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
