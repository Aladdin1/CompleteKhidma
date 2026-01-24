import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentAPI } from '../services/api';
import '../styles/SpendingAnalyticsPage.css';

function SpendingAnalyticsPage() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month'); // 'month' or 'year'

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await paymentAPI.getSpendingAnalytics({ period });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      if (err.response?.status === 404) {
        setAnalytics(null);
      } else {
        setError(err.response?.data?.error?.message || t('payment.loadAnalyticsError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, currency = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return <div className="spinner" />;
  }

  if (!analytics) {
    return (
      <div className="spending-analytics-page">
        <div className="page-header">
          <h1>{t('payment.spendingAnalytics')}</h1>
        </div>
        <div className="empty-state">
          <p>{t('payment.noAnalyticsData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spending-analytics-page">
      <div className="page-header">
        <h1>{t('payment.spendingAnalytics')}</h1>
        <div className="period-selector">
          <button
            className={period === 'month' ? 'active' : ''}
            onClick={() => setPeriod('month')}
          >
            {t('payment.thisMonth')}
          </button>
          <button
            className={period === 'year' ? 'active' : ''}
            onClick={() => setPeriod('year')}
          >
            {t('payment.thisYear')}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="analytics-summary">
        <div className="summary-card">
          <h3>{t('payment.totalSpending')}</h3>
          <p className="summary-amount">
            {formatAmount(analytics.total_spending || 0, analytics.currency || 'EGP')}
          </p>
          <p className="summary-label">
            {period === 'month' ? t('payment.thisMonth') : t('payment.thisYear')}
          </p>
        </div>
        <div className="summary-card">
          <h3>{t('payment.totalTasks')}</h3>
          <p className="summary-amount">{analytics.total_tasks || 0}</p>
          <p className="summary-label">{t('payment.completedTasks')}</p>
        </div>
        <div className="summary-card">
          <h3>{t('payment.averageTaskCost')}</h3>
          <p className="summary-amount">
            {formatAmount(analytics.average_task_cost || 0, analytics.currency || 'EGP')}
          </p>
          <p className="summary-label">{t('payment.perTask')}</p>
        </div>
      </div>

      {analytics.category_breakdown && analytics.category_breakdown.length > 0 && (
        <div className="analytics-section">
          <h2>{t('payment.spendingByCategory')}</h2>
          <div className="category-breakdown">
            {analytics.category_breakdown.map((category) => (
              <div key={category.category} className="category-item">
                <div className="category-header">
                  <span className="category-name">{category.category}</span>
                  <span className="category-amount">
                    {formatAmount(category.amount, analytics.currency || 'EGP')}
                  </span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${(category.amount / analytics.total_spending) * 100}%`,
                    }}
                  />
                </div>
                <div className="category-stats">
                  <span>{category.task_count} {t('payment.tasks')}</span>
                  <span>
                    {((category.amount / analytics.total_spending) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.monthly_trends && analytics.monthly_trends.length > 0 && (
        <div className="analytics-section">
          <h2>{t('payment.spendingTrends')}</h2>
          <div className="trends-chart">
            {analytics.monthly_trends.map((month) => (
              <div key={month.month} className="trend-bar">
                <div className="trend-bar-fill" style={{ height: `${(month.amount / analytics.max_monthly_amount) * 100}%` }} />
                <span className="trend-label">{formatAmount(month.amount, analytics.currency || 'EGP')}</span>
                <span className="trend-month">{month.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.top_taskers && analytics.top_taskers.length > 0 && (
        <div className="analytics-section">
          <h2>{t('payment.mostUsedTaskers')}</h2>
          <div className="taskers-list">
            {analytics.top_taskers.map((tasker, index) => (
              <div key={tasker.tasker_id} className="tasker-item">
                <span className="tasker-rank">#{index + 1}</span>
                <div className="tasker-info">
                  <span className="tasker-name">{tasker.tasker_name}</span>
                  <span className="tasker-stats">
                    {tasker.task_count} {t('payment.tasks')} • {formatAmount(tasker.total_spent, analytics.currency || 'EGP')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpendingAnalyticsPage;
