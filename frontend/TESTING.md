# Frontend Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Backend (Required)

In a separate terminal:
```bash
cd backend
npm run dev
```

The backend should be running on `http://localhost:3000`

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Testing Checklist

### ✅ Authentication Flow

1. **Open** `http://localhost:5173`
2. **You should see** the login page with Arabic RTL layout
3. **Enter phone number** (format: `+201234567890`)
4. **Click** "إرسال رمز التحقق" (Send Verification Code)
5. **Check backend console** for OTP (currently logged, not sent via SMS)
6. **Enter the 6-digit OTP** from console
7. **Click** "تحقق" (Verify)
8. **You should be redirected** to the dashboard

### ✅ Dashboard

1. **After login**, you should see "مهامي" (My Tasks) page
2. **If no tasks**, you'll see an empty state with "لا توجد مهام بعد"
3. **Click** "+ إنشاء مهمة جديدة" to create a task

### ✅ Task Creation

1. **Fill in the form:**
   - Select a category (e.g., "cleaning")
   - Enter description (e.g., "تنظيف شقة")
   - Enter address (e.g., "123 شارع التحرير، القاهرة")
   - Select date/time
2. **Click** "نشر المهمة" (Post Task)
3. **You should be redirected** to task detail page

### ✅ Task Details

1. **View task information:**
   - Category, description, location
   - Schedule/date
   - Task state badge
2. **If task is posted**, candidates should load automatically
3. **Test cancel** button if needed

### ✅ Profile Management

1. **Click** "الملف الشخصي" (Profile) in navigation
2. **Update** full name and email
3. **Click** "حفظ" (Save)
4. **Verify** changes are saved

### ✅ Language Switching

1. **Click** language switcher (عربي/EN) in header
2. **Verify** UI switches between Arabic (RTL) and English (LTR)
3. **Verify** all text is translated

## Expected Behavior

### ✅ What Should Work

- ✅ Phone-based authentication with OTP
- ✅ Task creation and listing
- ✅ Task detail view
- ✅ Profile management
- ✅ Arabic/English language switching
- ✅ RTL/LTR layout switching
- ✅ Protected routes (redirects to login if not authenticated)
- ✅ Token refresh on 401 errors
- ✅ Error handling and display

### ⚠️ Known Limitations (Backend)

- OTP is logged to console (SMS integration pending)
- Matching service may not populate candidates immediately
- Payment integration not yet implemented
- Real-time updates via WebSocket not yet implemented

## Troubleshooting

### Frontend won't start

1. **Check Node.js version**: `node --version` (should be 18+)
2. **Check npm**: `npm --version`
3. **Clear cache**: `rm -rf node_modules package-lock.json && npm install`
4. **Check port**: Make sure port 5173 is not in use

### Backend connection errors

1. **Verify backend is running** on `http://localhost:3000`
2. **Check CORS** settings in backend
3. **Check API base URL** in `vite.config.js` (proxy settings)

### Authentication issues

1. **Check browser console** for errors
2. **Verify tokens** in localStorage (DevTools → Application → Local Storage)
3. **Clear localStorage** and try again
4. **Check backend logs** for OTP generation

### Translation not working

1. **Check browser language** detection
2. **Manually switch** using language buttons
3. **Verify** `i18n.js` has all translation keys

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ IE11 (not supported)

## Next Steps for Full Testing

1. **Add unit tests** for components
2. **Add integration tests** for API calls
3. **Add E2E tests** with Playwright/Cypress
4. **Test on mobile devices** (responsive design)
5. **Test with real SMS provider** (when integrated)
