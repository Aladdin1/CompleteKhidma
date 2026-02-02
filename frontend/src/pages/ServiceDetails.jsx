import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';
import { getCategoryInfo } from '@/data/categoryInfo';
import Stepper from '@/components/serviceFlow/Stepper';
import CategoryBanner from '@/components/serviceFlow/CategoryBanner';
import LocationMap from '@/components/serviceFlow/LocationMap';
import DateTimePicker from '@/components/serviceFlow/DateTimePicker';
import TaskDetailsForm from '@/components/serviceFlow/TaskDetailsForm';
import ReviewSummary from '@/components/serviceFlow/ReviewSummary';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import { taskAPI } from '@/services/api';

const STEPS = [
  { id: 1, label: 'Location', labelAr: 'الموقع' },
  { id: 2, label: 'When', labelAr: 'متى' },
  { id: 3, label: 'Details', labelAr: 'التفاصيل' },
  { id: 4, label: 'Review', labelAr: 'المراجعة' },
];

const TIME_SLOT_TO_SCHEDULE = {
  morning: { hour: 8, minute: 0, flexibility_minutes: 240 },
  afternoon: { hour: 12, minute: 0, flexibility_minutes: 300 },
  evening: { hour: 17, minute: 0, flexibility_minutes: 240 },
  flexible: { hour: 12, minute: 0, flexibility_minutes: 480 },
};

const PENDING_FLOW_KEY = 'pendingServiceFlow';

