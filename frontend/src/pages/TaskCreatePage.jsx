import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowLeft } from 'lucide-react';
import { taskAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PENDING_TASK_KEY = 'pendingTaskCreate';

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

function TaskCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const isPublic = location.pathname === '/tasks/create';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [, setLoadingAddresses] = useState(true);
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' or 'manual'
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [formData, setFormData] = useState({
    category: searchParams.get('category') || '', // Pre-fill category from URL
    description: '',
    address: '',
    city: 'Cairo',
    district: '',
    lat: 30.0444,
    lng: 31.2357,
    starts_at: '',
    flexibility_minutes: 0,
    bid_mode: 'invite_only', // 'open_for_bids' | 'invite_only' (US-C-101/102/103)
  });

  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setAddressMode('manual');
      setLoadingAddresses(false);
      return;
    }
    try {
      setLoadingAddresses(true);
      const savedAddresses = await userAPI.getAddresses();
      setAddresses(savedAddresses);

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
  }, [isAuthenticated]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // After login: restore pending task and submit
  useEffect(() => {
    if (!isAuthenticated || !searchParams.get('pending')) return;
    const raw = sessionStorage.getItem(PENDING_TASK_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_TASK_KEY);
      setFormData(data);
      setError('');
      setLoading(true);
      const taskData = {
        category: data.category,
        description: data.description,
        location: {
          address: data.address,
          city: data.city,
          district: data.district || undefined,
          point: { lat: data.lat, lng: data.lng },
        },
        schedule: {
          starts_at: new Date(data.starts_at).toISOString(),
          flexibility_minutes: parseInt(data.flexibility_minutes) || 0,
        },
      };
      taskAPI.create(taskData)
        .then((task) =>
          taskAPI.post(task.id, { bid_mode: data.bid_mode || 'invite_only' }).then(() => task)
        )
        .then((task) => navigate(`/dashboard/tasks/${task.id}`))
        .catch((err) => {
          const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create task';
          const errorCode = err.response?.data?.error?.code;
          setError(`${errorMessage}${errorCode ? ` (${errorCode})` : ''}`);
        })
        .finally(() => setLoading(false));
    } catch (_) {
      sessionStorage.removeItem(PENDING_TASK_KEY);
    }
  }, [isAuthenticated, searchParams, navigate]);

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

    // Login required only at final step: redirect to login and save form for after auth
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_TASK_KEY, JSON.stringify(formData));
      navigate(`/login?redirect=${encodeURIComponent('/tasks/create?pending=1')}`);
      return;
    }

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
      await taskAPI.post(task.id, { bid_mode: formData.bid_mode || 'invite_only' });
      navigate(`/dashboard/tasks/${task.id}`);
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

  const backTarget = isPublic ? '/' : '/dashboard';

  const content = (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backTarget)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{t('task.create')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('task.create')}</CardTitle>
          <CardDescription>
            {t('task.createDescription') || 'Fill in the details to create a new task'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('task.category')}</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">{t('task.selectCategory') || 'Select a category'}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.symbol} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('task.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                required
                placeholder={t('task.descriptionPlaceholder') || 'Describe what you need help with...'}
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="address-select">{t('task.location')}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={addressMode === 'saved' ? 'default' : 'outline'}
                    size="sm"
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
                  </Button>
                  <Button
                    type="button"
                    variant={addressMode === 'manual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAddressMode('manual');
                      setSelectedAddressId('');
                    }}
                  >
                    {t('task.enterManually')}
                  </Button>
                </div>
              </div>

              {addressMode === 'saved' && addresses.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="address-select"
                    value={selectedAddressId}
                    onChange={(e) => handleAddressSelect(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{t('task.selectAddress')}</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} {addr.is_default ? `(${t('profile.default')})` : ''} - {addr.address_line1}, {addr.city}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate('/dashboard/profile?tab=addresses')}
                  >
                    {t('task.manageAddresses')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                    placeholder={t('task.addressPlaceholder')}
                  />
                  {addresses.length > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => {
                        setAddressMode('saved');
                        if (addresses.length > 0) {
                          setSelectedAddressId(addresses[0].id);
                          populateAddressFields(addresses[0]);
                        }
                      }}
                    >
                      {t('task.useSavedAddress')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* City and District */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t('task.city')}</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                  disabled={addressMode === 'saved' && selectedAddressId}
                />
              </div>

              {formData.district && (
                <div className="space-y-2">
                  <Label htmlFor="district">{t('task.district')}</Label>
                  <Input
                    id="district"
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    disabled={addressMode === 'saved' && selectedAddressId}
                  />
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label htmlFor="starts_at" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('task.schedule')}
              </Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => handleChange('starts_at', e.target.value)}
                required
              />
            </div>

            {/* How do you want to get quotes? (US-C-101/102/103) */}
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Label className="text-base font-medium">
                {t('task.howToGetQuotes') || 'How do you want to get quotes?'}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                  <input
                    type="radio"
                    name="bid_mode"
                    value="open_for_bids"
                    checked={formData.bid_mode === 'open_for_bids'}
                    onChange={(e) => handleChange('bid_mode', e.target.value)}
                    className="h-4 w-4 border-gray-300 text-teal-600"
                  />
                  <span>
                    <strong>{t('task.openForBids') || 'Open for bids'}</strong>
                    <span className="ml-1 block text-sm text-gray-600">
                      {t('task.openForBidsHint') || 'Any matching tasker can submit a quote'}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                  <input
                    type="radio"
                    name="bid_mode"
                    value="invite_only"
                    checked={formData.bid_mode === 'invite_only'}
                    onChange={(e) => handleChange('bid_mode', e.target.value)}
                    className="h-4 w-4 border-gray-300 text-teal-600"
                  />
                  <span>
                    <strong>{t('task.chooseTaskers') || 'Choose specific taskers'}</strong>
                    <span className="ml-1 block text-sm text-gray-600">
                      {t('task.chooseTaskersHint') || "I'll pick who to ask for a quote"}
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(backTarget)}
                disabled={loading}
              >
                {t('task.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                {loading ? (t('task.creating') || 'Creating...') : t('task.postTask')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  if (isPublic) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 py-8 px-4">
          {content}
        </div>
      </div>
    );
  }
  return content;
}

export default TaskCreatePage;
