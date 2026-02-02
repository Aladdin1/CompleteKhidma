import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';
import { useTranslation } from 'react-i18next';

const BrowseServices = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const { i18n } = useTranslation();

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.descriptionAr?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'ar' ? 'تصفح الخدمات' : 'Browse Services'}
            </h1>
            <p className="text-lg text-gray-700 mb-6">
              {i18n.language === 'ar' ? 'ابحث عن المهمات المثالي لأي وظيفة' : 'Find the perfect Tasker for any job'}
            </p>
            
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder={i18n.language === 'ar' ? 'ابحث عن خدمة...' : 'Search for a service...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base"
              />
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {filteredServices.length} {i18n.language === 'ar' 
                  ? (filteredServices.length === 1 ? 'خدمة متاحة' : 'خدمات متاحة')
                  : (filteredServices.length === 1 ? 'service' : 'services')} {i18n.language === 'ar' ? 'متاحة' : 'available'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Link
                  key={service.id}
                  to={`/services/${service.id}`}
                  className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-teal-500 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4 text-5xl bg-white rounded-xl p-3 shadow-lg">
                      {service.icon}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {i18n.language === 'ar' ? service.nameAr : service.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {i18n.language === 'ar' ? service.descriptionAr : service.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-teal-600">{service.averagePrice}</span>
                      <ArrowRight className="text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" size={24} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600 mb-4">
                  {i18n.language === 'ar' 
                    ? `لم يتم العثور على خدمات تطابق "${searchQuery}"`
                    : `No services found matching "${searchQuery}"`}
                </p>
                <p className="text-gray-500">
                  {i18n.language === 'ar' 
                    ? 'جرب مصطلح بحث مختلف أو تصفح جميع الخدمات'
                    : 'Try a different search term or browse all services'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default BrowseServices;
