import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Copy,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { taskAPI } from '../services/api';
import { services as servicesList } from '../data/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroSearchQuery, setHeroSearchQuery] = useState('');

  useEffect(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      loadTasks();
    }
  }, [location.pathname]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.list();
      setTasks(response.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    navigate('/services');
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/services/${categoryId}`);
  };

  const handleCreateTask = () => {
    navigate('/services');
  };

  const getStateBadgeVariant = (state) => {
    const variantMap = {
      draft: 'secondary',
      posted: 'default',
      matching: 'default',
      accepted: 'default',
      in_progress: 'default',
      completed: 'outline',
    };
    return variantMap[state] || 'default';
  };

  const getStateLabel = (task) => {
    const state = typeof task === 'string' ? task : task?.state;
    const bidMode = typeof task === 'object' ? task?.bid_mode : undefined;
    if (state === 'posted' && bidMode === 'open_for_bids') {
      return i18n.language === 'ar' ? 'في انتظار العروض' : 'Waiting for offers';
    }
    const stateMap = {
      draft: t('task.draft'),
      posted: t('task.posted'),
      matching: t('task.matching'),
      accepted: t('task.accepted'),
      in_progress: t('task.inProgress'),
      completed: t('task.completed'),
    };
    return stateMap[state] || state;
  };

  const displayedServices = servicesList.slice(0, 8);
  const displayedTasks = tasks.slice(0, 6);

  return (
    <div className="space-y-0">
      {/* Hero Section - full-width background (main is full width on dashboard home) */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-20 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {i18n.language === 'ar'
                  ? 'الحياة اليومية أصبحت أسهل'
                  : 'Everyday life made easier'}
              </h1>
              <p className="text-xl text-gray-700 mb-8">
                {i18n.language === 'ar'
                  ? 'تواصل مع مهماتين ماهرين للمساعدة في كل شيء من إصلاحات المنزل إلى المهمات.'
                  : 'Connect with skilled Taskers for help with everything from home repairs to errands.'}
              </p>
              <form onSubmit={handleHeroSearch} className="flex gap-3 mb-6">
                <Input
                  placeholder={i18n.language === 'ar' ? 'ما الذي تحتاج المساعدة فيه؟' : 'What do you need help with?'}
                  className="flex-1 h-12 text-base"
                  value={heroSearchQuery}
                  onChange={(e) => setHeroSearchQuery(e.target.value)}
                />
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 h-12 px-8">
                  {i18n.language === 'ar' ? 'ابدأ' : 'Get Started'}
                </Button>
              </form>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-teal-600 shrink-0" size={20} />
                  <span>{i18n.language === 'ar' ? 'مهماتون معتمدون' : 'Vetted Taskers'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-teal-600 shrink-0" size={20} />
                  <span>{i18n.language === 'ar' ? 'خدمة في نفس اليوم' : 'Same-day service'}</span>
                </div>
              </div>
            </div>
            <div className="relative hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600"
                alt={i18n.language === 'ar' ? 'مهمات يساعد في تحسين المنزل' : 'Tasker helping with home improvement'}
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Rest of content - constrained width like other dashboard pages */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Popular Services - same as home before creating tasks */}
        <section className="py-16">
          <div>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'ar' ? 'الخدمات الشائعة' : 'Popular services'}
            </h2>
            <p className="text-xl text-gray-600">
              {i18n.language === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'What can we help you with?'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleCategoryClick(service.id)}
                className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left w-full cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4 text-4xl bg-white rounded-lg p-2 shadow-md">
                    {service.icon}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                    {i18n.language === 'ar' ? service.nameAr : service.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {i18n.language === 'ar' ? service.descriptionAr : service.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-teal-600">{service.averagePrice}</span>
                    <ArrowRight className="text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button
              onClick={handleCreateTask}
              variant="outline"
              size="lg"
              className="border-2 hover:border-teal-600 hover:text-teal-600"
            >
              {i18n.language === 'ar' ? 'إنشاء مهمة جديدة' : 'Create a New Task'}
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Your tasks - only show when user has at least one task */}
      {!loading && tasks.length > 0 && (
        <section className="py-16">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-bold text-gray-900">{t('task.myTasks')}</h2>
              <Link to="/dashboard/my-tasks">
                <Button variant="outline" size="lg">
                  {i18n.language === 'ar' ? 'عرض الكل' : 'View all'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg capitalize">{task.category}</CardTitle>
                      <Badge variant={getStateBadgeVariant(task.state)}>
                        {getStateLabel(task)}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2 line-clamp-2">
                      {task.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{task.location?.address || task.location?.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>
                          {new Date(task.schedule?.starts_at || task.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => navigate(task.state === 'draft' ? `/dashboard/tasks/${task.id}/find-tasker` : `/dashboard/tasks/${task.id}`)}
                    >
                      {i18n.language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {tasks.length > 6 && (
              <div className="text-center mt-8">
                <Link to="/dashboard/my-tasks">
                  <Button variant="outline" size="lg">
                    {i18n.language === 'ar' ? 'عرض كل المهام' : 'View all tasks'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

export default DashboardPage;