const ServiceDetails = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const service = services.find((s) => s.id === categoryId);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [location, setLocation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [pendingCreateTask, setPendingCreateTask] = useState(false);

  useEffect(() => {
    if (service) {
      setCategoryInfo(getCategoryInfo(service));
    }
  }, [service]);

  // Restore pending flow after login; if no tasker was selected, create task and show task-created view
  useEffect(() => {
    if (!categoryId || !isAuthenticated) return;
    const raw = sessionStorage.getItem(PENDING_FLOW_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_FLOW_KEY);
      if (data.location) setLocation(data.location);
      if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
      if (data.selectedTime) setSelectedTime(data.selectedTime);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.currentStep) setCurrentStep(Math.min(data.currentStep, 4));
      if (!data.selectedTaskerId && data.location) setPendingCreateTask(true);
    } catch (_) {
      sessionStorage.removeItem(PENDING_FLOW_KEY);
    }
  }, [categoryId, isAuthenticated]);

  // After login with pending flow: create task and show task-created view (once)
  useEffect(() => {
    if (!pendingCreateTask || !isAuthenticated || !location || !categoryId) return;
    setPendingCreateTask(false);
    const doCreate = async () => {
      try {
        const taskData = buildTaskPayload();
        const task = await taskAPI.create(taskData);
        toast({
          title: i18n.language === 'ar' ? 'تم إنشاء المهمة!' : 'Task created!',
          description: i18n.language === 'ar' ? 'اختر مهمات أو احصل على أفضل عرض من الجميع.' : 'Choose a tasker or get the best offer from all.',
        });
        navigate(`/dashboard/tasks/${task.id}/find-tasker`, { replace: true });
      } catch (err) {
        console.error('Task create error:', err);
        toast({
          title: i18n.language === 'ar' ? 'خطأ' : 'Error',
          description: err.response?.data?.error?.message || (i18n.language === 'ar' ? 'فشل في إنشاء المهمة' : 'Failed to create task'),
          variant: 'destructive',
        });
      }
    };
    doCreate();
  }, [pendingCreateTask, isAuthenticated, categoryId, location]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return location !== null;
      case 2:
        return selectedDate !== null && selectedTime !== '';
      case 3:
        return title.trim() !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCategoryChange = (newCategoryInfo) => {
    setCategoryInfo(newCategoryInfo);
    setTitle('');
    const newService = services.find((s) => s.id === newCategoryInfo.id);
    if (newService) {
      navigate(`/services/${newCategoryInfo.id}`, { replace: true });
    }
  };

  const buildTaskPayload = () => {
    const scheduleConfig = TIME_SLOT_TO_SCHEDULE[selectedTime] || TIME_SLOT_TO_SCHEDULE.flexible;
    const d = selectedDate || new Date();
    const startsAt = new Date(d);
    startsAt.setHours(scheduleConfig.hour, scheduleConfig.minute, 0, 0);

    const addressParts = (location?.address || '').split(',').map((s) => s.trim());
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : 'Cairo';
    const district = addressParts.length > 2 ? addressParts[addressParts.length - 3] : null;

    return {
      category: categoryId,
      description: [title, description].filter(Boolean).join('\n\n') || title || description || 'Task',
      location: {
        address: location?.address || '',
        point: { lat: location?.lat ?? 30.0444, lng: location?.lng ?? 31.2357 },
        city: city || 'Cairo',
        district: district || undefined,
      },
      schedule: {
        starts_at: startsAt.toISOString(),
        flexibility_minutes: scheduleConfig.flexibility_minutes,
      },
      structured_inputs: {
        title: title || undefined,
        time_slot: selectedTime || undefined,
      },
    };
  };

  const handleConfirmAndFindTaskers = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem(
        PENDING_FLOW_KEY,
        JSON.stringify({
          categoryId,
          location,
          selectedDate: selectedDate?.toISOString?.(),
          selectedTime,
          title,
          description,
          currentStep: 4,
        })
      );
      navigate(`/login?redirect=${encodeURIComponent(`/services/${categoryId}`)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = buildTaskPayload();
      const task = await taskAPI.create(taskData);
      toast({
        title: i18n.language === 'ar' ? 'تم إنشاء المهمة!' : 'Task created!',
        description: i18n.language === 'ar' ? 'اختر مهمات أو احصل على أفضل عرض من الجميع.' : 'Choose a tasker or get the best offer from all.',
      });
      navigate(`/dashboard/tasks/${task.id}/find-tasker`, { replace: true });
    } catch (err) {
      console.error('Task creation error:', err);
      toast({
        title: i18n.language === 'ar' ? 'خطأ' : 'Error',
        description: err.response?.data?.error?.message || (i18n.language === 'ar' ? 'فشل في إنشاء المهمة' : 'Failed to create task'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsWithLocale = STEPS.map((s) => ({
    ...s,
    label: i18n.language === 'ar' ? s.labelAr : s.label,
  }));

  if (!service || !categoryInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {i18n.language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found'}
            </h1>
            <Link to="/services">
              <button type="button" className="btn-flow-outline">
                {i18n.language === 'ar' ? 'تصفح جميع الخدمات' : 'Browse All Services'}
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="flex-1 py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {i18n.language === 'ar' ? 'العودة إلى الخدمات' : 'Back to Services'}
          </Link>

          <div className="mb-8">
            <Stepper steps={stepsWithLocale} currentStep={currentStep} />
          </div>

          <div className="mb-6">
            <CategoryBanner
              categoryInfo={categoryInfo}
              onChangeCategory={handleCategoryChange}
              i18n={i18n}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              {currentStep === 1 && (
                <div className="step-card">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {i18n.language === 'ar' ? 'أين تحتاج المساعدة؟' : 'Where do you need help?'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {i18n.language === 'ar'
                      ? 'اختر موقعك على الخريطة أو استخدم موقعك الحالي'
                      : 'Select your location on the map or use your current position'}
                  </p>
                  <LocationMap location={location} onLocationChange={setLocation} i18n={i18n} />
                </div>
              )}

              {currentStep === 2 && (
                <div className="step-card">
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    {i18n.language === 'ar' ? 'جدول مهمتك' : 'Schedule your task'}
                  </h2>
                  <DateTimePicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                    i18n={i18n}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="step-card">
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    {i18n.language === 'ar' ? 'أخبرنا عن مهمتك' : 'Tell us about your task'}
                  </h2>
                  <TaskDetailsForm
                    categoryInfo={categoryInfo}
                    title={title}
                    description={description}
                    images={images}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onImagesChange={setImages}
                    i18n={i18n}
                  />
                </div>
              )}

              {currentStep === 4 && (
                <ReviewSummary
                  categoryInfo={categoryInfo}
                  title={title}
                  description={description}
                  location={location}
                  date={selectedDate}
                  timeSlot={selectedTime}
                  i18n={i18n}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button type="button" onClick={handleBack} className="btn-flow-outline flex-1 sm:flex-none">
                <ArrowLeft className="w-5 h-5" />
                {i18n.language === 'ar' ? 'رجوع' : 'Back'}
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="btn-flow-primary flex-1"
              >
                {i18n.language === 'ar' ? 'متابعة' : 'Continue'}
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmAndFindTaskers}
                disabled={!canProceed() || isSubmitting}
                className="btn-flow-secondary flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {i18n.language === 'ar' ? 'جاري الإنشاء...' : 'Creating task...'}
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {i18n.language === 'ar' ? 'تأكيد وإيجاد مهمات' : 'Confirm & Find Taskers'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ServiceDetails;
