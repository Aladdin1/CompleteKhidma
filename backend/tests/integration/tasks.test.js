/**
 * Tasks API integration tests.
 * Requires auth (client token). DB required for GET /tasks.
 */

import request from 'supertest';
import app from '../../src/app.js';
import { loginAsClient } from '../helpers/auth.js';

const BASE = '/api/v1/tasks';

describe('Tasks API', () => {
  let token;

  beforeAll(async () => {
    const auth = await loginAsClient();
    token = auth.access_token;
  });

  describe('GET /tasks', () => {
    it('returns 200 with items array when authenticated', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .get(BASE)
        .expect(401);
    });

    it('returns 401 with invalid token', async () => {
      await request(app)
        .get(BASE)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
