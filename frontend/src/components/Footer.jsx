import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t, i18n } = useTranslation();
  
  return (
    <footer className="bg-white text-gray-700 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="inline-block mb-4">
              <img
                src="/logo.png"
                alt={t('app.name')}
                className="h-10 sm:h-12 w-auto object-contain object-left hover:opacity-90 transition-opacity"
              />
            </Link>
            <p className="text-sm text-gray-600">
              {i18n.language === 'ar' 
                ? 'ربطك بمهماتين ماهرين للمساعدة في المهام اليومية.'
                : 'Connecting you with skilled Taskers to help with everyday tasks.'}
            </p>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold mb-4">
              {i18n.language === 'ar' ? 'اكتشف' : 'Discover'}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'تصفح الخدمات' : 'Browse Services'}
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'كيف يعمل' : 'How it Works'}
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'المهام الشائعة' : 'Popular Tasks'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'الأسعار' : 'Pricing'}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold mb-4">
              {i18n.language === 'ar' ? 'الشركة' : 'Company'}
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'من نحن' : 'About Us'}
                </a>
              </li>
              <li>
                <Link to="/become-tasker" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'كن مهمات' : 'Become a Tasker'}
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'الوظائف' : 'Careers'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'الصحافة' : 'Press'}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold mb-4">
              {i18n.language === 'ar' ? 'الدعم' : 'Support'}
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'مركز المساعدة' : 'Help Center'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'الأمان' : 'Safety'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                  {i18n.language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            © 2024 {t('app.name')}. {i18n.language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-teal-600 transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="text-gray-500 hover:text-teal-600 transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-gray-500 hover:text-teal-600 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="text-gray-500 hover:text-teal-600 transition-colors">
              <Linkedin size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
