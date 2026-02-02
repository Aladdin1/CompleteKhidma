import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MapPin, Calendar, Clock, FileText, Check, Shield, Star } from 'lucide-react';

const TIME_SLOT_LABELS = {
  morning: '8:00 AM - 12:00 PM',
  afternoon: '12:00 PM - 5:00 PM',
  evening: '5:00 PM - 9:00 PM',
  flexible: 'Flexible timing',
};

const ReviewSummary = ({
  categoryInfo,
  title,
  description,
  location,
  date,
  timeSlot,
  i18n,
}) => {
  const isAr = i18n?.language === 'ar';
  const locale = isAr ? ar : undefined;

  const items = [
    {
      icon: <div className="text-2xl">{categoryInfo?.emoji}</div>,
      label: isAr ? 'الخدمة' : 'Service',
      value: isAr ? categoryInfo?.nameAr : categoryInfo?.name,
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: isAr ? 'المهمة' : 'Task',
      value: title || (isAr ? 'غير محدد' : 'Not specified'),
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: isAr ? 'الموقع' : 'Location',
      value: location?.address ? location.address.split(',').slice(0, 2).join(', ') : (isAr ? 'لم يتم الاختيار' : 'Not selected'),
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: isAr ? 'التاريخ' : 'Date',
      value: date ? format(date, 'EEEE, MMMM d', { locale }) : (isAr ? 'لم يتم الاختيار' : 'Not selected'),
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: isAr ? 'الوقت' : 'Time',
      value: TIME_SLOT_LABELS[timeSlot] || (isAr ? 'لم يتم الاختيار' : 'Not selected'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="step-card space-y-4">
        <h3 className="font-semibold text-lg text-foreground">
          {isAr ? 'ملخص المهمة' : 'Task Summary'}
        </h3>

        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="font-medium text-foreground truncate">{item.value}</p>
              </div>
              <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
            </motion.div>
          ))}
        </div>

        {description && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
            </p>
            <p className="text-sm text-foreground">{description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-accent/50 border border-teal-500/20">
          <Shield className="w-6 h-6 text-teal-600 mb-2" />
          <p className="font-medium text-sm text-foreground">
            {isAr ? 'حجز آمن' : 'Secure Booking'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'الدفع محمي' : 'Payment protected'}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Star className="w-6 h-6 text-amber-500 mb-2" />
          <p className="font-medium text-sm text-foreground">
            {isAr ? 'مهمات معتمدون' : 'Vetted Taskers'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'فحص خلفية' : 'Background checked'}
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {isAr
          ? 'بالموافقة، أنت توافق على شروط الخدمة وسياسة الخصوصية'
          : 'By confirming, you agree to our Terms of Service and Privacy Policy'}
      </p>
    </motion.div>
  );
};

export default ReviewSummary;
