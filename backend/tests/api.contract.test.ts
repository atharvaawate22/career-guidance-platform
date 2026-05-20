import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

import { app } from '../src/server';

describe('API contract: public and auth boundary routes', () => {
  it('generates x-request-id when none is provided', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('echoes provided x-request-id header', async () => {
    const response = await request(app)
      .get('/api/v1/health')
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
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      version: '1.0.0',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('redirects legacy health endpoint to versioned health endpoint', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/api/v1/health');
  });

  it('returns admin login endpoint description', async () => {
    const response = await request(app).get('/api/v1/admin/login');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      endpoint: '/api/v1/admin/login',
      method: 'POST',
      requiredFields: {
        email: 'string',
        password: 'string',
      },
    });
  });

  it('protects admin session endpoint when unauthenticated', async () => {
    const response = await request(app).get('/api/v1/admin/session');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin csrf endpoint when unauthenticated', async () => {
    const response = await request(app).get('/api/v1/admin/csrf');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin logout endpoint when unauthenticated', async () => {
    const response = await request(app).post('/api/v1/admin/logout');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('protects admin update creation when unauthenticated', async () => {
    const response = await request(app)
      .post('/api/v1/admin/updates')
      .send({ title: 't', content: 'c' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });
});
