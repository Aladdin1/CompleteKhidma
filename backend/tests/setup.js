/**
 * Jest setup – runs before each test file.
 * Sets test env, JWT secret, and clears in-memory stores.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '7d';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';

beforeEach(() => {
  if (global.otpStore) global.otpStore.clear();
  if (global.userStore) global.userStore.clear();
});
