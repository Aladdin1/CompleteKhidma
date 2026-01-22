# Quick Fix: Access Denied for Tasker

## Problem
Getting "access denied" or "FORBIDDEN" error when accessing tasker pages.

## Root Cause
The JWT token was issued when you were a `client`. Even after changing your role to `tasker` in the database, the token still contains the old role.

## Solution: Logout and Login Again

**The JWT token contains your role at the time of login. You MUST logout and login again after changing your role.**

### Steps:

1. **Change your role to tasker** (if not done already):
   - Use the "أصبح مهمات" page, OR
   - Update directly in database (see HOW_TO_BECOME_TASKER.md)

2. **Logout** from the frontend
   - Click the logout button

3. **Login again** with the same phone number
   - Enter your phone
   - Request OTP
   - Enter OTP code
   - You'll get a NEW token with the updated role

4. **Now you can access tasker features!**

## Verify Your Role

After logging in, check:
- Open browser console (F12)
- Run: `JSON.parse(localStorage.getItem('user'))`
- Check the `role` field - should be `'tasker'`

## Alternative: Force Token Refresh

If you want to avoid logout/login, you can manually decode and check your token:

```javascript
// In browser console
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Current role in token:', payload.role);
```

If it shows `'client'`, you MUST logout and login again.

## Why This Happens

JWT tokens are stateless and contain the user's role at the time of issuance. The backend validates the role from the token, not from the database on every request (for performance). This is why you need a new token after role change.
