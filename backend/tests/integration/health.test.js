/**
 * Health check API integration tests.
 */

import request from 'supertest';
import app from '../../src/app.js';

describe('Health API', () => {
  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'khidma-backend' });
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1 returns API info', async () => {
    const res = await request(app).get('/api/v1').expect(200);
    expect(res.body).toMatchObject({ message: 'KHIDMA API v1', version: '1.0.0' });
    expect(res.body.endpoints).toHaveProperty('auth', '/api/v1/auth');
  });
});
