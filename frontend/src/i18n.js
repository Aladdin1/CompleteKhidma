import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: {
          app: {
            name: 'خدمة',
            tagline: 'منصة خدمات عند الطلب'
          },
          auth: {
            login: 'تسجيل الدخول',
            phoneNumber: 'رقم الهاتف',
            enterOTP: 'أدخل رمز التحقق',
            requestOTP: 'إرسال رمز التحقق',
            verifyOTP: 'تحقق',
            logout: 'تسجيل الخروج',
            invalidOTP: 'رمز التحقق غير صحيح',
            otpSent: 'تم إرسال رمز التحقق',
            changePhone: 'تغيير رقم الهاتف'
          },
          task: {
            create: 'إنشاء مهمة جديدة',
            myTasks: 'مهامي',
            title: 'عنوان المهمة',
            category: 'الفئة',
            description: 'الوصف',
            location: 'الموقع',
            schedule: 'الموعد',
            postTask: 'نشر المهمة',
            cancel: 'إلغاء',
            draft: 'مسودة',
            posted: 'منشور',
            matching: 'قيد المطابقة',
            accepted: 'مقبول',
            inProgress: 'قيد التنفيذ',
            completed: 'مكتمل'
          },
          profile: {
            title: 'الملف الشخصي',
            fullName: 'الاسم الكامل',
            email: 'البريد الإلكتروني',
            save: 'حفظ'
          }
        }
      },
      en: {
        translation: {
          app: {
            name: 'KHIDMA',
            tagline: 'On-demand Services Platform'
          },
          auth: {
            login: 'Login',
            phoneNumber: 'Phone Number',
            enterOTP: 'Enter Verification Code',
            requestOTP: 'Send Verification Code',
            verifyOTP: 'Verify',
            logout: 'Logout',
            invalidOTP: 'Invalid verification code',
            otpSent: 'Verification code sent',
            changePhone: 'Change Phone Number'
          },
          task: {
            create: 'Create New Task',
            myTasks: 'My Tasks',
            title: 'Task Title',
            category: 'Category',
            description: 'Description',
            location: 'Location',
            schedule: 'Schedule',
            postTask: 'Post Task',
            cancel: 'Cancel',
            draft: 'Draft',
            posted: 'Posted',
            matching: 'Matching',
            accepted: 'Accepted',
            inProgress: 'In Progress',
            completed: 'Completed'
          },
          profile: {
            title: 'Profile',
            fullName: 'Full Name',
            email: 'Email',
            save: 'Save'
          }
        }
      }
    },
    fallbackLng: 'ar',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
