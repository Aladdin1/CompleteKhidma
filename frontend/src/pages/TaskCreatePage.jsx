import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI } from '../services/api';
import '../styles/TaskCreatePage.css';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    address: '',
    city: 'Cairo',
    lat: 30.0444,
    lng: 31.2357,
    starts_at: '',
    flexibility_minutes: 0,
  });

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
              <option key={cat.key} value={cat.key}>
                {cat.symbol} {cat.name}
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
          <label htmlFor="address">{t('task.location')}</label>
          <input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            required
            placeholder="العنوان بالتفصيل"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">المدينة</label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="starts_at">الموعد</label>
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
