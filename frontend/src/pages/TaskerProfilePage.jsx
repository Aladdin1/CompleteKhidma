import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { taskerAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import '../styles/TaskerProfilePage.css';

const CATEGORIES = [
  { key: 'cleaning', name: 'Cleaning', symbol: '🧹' },
  { key: 'mounting', name: 'Mounting', symbol: '📌' },
  { key: 'moving', name: 'Moving', symbol: '📦' },
  { key: 'assembly', name: 'Assembly', symbol: '🔧' },
  { key: 'delivery', name: 'Delivery', symbol: '🚚' },
  { key: 'handyman', name: 'Handyman', symbol: '👷' },
  { key: 'painting', name: 'Painting', symbol: '🎨' },
  { key: 'plumbing', name: 'Plumbing', symbol: '🔧' },
  { key: 'electrical', name: 'Electrical', symbol: '⚡' },
  { key: 'developing', name: 'Developing', symbol: '💻' },
];

function TaskerProfilePage() {
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    locale: 'ar-EG',
    bio: '',
    categories: [],
    skills: [],
    serviceArea: {
      center_lat: 30.0444,
      center_lng: 31.2357,
      radius_km: 10,
    },
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    push_enabled: true,
    sms_enabled: false,
    email_enabled: false,
  });
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [me, taskerProfile, notifPrefs] = await Promise.all([
        userAPI.getMe().catch((err) => {
          console.error('Failed to load user:', err);
          return null;
        }),
        taskerAPI.getProfile().catch((err) => {
          // 404 is OK for new taskers - profile might not exist yet or might be loading
          if (err.response?.status === 404) {
            console.log('Tasker profile not found yet - will be created on first save');
            return null;
          }
          console.error('Failed to load tasker profile:', err);
          return null;
        }),
        userAPI.getNotificationPreferences().catch(() => ({ push_enabled: true, sms_enabled: false, email_enabled: false })),
      ]);

      if (taskerProfile) {
        setProfile(taskerProfile);
        const sa = taskerProfile.service_area;
        setFormData((prev) => ({
          ...prev,
          bio: taskerProfile.bio || '',
          categories: taskerProfile.categories || [],
          skills: taskerProfile.skills || [],
          serviceArea: sa
            ? {
                center_lat: sa.center?.lat ?? 30.0444,
                center_lng: sa.center?.lng ?? 31.2357,
                radius_km: sa.radius_km ?? 10,
              }
            : { center_lat: 30.0444, center_lng: 31.2357, radius_km: 10 },
        }));
      } else {
        // New tasker - initialize with defaults from user data
        setProfile({ status: 'applied', rating: { average: 0, count: 0 }, stats: { acceptance_rate: 0, completion_rate: 0 } });
      }
      if (me) {
        setFormData((prev) => ({
          ...prev,
          full_name: me.full_name || '',
          email: me.email || '',
          locale: me.locale || 'ar-EG',
        }));
      }
      if (notifPrefs) {
        setNotificationPrefs({
          push_enabled: notifPrefs.push_enabled ?? true,
          sms_enabled: notifPrefs.sms_enabled ?? false,
          email_enabled: notifPrefs.email_enabled ?? false,
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await userAPI.updateMe({
        full_name: formData.full_name,
        email: formData.email,
        locale: formData.locale,
      });
      updateUser(updated);
      await taskerAPI.updateProfile({
        bio: formData.bio,
        categories: formData.categories,
        skills: formData.skills,
        service_area: {
          center: { lat: formData.serviceArea.center_lat, lng: formData.serviceArea.center_lng },
          radius_km: formData.serviceArea.radius_km,
        },
      });
      if (formData.locale === 'ar-EG' || formData.locale === 'ar') {
        i18nInstance.changeLanguage('ar');
      } else {
        i18nInstance.changeLanguage('en');
      }
      setSuccess(t('profile.saveSuccess'));
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (cat) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSkillAdd = (val) => {
    const v = (typeof val === 'string' ? val : document.getElementById('new-skill')?.value ?? '').trim();
    if (v && !formData.skills.includes(v)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, v] }));
      const el = document.getElementById('new-skill');
      if (el) el.value = '';
    }
  };

  const handleSkillRemove = (skill) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await userAPI.updateNotificationPreferences(notificationPrefs);
      setSuccess(t('profile.preferencesSaved'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneRequest = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await userAPI.changePhone(newPhone);
      setOtpSent(true);
      setSuccess(t('profile.otpSent'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneVerify = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await userAPI.verifyPhoneChange(newPhone, otp);
      updateUser(res.user);
      setShowPhoneChange(false);
      setOtpSent(false);
      setNewPhone('');
      setOtp('');
      setSuccess(t('profile.phoneChanged'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to verify OTP');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(t('profile.confirmDeactivate'))) return;
    setLoading(true);
    try {
      await userAPI.deactivateAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to deactivate');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('profile.confirmDelete'))) return;
    if (!window.confirm(t('profile.confirmDeleteFinal'))) return;
    setLoading(true);
    try {
      await userAPI.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div className="tasker-profile loading">Loading...</div>;
  }

  return (
    <div className="tasker-profile">
      <div className="page-header">
        <h1>{t('tasker.profileTitle')}</h1>
      </div>

      {profile && (
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-value">{profile.rating?.average?.toFixed(1) ?? '0.0'}</div>
            <div className="stat-label">{t('tasker.rating')}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{profile.rating?.count ?? 0}</div>
            <div className="stat-label">{t('tasker.ratingCount')}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{((profile.stats?.acceptance_rate ?? 0) * 100).toFixed(1)}%</div>
            <div className="stat-label">{t('tasker.acceptanceRate')}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{((profile.stats?.completion_rate ?? 0) * 100).toFixed(1)}%</div>
            <div className="stat-label">{t('tasker.completionRate')}</div>
          </div>
        </div>
      )}

      {!profile && !loading && (
        <div className="info-message" style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', marginBottom: '1rem' }}>
          <p>{i18nInstance.language === 'ar' ? 'مرحباً! يرجى إكمال ملفك الشخصي للبدء.' : 'Welcome! Please complete your profile to get started.'}</p>
        </div>
      )}

      <div className="profile-tabs">
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          {t('tasker.profileTab')}
        </button>
        <button
          className={activeTab === 'account' ? 'active' : ''}
          onClick={() => setActiveTab('account')}
        >
          {t('tasker.accountTab')}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="profile-form">
          <div className="form-group">
            <label>{t('profile.fullName')}</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder={t('profile.fullNamePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('profile.email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label>{t('profile.language')}</label>
            <select
              value={formData.locale}
              onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
            >
              <option value="ar-EG">العربية</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('tasker.bio')}</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="..."
            />
          </div>
          <div className="form-group">
            <label>{t('tasker.categories')}</label>
            <div className="categories-list">
              {CATEGORIES.map((cat) => (
                <label key={cat.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat.key)}
                    onChange={() => handleCategoryToggle(cat.key)}
                  />
                  <span>{cat.symbol} {cat.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t('tasker.skills')}</label>
            <div className="skills-input">
              <input
                id="new-skill"
                type="text"
                placeholder="..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
              />
              <button type="button" onClick={() => handleSkillAdd()}>
                {t('tasker.addSkill')}
              </button>
            </div>
            <div className="skills-list">
              {formData.skills.map((s) => (
                <span key={s} className="skill-tag">
                  {s}
                  <button type="button" onClick={() => handleSkillRemove(s)} className="skill-remove">×</button>
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t('tasker.serviceArea')}</label>
            <div className="service-area">
              <div>
                <label>Lat</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.serviceArea.center_lat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceArea: { ...formData.serviceArea, center_lat: parseFloat(e.target.value) },
                    })
                  }
                />
              </div>
              <div>
                <label>Lng</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.serviceArea.center_lng}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceArea: { ...formData.serviceArea, center_lng: parseFloat(e.target.value) },
                    })
                  }
                />
              </div>
              <div>
                <label>km</label>
                <input
                  type="number"
                  value={formData.serviceArea.radius_km}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceArea: { ...formData.serviceArea, radius_km: parseInt(e.target.value, 10) || 10 },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving} className="primary-btn">
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'account' && (
        <div className="profile-form account-section">
          <div className="form-group">
            <label>{t('profile.phone')}</label>
            <input type="tel" value={user?.phone || ''} disabled className="disabled-input" />
            <button type="button" className="link-btn" onClick={() => setShowPhoneChange(true)}>
              {t('profile.changePhone')}
            </button>
          </div>

          <form onSubmit={handleNotificationSubmit}>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notificationPrefs.push_enabled}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, push_enabled: e.target.checked })
                  }
                />
                {t('profile.pushNotifications')}
              </label>
            </div>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notificationPrefs.sms_enabled}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, sms_enabled: e.target.checked })
                  }
                />
                {t('profile.smsNotifications')}
              </label>
            </div>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email_enabled}
                  onChange={(e) =>
                    setNotificationPrefs({ ...notificationPrefs, email_enabled: e.target.checked })
                  }
                />
                {t('profile.emailNotifications')}
              </label>
            </div>
            <button type="submit" disabled={saving} className="primary-btn">
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </form>

          <div className="danger-zone">
            <h3>{t('profile.dangerZone')}</h3>
            <button type="button" className="danger-btn" onClick={handleDeactivate}>
              {t('profile.deactivateAccount')}
            </button>
            <button type="button" className="danger-btn" onClick={handleDelete}>
              {t('profile.deleteAccount')}
            </button>
          </div>
        </div>
      )}

      {showPhoneChange && (
        <div className="modal-overlay" onClick={() => !otpSent && setShowPhoneChange(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('profile.changePhone')}</h3>
            {!otpSent ? (
              <>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder={t('profile.newPhone')}
                />
                <div className="modal-actions">
                  <button type="button" className="primary-btn" onClick={handlePhoneRequest} disabled={saving || !newPhone}>
                    {t('profile.sendOTP')}
                  </button>
                  <button type="button" onClick={() => setShowPhoneChange(false)}>{t('profile.cancel')}</button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={t('profile.enterOTP')}
                />
                <div className="modal-actions">
                  <button type="button" className="primary-btn" onClick={handlePhoneVerify} disabled={saving || !otp}>
                    {t('profile.verify')}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}>{t('profile.cancel')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskerProfilePage;
