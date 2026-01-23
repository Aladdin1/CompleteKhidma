import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI, userAPI } from '../services/api';
import '../styles/TaskCreatePage.css';

const CATEGORIES = [
  'cleaning',
  'mounting',
  'moving',
  'assembly',
  'delivery',
  'handyman',
  'painting',
  'plumbing',
  'electrical',
];

function TaskCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' or 'manual'
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    address: '',
    city: 'Cairo',
    district: '',
    lat: 30.0444,
    lng: 31.2357,
    starts_at: '',
    flexibility_minutes: 0,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const savedAddresses = await userAPI.getAddresses();
      setAddresses(savedAddresses);
      
      // Set default address if available
      const defaultAddress = savedAddresses.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        populateAddressFields(defaultAddress);
        setAddressMode('saved');
      } else if (savedAddresses.length > 0) {
        setSelectedAddressId(savedAddresses[0].id);
        populateAddressFields(savedAddresses[0]);
        setAddressMode('saved');
      } else {
        setAddressMode('manual');
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setAddressMode('manual');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const populateAddressFields = (address) => {
    setFormData(prev => ({
      ...prev,
      address: address.address_line1 + (address.address_line2 ? `, ${address.address_line2}` : ''),
      city: address.city,
      district: address.district || '',
      lat: address.latitude || 30.0444,
      lng: address.longitude || 31.2357,
    }));
  };

  const handleAddressSelect = (addressId) => {
    if (addressId === '') {
      setSelectedAddressId('');
      setFormData(prev => ({
        ...prev,
        address: '',
        city: 'Cairo',
        district: '',
      }));
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === addressId);
    if (selectedAddress) {
      setSelectedAddressId(addressId);
      populateAddressFields(selectedAddress);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const taskData = {
        category: formData.category,
        description: formData.description,
        location: {
          address: formData.address,
          city: formData.city,
          district: formData.district || undefined,
          point: {
            lat: formData.lat,
            lng: formData.lng,
          },
        },
        schedule: {
          starts_at: new Date(formData.starts_at).toISOString(),
          flexibility_minutes: parseInt(formData.flexibility_minutes) || 0,
        },
      };

      const task = await taskAPI.create(taskData);
      
      // Post task immediately
      await taskAPI.post(task.id);
      
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      console.error('Task creation error:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create task';
      const errorCode = err.response?.data?.error?.code;
      setError(`${errorMessage}${errorCode ? ` (${errorCode})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // If manually editing address, switch to manual mode
    if (field === 'address' || field === 'city' || field === 'district') {
      setAddressMode('manual');
      setSelectedAddressId('');
    }
  };

  return (
    <div className="task-create-page">
      <div className="page-header">
        <h1>{t('task.create')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label htmlFor="category">{t('task.category')}</label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            required
          >
            <option value="">اختر الفئة</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('task.description')}</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            required
            placeholder="وصف المهمة..."
          />
        </div>

        <div className="form-group">
          <div className="address-selection-header">
            <label htmlFor="address-select">{t('task.location')}</label>
            <div className="address-mode-switch">
              <button
                type="button"
                className={`mode-btn ${addressMode === 'saved' ? 'active' : ''}`}
                onClick={() => {
                  setAddressMode('saved');
                  if (addresses.length > 0 && !selectedAddressId) {
                    setSelectedAddressId(addresses[0].id);
                    populateAddressFields(addresses[0]);
                  }
                }}
                disabled={addresses.length === 0}
              >
                {t('task.useSavedAddress')}
              </button>
              <button
                type="button"
                className={`mode-btn ${addressMode === 'manual' ? 'active' : ''}`}
                onClick={() => {
                  setAddressMode('manual');
                  setSelectedAddressId('');
                }}
              >
                {t('task.enterManually')}
              </button>
            </div>
          </div>

          {addressMode === 'saved' && addresses.length > 0 ? (
            <>
              <select
                id="address-select"
                value={selectedAddressId}
                onChange={(e) => handleAddressSelect(e.target.value)}
                required
                className="address-select"
              >
                <option value="">{t('task.selectAddress')}</option>
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} {addr.is_default ? `(${t('profile.default')})` : ''} - {addr.address_line1}, {addr.city}
                  </option>
                ))}
              </select>
              <div className="address-actions">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate('/profile?tab=addresses')}
                >
                  {t('task.manageAddresses')}
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                required
                placeholder={t('task.addressPlaceholder')}
              />
              {addresses.length > 0 && (
                <div className="address-actions">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setAddressMode('saved');
                      if (addresses.length > 0) {
                        setSelectedAddressId(addresses[0].id);
                        populateAddressFields(addresses[0]);
                      }
                    }}
                  >
                    {t('task.useSavedAddress')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">{t('task.city')}</label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              required
              disabled={addressMode === 'saved' && selectedAddressId}
            />
          </div>

          {formData.district && (
            <div className="form-group">
              <label htmlFor="district">{t('task.district')}</label>
              <input
                id="district"
                type="text"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                disabled={addressMode === 'saved' && selectedAddressId}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="starts_at">{t('task.schedule')}</label>
            <input
              id="starts_at"
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => handleChange('starts_at', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="secondary-btn"
            disabled={loading}
          >
            {t('task.cancel')}
          </button>
          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? 'جاري الإنشاء...' : t('task.postTask')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskCreatePage;
