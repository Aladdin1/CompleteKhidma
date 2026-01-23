import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '../services/api';
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
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    bio: '',
    categories: [],
    skills: [],
    serviceArea: {
      center_lat: 30.0444,
      center_lng: 31.2357,
      radius_km: 10,
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await taskerAPI.getProfile();
      setProfile(data);
      setFormData({
        bio: data.bio || '',
        categories: data.categories || [],
        skills: data.skills || [],
        serviceArea: data.service_area || {
          center_lat: 30.0444,
          center_lng: 31.2357,
          radius_km: 10,
        },
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await taskerAPI.updateProfile(formData);
      setSuccess('تم تحديث الملف الشخصي بنجاح');
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (category) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSkillAdd = (skill) => {
    const input = document.getElementById('new-skill');
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
      input.value = '';
    }
  };

  const handleSkillRemove = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  if (loading) {
    return <div className="tasker-profile loading">Loading...</div>;
  }

  return (
    <div className="tasker-profile">
      <div className="page-header">
        <h1>ملفي الشخصي - مهمات</h1>
      </div>

      {profile && (
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-value">{profile.rating_avg?.toFixed(1) || '0.0'}</div>
            <div className="stat-label">التقييم</div>
          </div>
          <div className="stat">
            <div className="stat-value">{profile.rating_count || 0}</div>
            <div className="stat-label">عدد التقييمات</div>
          </div>
          <div className="stat">
            <div className="stat-value">{(profile.acceptance_rate * 100).toFixed(1)}%</div>
            <div className="stat-label">معدل القبول</div>
          </div>
          <div className="stat">
            <div className="stat-value">{(profile.completion_rate * 100).toFixed(1)}%</div>
            <div className="stat-label">معدل الإنجاز</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="form-group">
          <label htmlFor="bio">السيرة الذاتية</label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            placeholder="اكتب نبذة عنك ومهاراتك..."
          />
        </div>

        <div className="form-group">
          <label>الفئات</label>
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
          <label htmlFor="skills">المهارات</label>
          <div className="skills-input">
            <input
              id="new-skill"
              type="text"
              placeholder="أضف مهارة جديدة..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSkillAdd(e.target.value.trim());
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('new-skill');
                handleSkillAdd(input.value.trim());
              }}
            >
              إضافة
            </button>
          </div>
          <div className="skills-list">
            {formData.skills.map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
                <button
                  type="button"
                  onClick={() => handleSkillRemove(skill)}
                  className="skill-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>منطقة الخدمة</label>
          <div className="service-area">
            <div>
              <label>خط العرض (Latitude)</label>
              <input
                type="number"
                step="0.000001"
                value={formData.serviceArea.center_lat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceArea: {
                      ...formData.serviceArea,
                      center_lat: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label>خط الطول (Longitude)</label>
              <input
                type="number"
                step="0.000001"
                value={formData.serviceArea.center_lng}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceArea: {
                      ...formData.serviceArea,
                      center_lng: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label>نطاق الخدمة (كم)</label>
              <input
                type="number"
                step="1"
                value={formData.serviceArea.radius_km}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceArea: {
                      ...formData.serviceArea,
                      radius_km: parseInt(e.target.value) || 10,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="primary-btn">
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskerProfilePage;
