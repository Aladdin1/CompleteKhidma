import { useTranslation } from 'react-i18next';
import '../styles/PaymentMethodCard.css';

function PaymentMethodCard({ method, onEdit, onDelete, onSetDefault, isDefault }) {
  const { t } = useTranslation();

  const getMethodIcon = (type) => {
    switch (type) {
      case 'card':
        return '💳';
      case 'wallet':
        return '📱';
      case 'cash':
        return '💵';
      default:
        return '💳';
    }
  };

  const getMethodLabel = (type) => {
    switch (type) {
      case 'card':
        return t('payment.card');
      case 'wallet':
        return t('payment.wallet');
      case 'cash':
        return t('payment.cash');
      default:
        return type;
    }
  };

  const formatCardNumber = (number) => {
    if (!number) return '';
    const last4 = number.slice(-4);
    return `**** **** **** ${last4}`;
  };

  return (
    <div className={`payment-method-card ${isDefault ? 'default' : ''}`}>
      <div className="payment-method-header">
        <div className="payment-method-info">
          <span className="method-icon">{getMethodIcon(method.type)}</span>
          <div className="method-details">
            <h3>{getMethodLabel(method.type)}</h3>
            {method.type === 'card' && (
              <p className="card-number">{formatCardNumber(method.last4 || method.number)}</p>
            )}
            {method.type === 'wallet' && (
              <p className="wallet-info">
                {method.provider || t('payment.mobileWallet')}
                {method.phone && ` • ${method.phone}`}
              </p>
            )}
            {method.type === 'card' && method.brand && (
              <p className="card-brand">{method.brand}</p>
            )}
            {method.expiry_month && method.expiry_year && (
              <p className="card-expiry">
                {t('payment.expires')}: {String(method.expiry_month).padStart(2, '0')}/{method.expiry_year}
              </p>
            )}
          </div>
        </div>
        {isDefault && (
          <span className="default-badge">{t('payment.default')}</span>
        )}
      </div>
      <div className="payment-method-actions">
        {!isDefault && (
          <button
            className="link-btn"
            onClick={() => onSetDefault(method.id)}
          >
            {t('payment.setAsDefault')}
          </button>
        )}
        <button
          className="link-btn"
          onClick={() => onEdit(method)}
        >
          {t('payment.edit')}
        </button>
        <button
          className="link-btn danger"
          onClick={() => onDelete(method.id)}
        >
          {t('payment.delete')}
        </button>
      </div>
    </div>
  );
}

export default PaymentMethodCard;
