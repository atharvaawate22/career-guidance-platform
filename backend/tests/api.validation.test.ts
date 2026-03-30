import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Express } from 'express';

let app: Express;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

beforeAll(async () => {
  const server = await import('../src/server');
  app = server.app;
});

describe('API validation boundaries', () => {
  it('rejects invalid predictor payload', async () => {
    const response = await request(app).post('/api/predict').send({
      percentile: 120,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid booking payload', async () => {
    const response = await request(app).post('/api/bookings').send({
      student_name: 'A',
      email: 'bad-email',
      phone: '123',
      percentile: 105,
      category: '',
      branch_preference: '',
      meeting_purpose: '',
      meeting_time: 'invalid-date',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid admin login payload', async () => {
    const response = await request(app).post('/api/admin/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
