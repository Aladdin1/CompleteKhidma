/**
 * Backend Test Template for User Story Verification
 * 
 * Location: backend/tests/integration/user-stories/us-c-001.test.js
 * 
 * This template can be used to create tests for verifying user stories
 * Copy this file and modify for specific user stories
 */

import request from 'supertest';
import app from '../../../src/index.js';
import { setupTestDB, teardownTestDB, clearTestData } from '../../helpers/db.js';
import { generateOTP, storeOTP } from '../../helpers/otp.js';

// ============================================================================
// USER STORY: US-C-001 - Client Registration with Phone Number
// ============================================================================
// As a new client, I want to register using my phone number, 
// so that I can quickly create an account without email verification.
// ============================================================================

describe('US-C-001: Client Registration with Phone Number', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('POST /api/v1/auth/otp/request', () => {
    it('should accept valid phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone: '+201234567890' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.expires_in).toBeGreaterThan(0);
    });

    it('should reject invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone: 'invalid' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_PHONE');
    });

    it('should enforce rate limiting', async () => {
      const phone = '+201234567890';
      
      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/otp/request')
          .send({ phone })
          .expect(200);
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('POST /api/v1/auth/otp/verify', () => {
    it('should verify valid OTP and create user', async () => {
      const phone = '+201234567890';
      const otp = '123456';

      // Pre-store OTP for testing
      await storeOTP(phone, otp);

      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: otp })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.phone).toBe(phone);
      expect(response.body.tokens).toHaveProperty('access_token');
    });

    it('should reject invalid OTP', async () => {
      const phone = '+201234567890';
      const validOTP = '123456';
      const invalidOTP = '999999';

      await storeOTP(phone, validOTP);

      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: invalidOTP })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_OTP');
    });
  });
});
