import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, TrendingUp, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';

const BecomeTaskerPublic = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleSignUp = () => {
    if (isAuthenticated) {
      navigate('/dashboard/become-tasker');
    } else {
      navigate('/login?redirect=/dashboard/become-tasker');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-teal-600 to-blue-600 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <h1 className="text-5xl font-bold mb-6">
                  {i18n.language === 'ar' ? 'اكسب المال بطريقتك' : 'Earn money your way'}
                </h1>
                <p className="text-xl mb-8 text-white/90">
                  {i18n.language === 'ar'
                    ? 'كن رئيسك الخاص. حدد جدولك الخاص. احتفظ بالمزيد مما تكسبه.'
                    : 'Be your own boss. Set your own schedule. Keep more of what you earn.'}
                </p>
                <div className="bg-white rounded-xl p-6 text-gray-900">
                  <h3 className="font-semibold mb-4">
                    {i18n.language === 'ar' ? 'ابدأ في 3 خطوات:' : 'Get started in 3 steps:'}
                  </h3>
                  <Button 
                    onClick={handleSignUp}
                    className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base"
                  >
                    {i18n.language === 'ar' ? 'سجل الآن' : 'Sign Up Now'}
                    <ArrowRight className="ml-2" size={20} />
                  </Button>
                </div>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600"
                  alt={i18n.language === 'ar' ? 'كن مهمات' : 'Become a Tasker'}
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {i18n.language === 'ar' ? 'لماذا تصبح مهمات؟' : 'Why become a Tasker?'}
              </h2>
              <p className="text-xl text-gray-600">
                {i18n.language === 'ar' 
                  ? 'انضم إلى آلاف الذين يكسبون بشروطهم الخاصة'
                  : 'Join thousands earning on their own terms'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'أجر رائع' : 'Great Pay'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'حدد أسعارك الخاصة واحتفظ بـ 85% مما تكسبه'
                    : 'Set your own rates and keep 85% of what you earn'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'المرونة' : 'Flexibility'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'اعمل متى تريد، أين تريد'
                    : 'Work when you want, where you want'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'نمو عملك' : 'Grow Your Business'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'ابني سمعتك وقاعدة عملائك'
                    : 'Build your reputation and client base'}
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-orange-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'المجتمع' : 'Community'}
                </h3>
                <p className="text-gray-600">
                  {i18n.language === 'ar'
                    ? 'انضم إلى شبكة داعمة من المهماتين'
                    : 'Join a supportive network of Taskers'}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* How to Get Started */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {i18n.language === 'ar' ? 'كيف تبدأ' : 'How to get started'}
              </h2>
            </div>

            <div className="space-y-8">
              {[
                {
                  title: i18n.language === 'ar' ? 'سجل مجاناً' : 'Sign up for free',
                  desc: i18n.language === 'ar'
                    ? 'أنشئ حسابك في دقائق. لا توجد رسوم للانضمام، ويمكنك البدء على الفور.'
                    : 'Create your account in minutes. No fees to join, and you can start right away.'
                },
                {
                  title: i18n.language === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete your profile',
                  desc: i18n.language === 'ar'
                    ? 'أخبرنا عن مهاراتك وخبراتك والخدمات التي تريد تقديمها. ارفع صورة وحدد أسعارك.'
                    : 'Tell us about your skills, experience, and the services you want to offer. Upload a photo and set your rates.'
                },
                {
                  title: i18n.language === 'ar' ? 'اجتاز فحص الخلفية' : 'Pass a background check',
                  desc: i18n.language === 'ar'
                    ? 'نقوم بإجراء فحص سريع للخلفية للحفاظ على سلامة مجتمعنا. يتم إكمال معظمها خلال 2-3 أيام عمل.'
                    : 'We run a quick background check to keep our community safe. Most are completed within 2-3 business days.'
                },
                {
                  title: i18n.language === 'ar' ? 'ابدأ في الكسب' : 'Start earning',
                  desc: i18n.language === 'ar'
                    ? 'بمجرد الموافقة، يمكنك تصفح المهام المتاحة والبدء في قبول الوظائف. احصل على أموالك مباشرة إلى حسابك.'
                    : 'Once approved, you can browse available tasks and start accepting jobs. Get paid directly to your account.'
                }
              ].map((step, index) => (
                <div key={index} className="flex gap-6 items-start">
                  <div className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-lg text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Earnings Potential */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {i18n.language === 'ar' ? 'إمكانيات الكسب' : 'Earnings potential'}
              </h2>
              <p className="text-xl text-gray-600">
                {i18n.language === 'ar'
                  ? 'شاهد ما يكسبه المهماتون في منطقتك'
                  : 'See what Taskers in your area are making'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-8 text-center">
                <div className="text-5xl font-bold text-teal-600 mb-2">
                  {i18n.language === 'ar' ? '١,٢٠٠' : '$1,200'}
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  {i18n.language === 'ar' ? 'أسبوعياً' : 'per week'}
                </p>
                <p className="text-sm text-gray-500">
                  {i18n.language === 'ar' ? 'دوام جزئي (15-20 ساعة)' : 'Part-time (15-20 hours)'}
                </p>
              </Card>

              <Card className="p-8 text-center bg-teal-50 border-2 border-teal-600">
                <div className="text-5xl font-bold text-teal-600 mb-2">
                  {i18n.language === 'ar' ? '٢,٨٠٠' : '$2,800'}
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  {i18n.language === 'ar' ? 'أسبوعياً' : 'per week'}
                </p>
                <p className="text-sm text-gray-500">
                  {i18n.language === 'ar' ? 'دوام كامل (35-40 ساعة)' : 'Full-time (35-40 hours)'}
                </p>
              </Card>

              <Card className="p-8 text-center">
                <div className="text-5xl font-bold text-teal-600 mb-2">
                  {i18n.language === 'ar' ? '٦٥-١٢٠' : '$65-120'}
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  {i18n.language === 'ar' ? 'في الساعة' : 'per hour'}
                </p>
                <p className="text-sm text-gray-500">
                  {i18n.language === 'ar' ? 'متوسط السعر بالساعة' : 'Average hourly rate'}
                </p>
              </Card>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              {i18n.language === 'ar'
                ? '* تختلف الأرباح حسب الموقع والمهارات وساعات العمل'
                : '* Earnings vary based on location, skills, and hours worked'}
            </p>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {i18n.language === 'ar' ? 'المتطلبات' : 'Requirements'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'عمر 18 سنة أو أكثر' : 'Age 18 or older'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'يجب أن يكون عمرك 18 سنة على الأقل'
                      : 'Must be at least 18 years old'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'فحص الخلفية' : 'Background check'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'اجتياز عملية الفحص الخاصة بنا'
                      : 'Pass our screening process'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'هاتف ذكي' : 'Smartphone'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'جهاز iOS أو Android مطلوب'
                      : 'iOS or Android device required'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'حساب بنكي' : 'Bank account'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'لاستلام المدفوعات'
                      : 'For receiving payments'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'مهارات أو أدوات' : 'Skills or tools'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'للخدمات التي تختارها'
                      : 'For your chosen services'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {i18n.language === 'ar' ? 'وسيلة نقل موثوقة' : 'Reliable transportation'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {i18n.language === 'ar'
                      ? 'للوصول إلى مواقع العملاء'
                      : 'To reach client locations'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              {i18n.language === 'ar' ? 'هل أنت مستعد للبدء في الكسب؟' : 'Ready to start earning?'}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {i18n.language === 'ar'
                ? 'انضم إلى مجتمع المهماتين اليوم. التسجيل مجاني.'
                : 'Join our community of Taskers today. It\'s free to sign up.'}
            </p>
            <Button 
              size="lg" 
              className="bg-white text-teal-600 hover:bg-gray-100 px-8"
              onClick={handleSignUp}
            >
              {i18n.language === 'ar' ? 'تقدم لتصبح مهمات' : 'Apply to Become a Tasker'}
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default BecomeTaskerPublic;
