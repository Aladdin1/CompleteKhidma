/**
 * API integration tests: Auth (US-C-001, US-C-002).
 * POST /auth/otp/request, POST /auth/otp/verify, POST /auth/token/refresh
 */

import request from 'supertest';
import app from '../../src/app.js';
import { getStoredOTP, testDeviceId } from '../helpers/otp.js';

const BASE = '/api/v1/auth';

describe('Auth API', () => {
  const phone = '+201234567890';
  const deviceId = testDeviceId();

  describe('POST /otp/request', () => {
    it('returns 200 and success message for valid phone', async () => {
      const res = await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'OTP sent successfully');
    });

    it('returns 400 for invalid phone (too short)', async () => {
      const res = await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone: '123' })
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('stores OTP in memory for verify step', async () => {
      await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      const stored = getStoredOTP(phone);
      expect(stored).not.toBeNull();
      expect(stored.otp).toMatch(/^\d{6}$/);
    });
  });

  describe('POST /otp/verify', () => {
    it('returns 200 with user and tokens when OTP valid', async () => {
      await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      const stored = getStoredOTP(phone);
      expect(stored).not.toBeNull();

      const res = await request(app)
        .post(`${BASE}/otp/verify`)
        .send({ phone, otp: stored.otp, device_id: deviceId })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe(phone.replace(/[\s\-\(\)]/g, ''));
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('returns 401 for invalid OTP', async () => {
      await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      const res = await request(app)
        .post(`${BASE}/otp/verify`)
        .send({ phone, otp: '999999', device_id: deviceId })
        .expect(401);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_OTP');
    });

    it('returns 400 when device_id missing', async () => {
      await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      const stored = getStoredOTP(phone);
      await request(app)
        .post(`${BASE}/otp/verify`)
        .send({ phone, otp: stored.otp })
        .expect(400);
    });
  });

  describe('Full flow: request OTP -> verify -> token refresh', () => {
    it('completes registration and refresh', async () => {
      await request(app)
        .post(`${BASE}/otp/request`)
        .send({ phone })
        .expect(200);

      const stored = getStoredOTP(phone);
      const verifyRes = await request(app)
        .post(`${BASE}/otp/verify`)
        .send({ phone, otp: stored.otp, device_id: deviceId })
        .expect(200);

      const { access_token, refresh_token } = verifyRes.body;
      expect(access_token).toBeTruthy();
      expect(refresh_token).toBeTruthy();

      const refreshRes = await request(app)
        .post(`${BASE}/token/refresh`)
        .send({ refresh_token })
        .expect(200);

      expect(refreshRes.body).toHaveProperty('access_token');
    });
  });
});
