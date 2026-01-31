import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import { taskAPI } from '@/services/api';

const PENDING_BOOK_KEY = 'pendingBook';

const BookTask = () => {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const service = services.find(s => s.id === serviceId);
  const selectedTaskerId = searchParams.get('tasker');

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    address: '',
    city: 'Cairo',
    district: '',
    details: ''
  });
  const [loading, setLoading] = useState(false);

  const doSubmit = async (data) => {
    setLoading(true);
    try {
      const taskData = {
        category: serviceId,
        description: data.details,
        location: {
          address: data.address,
          city: data.city,
          district: data.district || undefined,
          point: { lat: 30.0444, lng: 31.2357 },
        },
        schedule: {
          starts_at: new Date(`${data.date}T${data.time}`).toISOString(),
          flexibility_minutes: 60,
        },
      };
      const task = await taskAPI.create(taskData);
      await taskAPI.post(task.id);
      toast({
        title: i18n.language === 'ar' ? 'تم حجز المهمة بنجاح!' : 'Task booked successfully!',
        description: i18n.language === 'ar'
          ? 'سيتم التواصل معك من قبل المهمات قريباً.'
          : 'Your Tasker will be in touch shortly.',
      });
      setTimeout(() => navigate(`/dashboard/tasks/${task.id}`), 2000);
    } catch (err) {
      console.error('Booking error:', err);
      toast({
        title: i18n.language === 'ar' ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message ||
          (i18n.language === 'ar' ? 'فشل في حجز المهمة' : 'Failed to book task'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !searchParams.get('pending')) return;
    const raw = sessionStorage.getItem(PENDING_BOOK_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_BOOK_KEY);
      doSubmit(data);
    } catch (_) {
      sessionStorage.removeItem(PENDING_BOOK_KEY);
    }
  }, [isAuthenticated, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_BOOK_KEY, JSON.stringify(formData));
      const redirect = `/book/${serviceId}${selectedTaskerId ? `?tasker=${selectedTaskerId}` : ''}`;
      const returnUrl = `${redirect}${redirect.includes('?') ? '&' : '?'}pending=1`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    await doSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {i18n.language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found'}
            </h1>
            <Link to="/services">
              <Button variant="outline">
                {i18n.language === 'ar' ? 'تصفح الخدمات' : 'Browse Services'}
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={`/services/${serviceId}`} className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors">
            <ArrowLeft className="mr-2" size={20} />
            {i18n.language === 'ar' ? 'العودة إلى الخدمة' : 'Back to service'}
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="md:col-span-2">
              <Card className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {i18n.language === 'ar' ? 'احجز مهمتك' : 'Book your task'}
                </h1>
                <p className="text-gray-600 mb-8">
                  {i18n.language === 'ar'
                    ? `أخبرنا بتفاصيل مهمة ${i18n.language === 'ar' ? service.nameAr : service.name} الخاصة بك`
                    : `Tell us the details of your ${service.name.toLowerCase()} task`}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-gray-500" />
                        {i18n.language === 'ar' ? 'تاريخ المهمة' : 'Task Date'}
                      </Label>
                      <Input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="h-12"
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-gray-500" />
                        {i18n.language === 'ar' ? 'الوقت المفضل' : 'Preferred Time'}
                      </Label>
                      <Input
                        type="time"
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-gray-500" />
                      {i18n.language === 'ar' ? 'عنوان المهمة' : 'Task Location'}
                    </Label>
                    <Input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder={i18n.language === 'ar' ? 'أدخل عنوانك' : 'Enter your address'}
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="city">{i18n.language === 'ar' ? 'المدينة' : 'City'}</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="district">{i18n.language === 'ar' ? 'الحي (اختياري)' : 'District (Optional)'}</Label>
                      <Input
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="details" className="flex items-center gap-2 mb-2">
                      <MessageSquare size={18} className="text-gray-500" />
                      {i18n.language === 'ar' ? 'تفاصيل المهمة' : 'Task Details'}
                    </Label>
                    <Textarea
                      id="details"
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder={i18n.language === 'ar'
                        ? 'صف ما تحتاج إنجازه، بما في ذلك أي متطلبات أو تفضيلات محددة...'
                        : 'Describe what you need done, including any specific requirements or preferences...'}
                      rows={5}
                      className="resize-none"
                      required
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base"
                    >
                      {loading 
                        ? (i18n.language === 'ar' ? 'جاري الحجز...' : 'Booking...')
                        : (i18n.language === 'ar' ? 'تأكيد والحجز' : 'Confirm & Book')}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div>
              <Card className="p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {i18n.language === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{service.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {i18n.language === 'ar' ? service.nameAr : service.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {i18n.language === 'ar' ? service.descriptionAr : service.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">
                        {i18n.language === 'ar' ? 'التكلفة المقدرة' : 'Estimated cost'}
                      </span>
                      <span className="font-semibold text-gray-900">{service.averagePrice}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {i18n.language === 'ar'
                        ? 'سيتم تأكيد السعر النهائي من قبل مهماتك بناءً على تفاصيل المهمة'
                        : 'Final price will be confirmed by your Tasker based on task details'}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {i18n.language === 'ar' ? 'ما المدرج:' : 'What\'s included:'}
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {i18n.language === 'ar' ? 'مهمات ماهر ومعتمد' : 'Skilled & vetted Tasker'}</li>
                      <li>• {i18n.language === 'ar' ? 'ضمان KHIDMA للسعادة' : 'KHIDMA Happiness Pledge'}</li>
                      <li>• {i18n.language === 'ar' ? 'حماية الدفع الآمن' : 'Secure payment protection'}</li>
                      <li>• {i18n.language === 'ar' ? 'دعم العملاء على مدار الساعة' : '24/7 customer support'}</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BookTask;
