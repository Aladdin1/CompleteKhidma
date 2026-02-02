import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, Plus, Copy, MapPin, Calendar } from 'lucide-react';
import { taskAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

function MyTasksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (location.pathname === '/dashboard/my-tasks') {
      loadTasks();
    }
  }, [location.pathname]);

  useEffect(() => {
    filterAndSortTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterAndSortTasks is stable
  }, [tasks, searchQuery, statusFilter, categoryFilter, sortBy]);

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

  const filterAndSortTasks = () => {
    let filtered = [...tasks];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.description?.toLowerCase().includes(query) ||
        task.category?.toLowerCase().includes(query) ||
        task.location?.address?.toLowerCase().includes(query) ||
        task.location?.city?.toLowerCase().includes(query)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.state === statusFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.schedule?.starts_at || a.created_at);
      const dateB = new Date(b.schedule?.starts_at || b.created_at);
      switch (sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'status':
          return a.state.localeCompare(b.state);
        default:
          return dateB - dateA;
      }
    });
    setFilteredTasks(filtered);
  };

  const handleDuplicate = async (task) => {
    try {
      const loc = {
        address: task.location?.address || '',
        city: task.location?.city || 'Cairo',
        point: {
          lat: task.location?.point?.lat ?? 30.0444,
          lng: task.location?.point?.lng ?? 31.2357,
        },
      };
      if (task.location?.district != null && task.location.district !== '') {
        loc.district = task.location.district;
      }
      const taskData = {
        category: task.category,
        description: task.description,
        location: loc,
        schedule: {
          starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          flexibility_minutes: task.schedule?.flexibility_minutes || 0,
        },
        structured_inputs: task.structured_inputs || {},
      };
      const newTask = await taskAPI.create(taskData);
      navigate(`/dashboard/tasks/${newTask.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to duplicate task');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('task.myTasks')}</h1>
        <Button onClick={() => navigate('/tasks/create')} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-4 w-4" />
          {t('task.create')}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={t('task.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('task.filters')}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('task.filterByStatus')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">{t('task.allStatuses')}</option>
                  <option value="draft">{t('task.draft')}</option>
                  <option value="posted">{t('task.posted')}</option>
                  <option value="matching">{t('task.matching')}</option>
                  <option value="accepted">{t('task.accepted')}</option>
                  <option value="in_progress">{t('task.inProgress')}</option>
                  <option value="completed">{t('task.completed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('task.filterByCategory')}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">{t('task.allCategories')}</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('task.sortBy')}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="newest">{t('task.newestFirst')}</option>
                  <option value="oldest">{t('task.oldestFirst')}</option>
                  <option value="status">{t('task.sortByStatus')}</option>
                </select>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setSortBy('newest');
              }}
              className="mt-4"
            >
              <X className="mr-2 h-4 w-4" />
              {t('task.clearFilters')}
            </Button>
          </CardContent>
        )}
      </Card>

      {tasks.length > 0 && (
        <div className="text-sm text-gray-600">
          {t('task.showingResults', { count: filteredTasks.length, total: tasks.length })}
        </div>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">{t('task.noTasks')}</p>
            <Button onClick={() => navigate('/tasks/create')} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-2 h-4 w-4" />
              {t('task.create')}
            </Button>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">{t('task.noMatchingTasks')}</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
            >
              {t('task.clearFilters')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
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
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{task.location?.address || task.location?.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(task.schedule?.starts_at || task.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(task.state === 'draft' ? `/dashboard/tasks/${task.id}/find-tasker` : `/dashboard/tasks/${task.id}`)}
                  >
                    {i18n.language === 'ar' ? 'عرض' : 'View'}
                  </Button>
                  {task.state === 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDuplicate(task);
                      }}
                      title={i18n.language === 'ar' ? 'نسخ' : 'Duplicate'}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTasksPage;
