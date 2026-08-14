import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

import { app } from '../src/server';

describe('API validation boundaries', () => {
  it('rejects invalid predictor payload', async () => {
    const response = await request(app).post('/api/v1/predict').send({
      percentile: 120,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid booking payload', async () => {
    const response = await request(app).post('/api/v1/bookings').send({
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
    const response = await request(app).post('/api/v1/admin/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  /**
   * Regression: these two query strings returned HTTP 500 on the busiest
   * public endpoint. Express hands a repeated key through as string[], the
   * controller cast it to `string`, and the SQL builders threw a TypeError.
   * They never reach a repository now — validateQuery rejects first, so these
   * assertions hold with or without a database.
   */
  it('rejects a repeated category query param instead of returning 500', async () => {
    const response = await request(app).get(
      '/api/v1/cutoffs?category=OPEN&category=SC',
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toMatch(/category may only be specified once/i);
  });

  it('rejects a repeated gender query param instead of returning 500', async () => {
    const response = await request(app).get(
      '/api/v1/cutoffs?gender=male&gender=female',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Bounds the Redis cache key — an unbounded free-text filter meant unbounded
  // 6h-TTL keys, which could evict every legitimate hot entry.
  it('rejects an over-long college_name query param', async () => {
    const response = await request(app).get(
      `/api/v1/cutoffs?college_name=${'x'.repeat(500)}`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown category rather than silently returning unfiltered rows', async () => {
    const response = await request(app).get(
      '/api/v1/cutoffs?category=NOT_A_CATEGORY',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a malformed college_code on the meta endpoint', async () => {
    const response = await request(app).get(
      '/api/v1/cutoffs/meta?college_code=../../secrets',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
