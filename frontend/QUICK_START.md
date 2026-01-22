# Quick Start Guide

## 🚀 Run the Frontend in 3 Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

**Expected output:** Dependencies installed successfully

### Step 2: Start Backend (Required!)

In a **separate terminal**:

```bash
cd backend
npm run dev
```

**Verify:** Backend is running on `http://localhost:3000`

### Step 3: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Open Browser

Open `http://localhost:5173` in your browser.

## ✅ Verify It Works

1. **Login Page Appears** - You should see the login form in Arabic (RTL)
2. **Enter Phone** - Use format: `+201234567890`
3. **Request OTP** - Click "إرسال رمز التحقق"
4. **Check Backend Console** - OTP will be printed (e.g., `OTP for +201234567890: 123456`)
5. **Enter OTP** - Type the 6-digit code
6. **Login** - You should be redirected to dashboard

## 🐛 Troubleshooting

### "npm is not recognized"
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### "Cannot connect to backend"
- Make sure backend is running on port 3000
- Check `backend/src/index.js` for correct port
- Verify no firewall blocking localhost

### "Port 5173 already in use"
- Kill the process using port 5173
- Or change port in `vite.config.js`

### "Module not found" errors
- Delete `node_modules` folder
- Run `npm install` again

## 📝 What to Test

- ✅ Login with OTP
- ✅ Create a task
- ✅ View task list
- ✅ View task details
- ✅ Update profile
- ✅ Switch language (Arabic ↔ English)
- ✅ Logout

## 🎯 Success Criteria

If you can:
1. Login successfully
2. Create a task
3. See it in the task list
4. View task details

**Then the frontend is working correctly!** ✅
