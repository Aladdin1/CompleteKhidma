/**
 * Auth test helpers – obtain tokens for authenticated requests.
 */

import request from 'supertest';
import app from '../../src/app.js';
import { getStoredOTP, testDeviceId } from './otp.js';

const BASE = '/api/v1/auth';
const deviceId = testDeviceId();

/**
 * Request OTP, verify, return { access_token, refresh_token, user }.
 * @param {string} [phone]
 * @returns {Promise<{ access_token: string, refresh_token: string, user: object }>}
 */
export async function loginAsClient(phone = '+201234567890') {
  await request(app)
    .post(`${BASE}/otp/request`)
    .send({ phone })
    .expect(200);

  const stored = getStoredOTP(phone);
  if (!stored) throw new Error('OTP not stored after request');

  const res = await request(app)
    .post(`${BASE}/otp/verify`)
    .send({ phone, otp: stored.otp, device_id: deviceId })
    .expect(200);

  return {
    access_token: res.body.access_token,
    refresh_token: res.body.refresh_token,
    user: res.body.user,
  };
}
