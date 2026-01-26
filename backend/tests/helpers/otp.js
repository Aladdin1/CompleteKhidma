/**
 * OTP test helpers.
 * Use in-memory store (same as auth routes when Redis unavailable).
 */

const OTP_KEY_PREFIX = 'otp:';

function normalizedPhone(phone) {
  return String(phone).replace(/[\s\-\(\)]/g, '');
}

/**
 * Store OTP for a phone (for verify tests).
 * @param {string} phone
 * @param {string} otp
 * @param {{ expired?: boolean }} opts
 */
export function storeOTP(phone, otp, opts = {}) {
  if (!global.otpStore) global.otpStore = new Map();
  const key = `${OTP_KEY_PREFIX}${normalizedPhone(phone)}`;
  const expires = opts.expired ? Date.now() - 1000 : Date.now() + 600_000;
  global.otpStore.set(key, { otp, expires });
}

/**
 * Get stored OTP for a phone (after request OTP).
 * @param {string} phone
 * @returns {{ otp: string } | null}
 */
export function getStoredOTP(phone) {
  if (!global.otpStore) return null;
  const key = `${OTP_KEY_PREFIX}${normalizedPhone(phone)}`;
  const stored = global.otpStore.get(key);
  if (!stored || Date.now() > stored.expires) return null;
  return { otp: stored.otp };
}

/**
 * Generate a valid test device_id (UUID).
 */
export function testDeviceId() {
  return 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
}
