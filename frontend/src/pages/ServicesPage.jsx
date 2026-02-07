import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import '../styles/ServicesPage.css';

const SERVICES = [
  { 
    key: 'cleaning', 
    name: 'Cleaning', 
    nameAr: 'تنظيف', 
    symbol: '🧹',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    averagePrice: '70-130 EGP'
  },
  { 
    key: 'mounting', 
    name: 'Mounting', 
    nameAr: 'تركيب', 
    symbol: '📌',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    averagePrice: '60-120 EGP'
  },
  { 
    key: 'moving', 
    name: 'Moving', 
    nameAr: 'نقل', 
    symbol: '📦',
    image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400',
    averagePrice: '80-150 EGP'
  },
  { 
    key: 'assembly', 
    name: 'Assembly', 
    nameAr: 'تجميع', 
    symbol: '🔧',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    averagePrice: '50-100 EGP'
  },
  { 
    key: 'delivery', 
    name: 'Delivery', 
    nameAr: 'توصيل', 
    symbol: '🚚',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400',
    averagePrice: '40-90 EGP'
  },
  { 
    key: 'handyman', 
    name: 'Handyman', 
    nameAr: 'سباكة ونجارة', 
    symbol: '👷',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    averagePrice: '65-125 EGP'
  },
  { 
    key: 'painting', 
    name: 'Painting', 
    nameAr: 'دهان', 
    symbol: '🎨',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
    averagePrice: '55-110 EGP'
  },
  { 
    key: 'plumbing', 
    name: 'Plumbing', 
    nameAr: 'سباكة', 
    symbol: '🔧',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400',
    averagePrice: '70-130 EGP'
  },
  { 
    key: 'electrical', 
    name: 'Electrical', 
    nameAr: 'كهرباء', 
    symbol: '⚡',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400',
    averagePrice: '75-140 EGP'
  },
  { 
    key: 'developing', 
    name: 'Developing', 
    nameAr: 'برمجة', 
    symbol: '💻',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
    averagePrice: '100-200 EGP'
  },
];

function ServicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const isArabic = i18n.language === 'ar';

  const filteredServices = SERVICES.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.nameAr.includes(searchQuery) ||
    service.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServiceClick = (serviceKey) => {
    if (isAuthenticated) {
      navigate(`/tasks/create?category=${serviceKey}`);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/tasks/create?category=${serviceKey}`)}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filteredServices.length > 0) {
      handleServiceClick(filteredServices[0].key);
    }
  };

  return (
    <div className="services-page">
      {/* Hero Section with Search Bar */}
      <section className="services-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>{t('app.name')}</h1>
            <p className="hero-tagline">{t('app.tagline')}</p>
            <form onSubmit={handleSearchSubmit} className="hero-search-form">
              <input
                type="text"
                placeholder={isArabic ? 'ما الذي تحتاج المساعدة فيه؟' : 'What do you need help with?'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
              <button type="submit" className="hero-search-btn">
                {isArabic ? 'ابدأ' : 'Get Started'}
              </button>
            </form>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600"
              alt={isArabic ? 'عامل يساعد في تحسين المنزل' : 'Tasker helping with home improvement'}
              className="hero-img"
            />
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-section">
        <div className="services-container">
          <h2 className="services-title">
            {isArabic ? 'الخدمات الشائعة' : 'Popular Services'}
          </h2>
          <p className="services-subtitle">
            {isArabic ? 'ما الذي يمكننا مساعدتك فيه؟' : 'What can we help you with?'}
          </p>
          
          <div className="services-grid">
            {filteredServices.map((service) => (
              <button
                key={service.key}
                className="service-card"
                onClick={() => handleServiceClick(service.key)}
              >
                <div className="service-image-container">
                  <img
                    src={service.image}
                    alt={isArabic ? service.nameAr : service.name}
                    className="service-image"
                  />
                  <div className="service-icon-badge">
                    {service.symbol}
                  </div>
                </div>
                <div className="service-content">
                  <h3 className="service-name">
                    {isArabic ? service.nameAr : service.name}
                  </h3>
                  <div className="service-price">
                    {service.averagePrice}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="no-services">
              <p>{isArabic ? `لم يتم العثور على خدمات تطابق "${searchQuery}"` : `No services found matching "${searchQuery}"`}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ServicesPage;
