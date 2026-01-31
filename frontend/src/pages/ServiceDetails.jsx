import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';

const ServiceDetails = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { t, i18n } = useTranslation();
  const service = services.find(s => s.id === categoryId);
  const [taskers, setTaskers] = useState([]);
  const [taskersLoading, setTaskersLoading] = useState(true);
  const [taskersError, setTaskersError] = useState('');

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    setTaskersLoading(true);
    setTaskersError('');
    taskerAPI
      .listByCategory(categoryId, { limit: 50 })
      .then((data) => {
        if (!cancelled) setTaskers(data.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setTaskersError(err.response?.data?.error?.message || 'Failed to load taskers');
          setTaskers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setTaskersLoading(false);
      });
    return () => { cancelled = true; };
  }, [categoryId]);

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {i18n.language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found'}
            </h1>
            <Link to="/services">
              <Button variant="outline">
                {i18n.language === 'ar' ? 'تصفح جميع الخدمات' : 'Browse All Services'}
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Service Header */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/services" className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors">
              <ArrowLeft className="mr-2" size={20} />
              {i18n.language === 'ar' ? 'العودة إلى الخدمات' : 'Back to services'}
            </Link>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-6xl mb-4">{service.icon}</div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {i18n.language === 'ar' ? service.nameAr : service.name}
                </h1>
                <p className="text-xl text-gray-700 mb-6">
                  {i18n.language === 'ar' ? service.descriptionAr : service.description}
                </p>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                    <span className="font-semibold">4.9</span> {i18n.language === 'ar' ? 'متوسط التقييم' : 'average rating'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-semibold">{service.averagePrice}</span>
                </div>
              </div>
              <div>
                <img
                  src={service.image}
                  alt={service.name}
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Popular Tasks */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {i18n.language === 'ar' ? 'المهام الشائعة' : 'Popular tasks'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.popularTasks.map((task, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-teal-600 flex-shrink-0" size={20} />
                    <span className="text-gray-900 font-medium">{task}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Available Taskers — from KHIDMA API */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {i18n.language === 'ar' ? 'المهماتون المتاحون' : 'Available Taskers'}
              </h2>
              {!taskersLoading && (
                <span className="text-gray-600">
                  {taskers.length} {i18n.language === 'ar' ? 'مهمات' : 'Taskers'}
                </span>
              )}
            </div>

            {taskersError && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 text-sm">
                {taskersError}
              </div>
            )}

            {taskersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-24 h-24 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                        <div className="h-4 w-64 bg-gray-100 rounded" />
                        <div className="h-10 w-32 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : taskers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-lg text-gray-600 mb-2">
                  {i18n.language === 'ar' ? 'لا يوجد مهماتون متاحون لهذه الخدمة حالياً' : 'No taskers available for this service yet.'}
                </p>
                <p className="text-sm text-gray-500">
                  {i18n.language === 'ar' ? 'جرّب خدمة أخرى أو عد لاحقاً.' : 'Try another service or check back later.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {taskers.map((tasker) => (
                  <Card key={tasker.user_id || tasker.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row gap-6">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={tasker.image} alt={tasker.name || tasker.full_name} />
                        <AvatarFallback>
                          {(tasker.name || tasker.full_name || 'T')
                            .split(/\s+/)
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {tasker.name || tasker.full_name || 'Tasker'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Star className="text-yellow-500 fill-yellow-500" size={16} />
                                <span className="font-semibold">{tasker.rating ?? '—'}</span>
                                <span>({tasker.reviews ?? 0} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="text-green-600" size={16} />
                                {tasker.completedTasks ?? 0} {i18n.language === 'ar' ? 'مهمة مكتملة' : 'tasks completed'}
                              </span>
                              {tasker.distance != null && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="text-gray-400" size={16} />
                                  {tasker.distance}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right mt-4 md:mt-0">
                            <div className="text-2xl font-bold text-gray-900">
                              {tasker.hourlyRate != null
                                ? `${tasker.hourlyRate} ${i18n.language === 'ar' ? 'ج.م/ساعة' : 'EGP/hr'}`
                                : service.averagePrice}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                          <Link
                            to={`/book/${service.id}?tasker=${tasker.user_id || tasker.id}`}
                            className="flex-1"
                          >
                            <Button className="w-full bg-teal-600 hover:bg-teal-700">
                              {i18n.language === 'ar' ? 'اختر ومتابعة' : 'Select & Continue'}
                            </Button>
                          </Link>
                          <Link
                            to={isAuthenticated ? `/dashboard/taskers/${tasker.user_id || tasker.id}` : `/login?redirect=${encodeURIComponent(`/dashboard/taskers/${tasker.user_id || tasker.id}`)}`}
                            className="flex-1"
                          >
                            <Button variant="outline" className="w-full">
                              {i18n.language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ServiceDetails;
