import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/BecomeTaskerPage.css';

function BecomeTaskerPage() {
  useTranslation(); // i18n available when needed
  const navigate = useNavigate();
  const { user, setAuth, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBecomeTasker = async () => {
    if (!confirm('هل تريد التحول إلى مهمات؟')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const result = await userAPI.becomeTasker();
      setSuccess(result.message);
      // Store new tokens + user so JWT role matches DB (avoids role mismatch)
      if (result.access_token && result.refresh_token && result.user) {
        setAuth(result.user, result.access_token, result.refresh_token);
      } else {
        updateUser({ role: 'tasker' });
      }
      setTimeout(() => {
        navigate('/dashboard/tasker/profile');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to become tasker');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'tasker') {
    return (
      <div className="become-tasker">
        <div className="already-tasker">
          <h2>أنت بالفعل مهمات!</h2>
          <p>يمكنك الوصول إلى جميع ميزات المهمات</p>
          <button onClick={() => navigate('/dashboard/tasker')}>الذهاب إلى لوحة المهمات</button>
        </div>
      </div>
    );
  }

  return (
    <div className="become-tasker">
      <div className="become-tasker-content">
        <h1>أصبح مهمات</h1>
        <p className="description">
          بتحولك إلى مهمات، يمكنك:
        </p>
        <ul className="benefits">
          <li>✅ تصفح المهام المتاحة في منطقتك</li>
          <li>✅ تلقي عروض مهام مناسبة لك</li>
          <li>✅ إدارة ملفك الشخصي ومهاراتك</li>
          <li>✅ تتبع أرباحك وطلبات السحب</li>
        </ul>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="actions">
          <button
            onClick={handleBecomeTasker}
            disabled={loading}
            className="primary-btn"
          >
            {loading ? 'جاري المعالجة...' : 'أصبح مهمات الآن'}
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="secondary-btn"
          >
            إلغاء
          </button>
        </div>

        <div className="info-box">
          <p><strong>ملاحظة:</strong> بعد التحول إلى مهمات، ستحتاج إلى:</p>
          <ol>
            <li>إكمال ملفك الشخصي (الفئات والمهارات)</li>
            <li>تحديد منطقة الخدمة</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default BecomeTaskerPage;
