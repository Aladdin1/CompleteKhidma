import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  CheckCircle,
  Banknote,
  Star,
  FileClock,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { taskerAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function TaskerDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    offeredTasks: 0,
    completedTasks: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const profileData = await taskerAPI.getProfile().catch(() => null);
      if (profileData) {
        setProfile(profileData);
      }

      setStats({
        offeredTasks: profileData?.stats?.offered_bookings_count || 0,
        completedTasks: profileData?.stats?.completed_tasks_count || 0,
        totalEarnings: profileData?.stats?.total_earnings || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || t('tasker.loadError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-0">
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </section>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="space-y-0">
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" />
        </section>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">{t('tasker.loadError')}</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => loadDashboard()} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('tasker.retry')}
              </Button>
              <Button
                onClick={() => navigate('/dashboard/tasker/profile')}
                className="bg-teal-600 hover:bg-teal-700 gap-2"
              >
                {t('tasker.profileCompletePrompt')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isVerified = profile?.status === 'verified' || profile?.status === 'active';
  const hasNoActivity =
    isVerified && stats.offeredTasks === 0 && stats.completedTasks === 0 && stats.totalEarnings === 0;

  return (
    <div className="space-y-0">
      {/* Hero / Welcome Section */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('tasker.dashboardTitle')}
          </h1>
          <p className="text-xl text-gray-700">
            {t('tasker.dashboardWelcome')}, {user?.full_name || user?.phone}
          </p>
        </div>
      </section>

      {/* Content - constrained width like client dashboard */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Pending Verification Banner */}
        {!isVerified && profile && (
          <Card
            className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden"
            dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                  <FileClock className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <CardTitle className="text-amber-900">
                    {t('tasker.applicationUnderReview')}
                  </CardTitle>
                  <CardDescription className="text-amber-800/90 mt-1">
                    {t('tasker.applicationUnderReviewDesc')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/dashboard/tasker/application-status')}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                {t('tasker.viewApplicationStatus')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats + Empty State */}
        {profile && isVerified && (
          <>
            {hasNoActivity ? (
              <Card className="border-teal-100 bg-gradient-to-br from-teal-50/50 to-blue-50/50">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-teal-100">
                      <Sparkles className="h-6 w-6 text-teal-600" />
                    </div>
                    <CardTitle className="text-2xl">{t('tasker.emptyStateTitle')}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {t('tasker.emptyStateDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate('/dashboard/tasker/open-for-bid')}
                    className="bg-teal-600 hover:bg-teal-700 gap-2"
                  >
                    {t('tasker.browseOpenForBids')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-amber-600">
                  <Star className="h-6 w-6 fill-amber-500" />
                  <span className="text-2xl font-bold">
                    {profile.rating?.average?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-600">
                    ({profile.rating?.count || 0} {t('tasker.reviews')})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-teal-600">
                        <Briefcase className="h-5 w-5" />
                        <CardTitle className="text-lg">{t('tasker.offeredTasks')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-gray-900">{stats.offeredTasks}</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-teal-600">
                        <CheckCircle className="h-5 w-5" />
                        <CardTitle className="text-lg">{t('tasker.completedTasks')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-gray-900">{stats.completedTasks}</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-teal-600">
                        <Banknote className="h-5 w-5" />
                        <CardTitle className="text-lg">{t('tasker.totalEarnings')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.totalEarnings.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick links - enhancement #10 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('tasker.quickLinks')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard/tasker/tasks/offered')}
                      className="gap-2"
                    >
                      {t('tasker.myOffers')}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard/tasker/quote-requests')}
                      className="gap-2"
                    >
                      {t('tasker.quoteRequests')}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard/tasker/open-for-bid')}
                      className="gap-2"
                    >
                      {t('tasker.openForBids')}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard/tasker/bookings')}
                      className="gap-2"
                    >
                      {t('tasker.myBookings')}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error message (non-fatal) */}
        {error && profile && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
              <Button
                onClick={() => loadDashboard()}
                variant="ghost"
                size="sm"
                className="mt-2 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {t('tasker.retry')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default TaskerDashboardPage;
