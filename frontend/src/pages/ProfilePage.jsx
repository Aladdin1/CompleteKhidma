import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/ProfilePage.css';

function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await userAPI.getMe();
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await userAPI.updateMe(formData);
      updateUser(updated);
      setSuccess('تم حفظ التغييرات بنجاح');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>{t('profile.title')}</h1>
      </div>

      <div className="profile-card">
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="form-group">
            <label htmlFor="phone">رقم الهاتف</label>
            <input
              id="phone"
              type="tel"
              value={user?.phone || ''}
              disabled
              className="disabled-input"
            />
            <small>لا يمكن تغيير رقم الهاتف</small>
          </div>

          <div className="form-group">
            <label htmlFor="full_name">{t('profile.fullName')}</label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="الاسم الكامل"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('profile.email')}</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? 'جاري الحفظ...' : t('profile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
