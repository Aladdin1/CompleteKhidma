import { Link } from 'react-router-dom';
import { Search, UserCheck, Calendar, CheckCircle, Shield, Star, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

const HowItWorks = () => {
  const { i18n } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {i18n.language === 'ar' ? 'كيف يعمل KhidmaMart' : 'How KhidmaMart Works'}
            </h1>
            <p className="text-xl text-gray-700">
              {i18n.language === 'ar' 
                ? 'الحصول على المساعدة في قائمة مهامك لم يكن أسهل من قبل'
                : 'Getting help with your to-do list has never been easier'}
            </p>
          </div>
        </section>

        {/* Main Steps */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {/* Step 1 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600"
                    alt={i18n.language === 'ar' ? 'اختر مهمتك' : 'Choose your task'}
                    className="rounded-2xl shadow-xl"
                  />
                </div>
                <div className="order-1 md:order-2">
                  <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-teal-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {i18n.language === 'ar' ? '1. اختر مهمتك' : '1. Choose your task'}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {i18n.language === 'ar'
                      ? 'تصفح مئات الخدمات من تركيب الأثاث إلى إصلاحات المنزل. وصف ما تحتاج إنجازه ومتى تريد إكماله.'
                      : 'Browse hundreds of services from furniture assembly to home repairs. Describe what you need done and when you\'d like it completed.'}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'اختر من أكثر من 100 فئة خدمة' : 'Select from 100+ service categories'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'حدد التاريخ والوقت المفضل لديك' : 'Set your preferred date and time'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'أضف تفاصيل عن مهمتك' : 'Add details about your task'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <UserCheck className="text-purple-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {i18n.language === 'ar' ? '2. اختر مهماتك' : '2. Pick your Tasker'}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {i18n.language === 'ar'
                      ? 'تصفح مهماتين موثوقين بناءً على المراجعات والمهارات والسعر. تحدث معهم لتأكيد التفاصيل قبل الحجز.'
                      : 'Browse trusted Taskers based on reviews, skills, and price. Chat with them to confirm details before booking.'}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'عرض الملفات الشخصية مع التقييمات والمراجعات' : 'View profiles with ratings and reviews'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'قارن الأسعار والتوفر' : 'Compare prices and availability'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'راسل قبل الحجز' : 'Message before you book'}
                      </span>
                    </li>
                  </ul>
                </div>
                <div>
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600"
                    alt={i18n.language === 'ar' ? 'اختر مهماتك' : 'Pick your Tasker'}
                    className="rounded-2xl shadow-xl"
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                  <img
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600"
                    alt={i18n.language === 'ar' ? 'احصل على الإنجاز' : 'Get it done'}
                    className="rounded-2xl shadow-xl"
                  />
                </div>
                <div className="order-1 md:order-2">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {i18n.language === 'ar' ? '3. احصل على الإنجاز' : '3. Get it done'}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {i18n.language === 'ar'
                      ? 'يصل مهماتك في الوقت المحدد ويقوم بالعمل بشكل صحيح. ادفع بأمان عبر المنصة عند اكتمال المهمة.'
                      : 'Your Tasker arrives on time and gets the job done right. Pay securely through the platform when the task is complete.'}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'تتبع مهماتك في الوقت الفعلي' : 'Track your Tasker in real-time'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'دفع آمن عبر التطبيق' : 'Secure payment through the app'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">
                        {i18n.language === 'ar' ? 'اترك مراجعة بعد الإكمال' : 'Leave a review after completion'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {i18n.language === 'ar' ? 'لماذا يحب الناس KhidmaMart' : 'Why people love KhidmaMart'}
              </h2>
              <p className="text-xl text-gray-600">
                {i18n.language === 'ar' ? 'موثوق به من قبل آلاف العملاء' : 'Trusted by thousands of customers'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'معتمد وآمن' : 'Vetted & Safe'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'جميع المهماتين يخضعون لفحوصات الخلفية والتحقق من الهوية'
                    : 'All Taskers pass background checks and identity verification'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-yellow-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'أعلى التقييمات' : 'Top Rated'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'اختر من آلاف المهماتين ذوي التقييمات العالية'
                    : 'Choose from thousands of highly-rated Taskers'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'خدمة سريعة' : 'Fast Service'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'احصل على المساعدة في أقرب وقت اليوم مع توفر في نفس اليوم'
                    : 'Get help as soon as today with same-day availability'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'أسعار عادلة' : 'Fair Prices'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'أسعار شفافة بدون رسوم مخفية'
                    : 'Transparent pricing with no hidden fees'}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              {i18n.language === 'ar' 
                ? 'هل أنت مستعد للتحقق من شيء ما من قائمتك؟'
                : 'Ready to check something off your list?'}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {i18n.language === 'ar'
                ? 'ابدأ اليوم واستمتع براحة KhidmaMart'
                : 'Get started today and experience the convenience of KhidmaMart'}
            </p>
            <Link to="/services">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100 px-8">
                {i18n.language === 'ar' ? 'احجز مهمتك الأولى' : 'Book Your First Task'}
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default HowItWorks;
