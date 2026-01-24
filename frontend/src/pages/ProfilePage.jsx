import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import i18n from '../i18n';
import '../styles/ProfilePage.css';

function ProfilePage() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get tab from URL parameter
  const urlParams = new URLSearchParams(location.search);
  const tabFromUrl = urlParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabFromUrl && ['profile', 'addresses', 'notifications', 'payments', 'account'].includes(tabFromUrl) ? tabFromUrl : 'profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    locale: 'ar-EG',
  });

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    postal_code: '',
    country: 'Egypt',
    is_default: false,
  });

  // Phone change
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    push_enabled: true,
    sms_enabled: false,
    email_enabled: false,
  });

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAddresses();
    loadNotificationPreferences();
    
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['profile', 'addresses', 'notifications', 'payments', 'account'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const loadProfile = async () => {
    try {
      const profile = await userAPI.getMe();
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        locale: profile.locale || 'ar-EG',
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    }
  };

  const loadAddresses = async () => {
    try {
      const data = await userAPI.getAddresses();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const prefs = await userAPI.getNotificationPreferences();
      setNotificationPrefs({
        push_enabled: prefs.push_enabled ?? true,
        sms_enabled: prefs.sms_enabled ?? false,
        email_enabled: prefs.email_enabled ?? false,
      });
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await userAPI.updateMe(formData);
      updateUser(updated);
      
      // Update i18n locale if changed
      if (formData.locale === 'ar-EG' || formData.locale === 'ar') {
        i18nInstance.changeLanguage('ar');
      } else {
        i18nInstance.changeLanguage('en');
      }
      
      setSuccess(t('profile.saveSuccess'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editingAddress) {
        await userAPI.updateAddress(editingAddress.id, addressForm);
        setSuccess(t('profile.addressUpdated'));
      } else {
        await userAPI.createAddress(addressForm);
        setSuccess(t('profile.addressAdded'));
      }
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        label: '',
        address_line1: '',
        address_line2: '',
        city: '',
        district: '',
        postal_code: '',
        country: 'Egypt',
        is_default: false,
      });
      loadAddresses();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm(t('profile.confirmDeleteAddress'))) return;
    
    try {
      await userAPI.deleteAddress(addressId);
      setSuccess(t('profile.addressDeleted'));
      loadAddresses();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete address');
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      district: address.district || '',
      postal_code: address.postal_code || '',
      country: address.country || 'Egypt',
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  };

  const handlePhoneChangeRequest = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await userAPI.changePhone(newPhone);
      setOtpSent(true);
      setSuccess(t('profile.otpSent'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChangeVerify = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await userAPI.verifyPhoneChange(newPhone, otp);
      updateUser(result.user);
      setShowPhoneChange(false);
      setOtpSent(false);
      setNewPhone('');
      setOtp('');
      setSuccess(t('profile.phoneChanged'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPrefsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await userAPI.updateNotificationPreferences(notificationPrefs);
      setSuccess(t('profile.preferencesSaved'));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!window.confirm(t('profile.confirmDeactivate'))) return;
    
    setLoading(true);
    try {
      await userAPI.deactivateAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to deactivate account');
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
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

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>{t('profile.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          {t('profile.basicInfo')}
        </button>
        <button
          className={activeTab === 'addresses' ? 'active' : ''}
          onClick={() => setActiveTab('addresses')}
        >
          {t('profile.addresses')}
        </button>
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          {t('profile.notifications')}
        </button>
        <button
          className={activeTab === 'account' ? 'active' : ''}
          onClick={() => setActiveTab('account')}
        >
          {t('profile.account')}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="profile-card">
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label htmlFor="phone">{t('profile.phone')}</label>
              <input
                id="phone"
                type="tel"
                value={user?.phone || ''}
                disabled
                className="disabled-input"
              />
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowPhoneChange(true)}
              >
                {t('profile.changePhone')}
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="full_name">{t('profile.fullName')}</label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('profile.fullNamePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('profile.email')}</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="locale">{t('profile.language')}</label>
              <select
                id="locale"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              >
                <option value="ar-EG">العربية</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="primary-btn">
                {loading ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="profile-card">
          <div className="section-header">
            <h2>{t('profile.savedAddresses')}</h2>
            <button
              className="primary-btn"
              onClick={() => {
                setShowAddressForm(true);
                setEditingAddress(null);
                setAddressForm({
                  label: '',
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  district: '',
                  postal_code: '',
                  country: 'Egypt',
                  is_default: false,
                });
              }}
            >
              {t('profile.addAddress')}
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleAddressSubmit} className="address-form">
              <div className="form-group">
                <label>{t('profile.addressLabel')}</label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  placeholder={t('profile.addressLabelPlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('profile.addressLine1')}</label>
                <input
                  type="text"
                  value={addressForm.address_line1}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('profile.addressLine2')}</label>
                <input
                  type="text"
                  value={addressForm.address_line2}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('profile.city')}</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('profile.district')}</label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  />
                  {t('profile.setAsDefault')}
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="primary-btn">
                  {editingAddress ? t('profile.update') : t('profile.add')}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </form>
          )}

          <div className="addresses-list">
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
                <div className="address-header">
                  <h3>{address.label}</h3>
                  {address.is_default && <span className="badge">{t('profile.default')}</span>}
                </div>
                <p>{address.address_line1}</p>
                {address.address_line2 && <p>{address.address_line2}</p>}
                <p>{address.city}, {address.district || ''}</p>
                <div className="address-actions">
                  <button
                    className="link-btn"
                    onClick={() => handleEditAddress(address)}
                  >
                    {t('profile.edit')}
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    {t('profile.delete')}
                  </button>
                </div>
              </div>
            ))}
            {addresses.length === 0 && !showAddressForm && (
              <p className="empty-state">{t('profile.noAddresses')}</p>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="profile-card">
          <form onSubmit={handleNotificationPrefsSubmit}>
            <div className="form-group">
              <label>
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
              <label>
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
              <label>
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
            <div className="form-actions">
              <button type="submit" disabled={loading} className="primary-btn">
                {loading ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="profile-card">
          <div className="section-header">
            <h2>{t('payment.paymentMethods')}</h2>
            <a href="/profile/payments" className="primary-btn">
              {t('payment.manageMethods')}
            </a>
          </div>
          <div className="quick-links">
            <a href="/payments/history" className="link-card">
              <h3>{t('payment.paymentHistory')}</h3>
              <p>{t('payment.viewAllPayments')}</p>
            </a>
            <a href="/payments/analytics" className="link-card">
              <h3>{t('payment.spendingAnalytics')}</h3>
              <p>{t('payment.viewSpendingInsights')}</p>
            </a>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="profile-card">
          <div className="danger-zone">
            <h2>{t('profile.dangerZone')}</h2>
            <div className="danger-actions">
              <button
                className="danger-btn"
                onClick={handleDeactivateAccount}
                disabled={loading}
              >
                {t('profile.deactivateAccount')}
              </button>
              <button
                className="danger-btn"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                {t('profile.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Change Modal */}
      {showPhoneChange && (
        <div className="modal-overlay" onClick={() => !otpSent && setShowPhoneChange(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('profile.changePhone')}</h2>
            {!otpSent ? (
              <>
                <div className="form-group">
                  <label>{t('profile.newPhone')}</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+201234567890"
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handlePhoneChangeRequest}
                    disabled={loading || !newPhone}
                  >
                    {t('profile.sendOTP')}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowPhoneChange(false)}
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>{t('profile.enterOTP')}</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handlePhoneChangeVerify}
                    disabled={loading || otp.length !== 6}
                  >
                    {t('profile.verify')}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowPhoneChange(false);
                      setOtpSent(false);
                      setOtp('');
                    }}
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
