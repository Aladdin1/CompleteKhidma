import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskAPI } from '../services/api';
import '../styles/DashboardPage.css';

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

function DashboardPage() {
  const { t } = useTranslation();
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
    loadTasks();
  }, []);

  useEffect(() => {
    filterAndSortTasks();
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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.description?.toLowerCase().includes(query) ||
        task.category?.toLowerCase().includes(query) ||
        task.location?.address?.toLowerCase().includes(query) ||
        task.location?.city?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.state === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Sort
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
      const taskData = {
        category: task.category,
        description: task.description,
        location: {
          address: task.location?.address || '',
          city: task.location?.city || 'Cairo',
          district: task.location?.district,
          point: {
            lat: task.location?.point?.lat || 30.0444,
            lng: task.location?.point?.lng || 31.2357,
          },
        },
        schedule: {
          starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          flexibility_minutes: task.schedule?.flexibility_minutes || 0,
        },
        structured_inputs: task.structured_inputs || {},
      };

      const newTask = await taskAPI.create(taskData);
      // Navigate to the new task
      window.location.href = `/tasks/${newTask.id}`;
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to duplicate task');
    }
  };

  const getStateLabel = (state) => {
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
    return <div className="spinner" />;
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>{t('task.myTasks')}</h1>
        <Link to="/tasks/create" className="create-btn">
          + {t('task.create')}
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder={t('task.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            {t('task.filters')} {showFilters ? '▲' : '▼'}
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>{t('task.filterByStatus')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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

            <div className="filter-group">
              <label>{t('task.filterByCategory')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">{t('task.allCategories')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('task.sortBy')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">{t('task.newestFirst')}</option>
                <option value="oldest">{t('task.oldestFirst')}</option>
                <option value="status">{t('task.sortByStatus')}</option>
              </select>
            </div>

            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setSortBy('newest');
              }}
            >
              {t('task.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {tasks.length > 0 && (
        <div className="results-count">
          {t('task.showingResults', { count: filteredTasks.length, total: tasks.length })}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>{t('task.noTasks')}</p>
          <Link to="/tasks/create" className="create-btn">
            {t('task.create')}
          </Link>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <p>{t('task.noMatchingTasks')}</p>
          <button
            className="clear-filters-btn"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
          >
            {t('task.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="tasks-grid">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <Link to={`/tasks/${task.id}`} className="task-card-link">
                <div className="task-header">
                  <h3>{task.category}</h3>
                  <span className={`state-badge state-${task.state}`}>
                    {getStateLabel(task.state)}
                  </span>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-footer">
                  <span className="task-location">📍 {task.location?.address || task.location?.city}</span>
                  <span className="task-date">
                    {new Date(task.schedule?.starts_at || task.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </Link>
              {task.state === 'completed' && (
                <div className="task-card-actions">
                  <button
                    className="duplicate-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDuplicate(task);
                    }}
                    title={t('task.duplicate')}
                  >
                    {t('task.duplicate')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
