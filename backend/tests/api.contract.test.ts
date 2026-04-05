import request from 'supertest';
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-contract-tests';

import { app } from '../src/server';

describe('API contract: public and auth boundary routes', () => {
  it('generates x-request-id when none is provided', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('echoes provided x-request-id header', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('x-request-id', 'test-request-id-001');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('test-request-id-001');
  });

  it('returns API info at root endpoint', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: expect.any(String),
      version: expect.any(String),
      status: 'running',
      endpoints: expect.any(Object),
    });
  });

  it('returns health status contract', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns admin login endpoint description', async () => {
    const response = await request(app).get('/api/admin/login');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      endpoint: '/api/admin/login',
      method: 'POST',
      requiredFields: {
        email: 'string',
        password: 'string',
      },
    });
  });

  it('protects admin session endpoint when unauthenticated', async () => {
    const response = await request(app).get('/api/admin/session');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin csrf endpoint when unauthenticated', async () => {
    const response = await request(app).get('/api/admin/csrf');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin logout endpoint when unauthenticated', async () => {
    const response = await request(app).post('/api/admin/logout');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin update creation when unauthenticated', async () => {
    const response = await request(app)
      .post('/api/admin/updates')
      .send({ title: 't', content: 'c' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });
});

describe('API contract: admin booking endpoints', () => {
  it('PATCH /admin/bookings/:id/status without auth returns 401', async () => {
    const response = await request(app)
      .patch('/api/admin/bookings/some-id/status')
      .send({ status: 'confirmed' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('DELETE /admin/bookings/:id without auth returns 401', async () => {
    const response = await request(app).delete('/api/admin/bookings/some-id');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('GET /admin/bookings without auth returns 401', async () => {
    const response = await request(app).get('/api/admin/bookings');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('PATCH /admin/bookings/:id/status with invalid status returns 400', async () => {
    const token = jwt.sign(
      { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );
    const csrfToken = 'test-csrf-token-contract';

    const response = await request(app)
      .patch('/api/admin/bookings/some-id/status')
      .set('Cookie', [
        `cgp_admin_session=${token}`,
        `cgp_admin_csrf=${csrfToken}`,
      ])
      .set('x-csrf-token', csrfToken)
      .send({ status: 'invalid_status_value' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
