import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123';
});

import { app } from '../src/server';

const buildAdminSessionCookie = () => {
  const token = jwt.sign(
    { userId: 'admin-user-1', role: 'admin' },
    String(process.env.JWT_SECRET),
    { expiresIn: '1h' },
  );
  return `cgp_admin_session=${token}`;
};

describe('CSRF protection for admin mutating routes', () => {
  it('returns 403 when CSRF header is missing', async () => {
    const response = await request(app)
      .post('/api/admin/updates')
      .set('Cookie', [buildAdminSessionCookie()])
      .send({ title: 'Test update', content: 'Test content' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('returns 403 when CSRF header and cookie do not match', async () => {
    const response = await request(app)
      .post('/api/admin/updates')
      .set('Cookie', [
        buildAdminSessionCookie(),
        'cgp_admin_csrf=csrf-cookie-token',
      ])
      .set('x-csrf-token', 'csrf-header-token')
      .send({ title: 'Test update', content: 'Test content' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
});
