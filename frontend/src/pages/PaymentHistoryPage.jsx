import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentAPI } from '../services/api';
import '../styles/PaymentHistoryPage.css';

function PaymentHistoryPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    date_from: '',
    date_to: '',
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const data = await paymentAPI.getPaymentHistory(params);
      setPayments(data.items || data || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      if (err.response?.status === 404) {
        setPayments([]);
      } else {
        setError(err.response?.data?.error?.message || t('payment.loadHistoryError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (payment) => {
    console.log('View Details clicked for payment:', payment.id);
    setSelectedPayment(payment);
    setPaymentDetails(null);
    setLoadingDetails(true);
    
    try {
      console.log('Fetching payment details for:', payment.id);
      const details = await paymentAPI.getPaymentDetails(payment.id);
      console.log('Payment details received:', details);
      setPaymentDetails(details);
    } catch (err) {
      console.error('Failed to load payment details:', err);
      // Fallback to showing basic payment info if details fetch fails
      setPaymentDetails(payment);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const blob = await paymentAPI.downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.response?.data?.error?.message || t('payment.downloadError'));
    }
  };

  const formatAmount = (amount, currency = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      authorized: t('payment.statusAuthorized'),
      captured: t('payment.statusCaptured'),
      failed: t('payment.statusFailed'),
      canceled: t('payment.statusCanceled'),
      refunded: t('payment.statusRefunded'),
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  if (loading && payments.length === 0) {
    return <div className="spinner" />;
  }

  return (
    <div className="payment-history-page">
      <div className="page-header">
        <h1>{t('payment.paymentHistory')}</h1>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Debug: Test modal button - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <button
            onClick={() => {
              const testPayment = {
                id: 'test-payment-123',
                amount: 100,
                currency: 'EGP',
                status: 'captured',
                method: 'card',
                created_at: new Date().toISOString(),
                task_category: 'Cleaning',
                task_description: 'Test task description',
                task_id: 'test-task-456',
                tasker_name: 'Test Tasker',
                breakdown: {
                  tasker_rate: 80,
                  platform_fee: 15,
                  tip: 5
                }
              };
              handleViewDetails(testPayment);
            }}
            style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🧪 Test Payment Details Modal
          </button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>{t('payment.filterByStatus')}</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">{t('payment.allStatuses')}</option>
            <option value="authorized">{t('payment.statusAuthorized')}</option>
            <option value="captured">{t('payment.statusCaptured')}</option>
            <option value="failed">{t('payment.statusFailed')}</option>
            <option value="canceled">{t('payment.statusCanceled')}</option>
            <option value="refunded">{t('payment.statusRefunded')}</option>
          </select>
        </div>
        <div className="filter-group">
          <label>{t('payment.dateFrom')}</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>{t('payment.dateTo')}</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          />
        </div>
        <button
          className="secondary-btn"
          onClick={() => setFilters({ status: 'all', date_from: '', date_to: '' })}
        >
          {t('payment.clearFilters')}
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="empty-state">
          <p>{t('payment.noPayments')}</p>
        </div>
      ) : (
        <div className="payments-list">
          {payments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div className="payment-info">
                  <h3>{payment.task?.category || t('payment.task')} #{payment.booking_id?.slice(0, 8)}</h3>
                  <p className="payment-date">
                    {new Date(payment.created_at || payment.paid_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="payment-amount-status">
                  <span className={`status-badge ${getStatusClass(payment.status)}`}>
                    {getStatusLabel(payment.status)}
                  </span>
                  <span className="amount">{formatAmount(payment.amount, payment.currency)}</span>
                </div>
              </div>
              <div className="payment-details">
                <div className="detail-row">
                  <span className="detail-label">{t('payment.method')}:</span>
                  <span className="detail-value">{payment.method}</span>
                </div>
                {payment.tasker_name && (
                  <div className="detail-row">
                    <span className="detail-label">{t('payment.tasker')}:</span>
                    <span className="detail-value">{payment.tasker_name}</span>
                  </div>
                )}
                {payment.breakdown && (
                  <div className="breakdown">
                    <div className="detail-row">
                      <span className="detail-label">{t('payment.taskerRate')}:</span>
                      <span className="detail-value">
                        {formatAmount(payment.breakdown.tasker_rate, payment.currency)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">{t('payment.platformFee')}:</span>
                      <span className="detail-value">
                        {formatAmount(payment.breakdown.platform_fee, payment.currency)}
                      </span>
                    </div>
                    {payment.breakdown.tip && (
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.tip')}:</span>
                        <span className="detail-value">
                          {formatAmount(payment.breakdown.tip, payment.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="payment-actions">
                <button
                  className="link-btn"
                  onClick={() => handleViewDetails(payment)}
                >
                  {t('payment.viewDetails')}
                </button>
                {payment.status === 'captured' && (
                  <button
                    className="link-btn"
                    onClick={() => handleDownloadReceipt(payment.id)}
                  >
                    {t('payment.downloadReceipt')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPayment && (
        <div className="modal-overlay" onClick={() => {
          setSelectedPayment(null);
          setPaymentDetails(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('payment.paymentDetails')}</h2>
            {loadingDetails ? (
              <div className="spinner" style={{ margin: '2rem auto' }} />
            ) : (
              <div className="payment-details-modal">
                {paymentDetails && (
                  <>
                    <div className="detail-section">
                      <h3>{t('payment.basicInfo')}</h3>
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.id')}:</span>
                        <span className="detail-value">{paymentDetails.id}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.amount')}:</span>
                        <span className="detail-value">
                          {formatAmount(paymentDetails.amount_authorized || paymentDetails.amount, paymentDetails.currency || 'EGP')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.status')}:</span>
                        <span className={`status-badge ${getStatusClass(paymentDetails.status)}`}>
                          {getStatusLabel(paymentDetails.status)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.method')}:</span>
                        <span className="detail-value">{paymentDetails.payment_method || paymentDetails.method || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('payment.date')}:</span>
                        <span className="detail-value">
                          {new Date(paymentDetails.created_at || paymentDetails.paid_at).toLocaleString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {(paymentDetails.task_category || paymentDetails.task_description || paymentDetails.task_id) && (
                      <div className="detail-section">
                        <h3>{t('payment.taskInfo')}</h3>
                        {paymentDetails.task_id && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.taskId')}:</span>
                            <span className="detail-value">{paymentDetails.task_id}</span>
                          </div>
                        )}
                        {paymentDetails.task_category && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.category')}:</span>
                            <span className="detail-value">{paymentDetails.task_category}</span>
                          </div>
                        )}
                        {paymentDetails.task_description && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.description')}:</span>
                            <span className="detail-value">{paymentDetails.task_description}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentDetails.tasker_name && (
                      <div className="detail-section">
                        <h3>{t('payment.taskerInfo')}</h3>
                        <div className="detail-row">
                          <span className="detail-label">{t('payment.tasker')}:</span>
                          <span className="detail-value">{paymentDetails.tasker_name}</span>
                        </div>
                      </div>
                    )}

                    {paymentDetails.breakdown && (
                      <div className="detail-section">
                        <h3>{t('payment.breakdown')}</h3>
                        {paymentDetails.breakdown.tasker_rate && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.taskerRate')}:</span>
                            <span className="detail-value">
                              {formatAmount(paymentDetails.breakdown.tasker_rate, paymentDetails.currency || 'EGP')}
                            </span>
                          </div>
                        )}
                        {paymentDetails.breakdown.platform_fee && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.platformFee')}:</span>
                            <span className="detail-value">
                              {formatAmount(paymentDetails.breakdown.platform_fee, paymentDetails.currency || 'EGP')}
                            </span>
                          </div>
                        )}
                        {paymentDetails.breakdown.tip && (
                          <div className="detail-row">
                            <span className="detail-label">{t('payment.tip')}:</span>
                            <span className="detail-value">
                              {formatAmount(paymentDetails.breakdown.tip, paymentDetails.currency || 'EGP')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="modal-actions">
              {selectedPayment.status === 'captured' && (
                <button
                  className="primary-btn"
                  onClick={() => {
                    handleDownloadReceipt(selectedPayment.id);
                    setSelectedPayment(null);
                    setPaymentDetails(null);
                  }}
                >
                  {t('payment.downloadReceipt')}
                </button>
              )}
              <button
                className="secondary-btn"
                onClick={() => {
                  setSelectedPayment(null);
                  setPaymentDetails(null);
                }}
              >
                {t('payment.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentHistoryPage;
