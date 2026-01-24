import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentAPI } from '../services/api';
import PaymentMethodCard from '../components/PaymentMethodCard';
import '../styles/PaymentMethodsPage.css';

function PaymentMethodsPage() {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    type: 'card',
    number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    holder_name: '',
    provider: '',
    phone: '',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError('');
      const methods = await paymentAPI.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      // If endpoint doesn't exist yet, use empty array
      if (err.response?.status === 404) {
        setPaymentMethods([]);
      } else {
        setError(err.response?.data?.error?.message || t('payment.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMethod(null);
    setFormData({
      type: 'card',
      number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
      holder_name: '',
      provider: '',
      phone: '',
    });
    setShowAddForm(true);
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      number: method.number || '',
      expiry_month: method.expiry_month || '',
      expiry_year: method.expiry_year || '',
      cvv: '',
      holder_name: method.holder_name || '',
      provider: method.provider || '',
      phone: method.phone || '',
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const methodData = {
        type: formData.type,
      };

      if (formData.type === 'card') {
        methodData.number = formData.number;
        methodData.expiry_month = parseInt(formData.expiry_month);
        methodData.expiry_year = parseInt(formData.expiry_year);
        methodData.cvv = formData.cvv;
        methodData.holder_name = formData.holder_name;
      } else if (formData.type === 'wallet') {
        methodData.provider = formData.provider;
        methodData.phone = formData.phone;
      }

      if (editingMethod) {
        await paymentAPI.updatePaymentMethod(editingMethod.id, methodData);
        setSuccess(t('payment.methodUpdated'));
      } else {
        await paymentAPI.addPaymentMethod(methodData);
        setSuccess(t('payment.methodAdded'));
      }

      setShowAddForm(false);
      setEditingMethod(null);
      loadPaymentMethods();
    } catch (err) {
      setError(err.response?.data?.error?.message || t('payment.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodId) => {
    if (!window.confirm(t('payment.confirmDelete'))) return;

    try {
      setLoading(true);
      setError('');
      await paymentAPI.deletePaymentMethod(methodId);
      setSuccess(t('payment.methodDeleted'));
      loadPaymentMethods();
    } catch (err) {
      setError(err.response?.data?.error?.message || t('payment.deleteError'));
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      setLoading(true);
      setError('');
      await paymentAPI.setDefaultPaymentMethod(methodId);
      setSuccess(t('payment.defaultSet'));
      loadPaymentMethods();
    } catch (err) {
      setError(err.response?.data?.error?.message || t('payment.setDefaultError'));
      setLoading(false);
    }
  };

  if (loading && paymentMethods.length === 0) {
    return <div className="spinner" />;
  }

  return (
    <div className="payment-methods-page">
      <div className="page-header">
        <h1>{t('payment.paymentMethods')}</h1>
        <button
          className="primary-btn"
          onClick={handleAdd}
          disabled={showAddForm}
        >
          + {t('payment.addMethod')}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showAddForm && (
        <div className="payment-method-form-card">
          <h2>{editingMethod ? t('payment.editMethod') : t('payment.addMethod')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('payment.methodType')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={!!editingMethod}
              >
                <option value="card">{t('payment.card')}</option>
                <option value="wallet">{t('payment.wallet')}</option>
              </select>
            </div>

            {formData.type === 'card' && (
              <>
                <div className="form-group">
                  <label>{t('payment.cardNumber')}</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value.replace(/\s/g, '') })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={16}
                    required={!editingMethod}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('payment.expiryMonth')}</label>
                    <input
                      type="number"
                      value={formData.expiry_month}
                      onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value })}
                      placeholder="MM"
                      min="1"
                      max="12"
                      required={!editingMethod}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('payment.expiryYear')}</label>
                    <input
                      type="number"
                      value={formData.expiry_year}
                      onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value })}
                      placeholder="YYYY"
                      min={new Date().getFullYear()}
                      required={!editingMethod}
                    />
                  </div>
                  {!editingMethod && (
                    <div className="form-group">
                      <label>{t('payment.cvv')}</label>
                      <input
                        type="text"
                        value={formData.cvv}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                        placeholder="123"
                        maxLength={4}
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>{t('payment.cardholderName')}</label>
                  <input
                    type="text"
                    value={formData.holder_name}
                    onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                    placeholder={t('payment.cardholderNamePlaceholder')}
                    required={!editingMethod}
                  />
                </div>
              </>
            )}

            {formData.type === 'wallet' && (
              <>
                <div className="form-group">
                  <label>{t('payment.walletProvider')}</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    required={!editingMethod}
                  >
                    <option value="">{t('payment.selectProvider')}</option>
                    <option value="vodafone_cash">Vodafone Cash</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="etisalat_money">Etisalat Money</option>
                    <option value="m_pesa">M-Pesa</option>
                    <option value="other">{t('payment.other')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('payment.phoneNumber')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+201234567890"
                    required={!editingMethod}
                  />
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMethod(null);
                }}
              >
                {t('payment.cancel')}
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? t('payment.saving') : (editingMethod ? t('payment.update') : t('payment.add'))}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="payment-methods-list">
        {paymentMethods.length === 0 ? (
          <div className="empty-state">
            <p>{t('payment.noMethods')}</p>
            <button className="primary-btn" onClick={handleAdd}>
              {t('payment.addFirstMethod')}
            </button>
          </div>
        ) : (
          paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isDefault={method.is_default}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default PaymentMethodsPage;
