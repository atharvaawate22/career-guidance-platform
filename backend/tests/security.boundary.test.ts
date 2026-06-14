import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-security-boundary-tests';

import { app } from '../src/server';

const SECRET = process.env.JWT_SECRET as string;
const SESSION_COOKIE = 'cgp_admin_session';

const signToken = (
  overrides: Record<string, unknown> = {},
  options?: jwt.SignOptions,
): string =>
  jwt.sign({ userId: 'test-admin', role: 'admin', ...overrides }, SECRET, options);

describe('CORS origin enforcement', () => {
  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://app.cethub.test';
  });

  it('reflects an allowed origin and enables credentials', async () => {
    const origin = 'https://app.cethub.test';
    const res = await request(app).get('/api/v1/health').set('Origin', origin);

    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not reflect a disallowed origin', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://evil.example.com');

    // The origin must never be echoed back for a non-allowlisted site.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Rate limiting (admin login)', () => {
  it('returns 429 RATE_LIMITED after exceeding the auth limiter', async () => {
    const attempts = 12; // authLimiter allows 10 requests / 15 min
    const statuses: number[] = [];
    let limitedBody: { error?: { code?: string } } | undefined;

    // Send an empty body so each request fails fast at validation (400) before
    // touching the DB — the limiter runs first and still counts every request.
    for (let i = 0; i < attempts; i++) {
      const res = await request(app).post('/api/v1/admin/login').send({});
      statuses.push(res.status);
      if (res.status === 429) limitedBody = res.body;
    }

    expect(statuses[0]).not.toBe(429);
    expect(statuses).toContain(429);
    expect(limitedBody?.error?.code).toBe('RATE_LIMITED');
  }, 15000);
});

describe('Authenticated admin boundary', () => {
  it('allows a valid admin token to obtain a CSRF token', async () => {
    const token = signToken({}, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/admin/csrf')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.csrfToken).toEqual(expect.any(String));
  });

  it('rejects an expired token with 401 TOKEN_EXPIRED', async () => {
    const token = signToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    const res = await request(app)
      .get('/api/v1/admin/csrf')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a malformed token with 401 INVALID_TOKEN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/csrf')
      .set('Cookie', [`${SESSION_COOKIE}=not-a-jwt`]);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a non-admin role with 403 FORBIDDEN', async () => {
    const token = signToken({ role: 'user' }, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/admin/csrf')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a mutating request without a CSRF token (403 CSRF_TOKEN_INVALID)', async () => {
    const token = signToken({}, { expiresIn: '1h' });
    const res = await request(app)
      .post('/api/v1/admin/logout')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
});
