import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', labelAr: 'صباحاً', time: '8:00 AM - 12:00 PM', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', labelAr: 'ظهراً', time: '12:00 PM - 5:00 PM', icon: '☀️' },
  { id: 'evening', label: 'Evening', labelAr: 'مساءً', time: '5:00 PM - 9:00 PM', icon: '🌆' },
  { id: 'flexible', label: 'Flexible', labelAr: 'مرن', time: 'Any time works', icon: '🔄' },
];

const DateTimePicker = ({ selectedDate, selectedTime, onDateChange, onTimeChange, i18n }) => {
  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const locale = i18n?.language === 'ar' ? ar : undefined;
  const isAr = i18n?.language === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-foreground">
            {isAr ? 'متى تحتاج المساعدة؟' : 'When do you need help?'}
          </h3>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {dateOptions.map((date, index) => {
            const isSelected =
              selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
            const isToday = index === 0;

            return (
              <motion.button
                key={date.toISOString()}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onDateChange(date)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                    : 'border-transparent bg-muted/50 text-foreground hover:border-teal-500/30 hover:bg-accent/50'
                }`}
              >
                <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {isToday ? (isAr ? 'اليوم' : 'Today') : format(date, 'EEE', { locale })}
                </span>
                <span className="text-lg font-bold">{format(date, 'd')}</span>
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {format(date, 'MMM', { locale })}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">
            {isAr ? 'الوقت المفضل' : 'Preferred time'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((slot, index) => {
            const isSelected = selectedTime === slot.id;

            return (
              <motion.button
                key={slot.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onTimeChange(slot.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                    : 'border-transparent bg-muted/50 hover:border-amber-500/30 hover:bg-accent/50'
                }`}
              >
                <span className="text-2xl">{slot.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{isAr ? slot.labelAr : slot.label}</p>
                  <p className="text-xs text-muted-foreground">{slot.time}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default DateTimePicker;
