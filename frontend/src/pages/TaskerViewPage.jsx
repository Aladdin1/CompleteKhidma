import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Star, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { taskerAPI } from '@/services/api';

function TaskerViewPage() {
  const { taskerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backTo = location.state?.from ?? '/dashboard';

  useEffect(() => {
    if (!taskerId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    taskerAPI
      .getProfileById(taskerId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load profile');
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taskerId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center">
        <p className="text-gray-500">{i18n.language === 'ar' ? 'جاري التحميل...' : 'Loading…'}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-red-600 mb-4">{error || (i18n.language === 'ar' ? 'الملف غير موجود' : 'Profile not found')}</p>
        <Link to={backTo}>
          <Button variant="outline">
            <ArrowLeft className="mr-2" size={18} />
            {i18n.language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
        </Link>
      </div>
    );
  }

  const name = profile.full_name || 'Tasker';
  const initials = name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1">
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={backTo}
              className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2" size={20} />
              {i18n.language === 'ar' ? 'رجوع' : 'Back'}
            </Link>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
                {profile.verification?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded">
                    <CheckCircle size={16} /> {i18n.language === 'ar' ? 'موثق' : 'Verified'}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-600">
                  <span className="flex items-center gap-1">
                    <Star className="text-yellow-500 fill-yellow-500" size={18} />
                    <span className="font-semibold">{(profile.rating?.average ?? 0).toFixed(1)}</span>
                    <span>({profile.rating?.count ?? 0} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})</span>
                  </span>
                  {profile.stats && (
                    <span>
                      {i18n.language === 'ar' ? 'قبول' : 'Acceptance'} {(profile.stats.acceptance_rate * 100).toFixed(0)}% · {i18n.language === 'ar' ? 'إكمال' : 'Completion'} {(profile.stats.completion_rate * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {profile.bio && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{i18n.language === 'ar' ? 'نبذة' : 'About'}</h2>
                <p className="text-gray-600">{profile.bio}</p>
              </Card>
            )}
            {profile.categories?.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{i18n.language === 'ar' ? 'الفئات' : 'Categories'}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.categories.map((c) => (
                    <span key={c} className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                      {c}
                    </span>
                  ))}
                </div>
              </Card>
            )}
            {profile.skills?.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{i18n.language === 'ar' ? 'المهارات' : 'Skills'}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            )}
            {profile.service_area && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin size={18} className="text-gray-500" />
                  {i18n.language === 'ar' ? 'منطقة الخدمة' : 'Service area'}
                </h2>
                <p className="text-gray-600">
                  {i18n.language === 'ar' ? 'نصف قطر' : 'Radius'} {profile.service_area.radius_km} km
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TaskerViewPage;
