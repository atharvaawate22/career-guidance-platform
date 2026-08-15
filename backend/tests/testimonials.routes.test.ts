import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

vi.mock('../src/modules/testimonials/testimonials.service', () => ({
  getPublicTestimonials: vi.fn(async () => [
    { id: 't-1', name: 'Aarav', rating: 5, review_text: 'Great guidance!', created_at: new Date('2026-01-01') },
  ]),
  getAllTestimonials: vi.fn(async () => [
    {
      id: 't-1',
      name: 'Aarav',
      email: 'aarav@example.com',
      rating: 5,
      review_text: 'Great guidance!',
      status: 'pending',
      created_at: new Date('2026-01-01'),
    },
  ]),
  createTestimonial: vi.fn(async (input: { name: string }) => ({
    success: true,
    pending: true,
    data: { id: 't-new', name: input.name, rating: 5, review_text: 'text', created_at: new Date() },
  })),
  updateTestimonial: vi.fn(async (id: string) => {
    if (id === 'missing') return null;
    return { id, name: 'Updated Name', rating: 4, review_text: 'Updated text here', created_at: new Date() };
  }),
  deleteTestimonial: vi.fn(async (id: string) => id !== 'missing'),
}));

let app: typeof import('../src/server').app;
let testimonialsService: typeof import('../src/modules/testimonials/testimonials.service');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  testimonialsService = await import('../src/modules/testimonials/testimonials.service');
});

describe('GET /testimonials (public)', () => {
  it('returns the approved testimonials envelope', async () => {
    const res = await request(app).get('/api/v1/testimonials/');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 't-1', name: 'Aarav', rating: 5 });
  });
});

describe('POST /testimonials (public)', () => {
  it('rejects a body missing required fields with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/testimonials/')
      .send({ name: 'A', email: 'not-an-email', rating: 5, review_text: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a rating outside 1-5 with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/testimonials/')
      .send({
        name: 'Valid Name',
        email: 'valid1@example.com',
        rating: 9,
        review_text: 'This is a long enough review text.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a pending testimonial on a valid submission', async () => {
    const res = await request(app)
      .post('/api/v1/testimonials/')
      .send({
        name: 'Valid Name',
        email: 'valid2@example.com',
        rating: 5,
        review_text: 'This is a long enough review text to pass validation.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.pending).toBe(true);
  });

  it('propagates a service-level rejection (e.g. abusive language) as 400', async () => {
    vi.mocked(testimonialsService.createTestimonial).mockResolvedValueOnce({
      success: false,
      error: { code: 'ABUSIVE_LANGUAGE', message: 'Please rework your wording.' },
    });

    const res = await request(app)
      .post('/api/v1/testimonials/')
      .send({
        name: 'Valid Name',
        email: 'valid3@example.com',
        rating: 3,
        review_text: 'This is a long enough review text to pass validation.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ABUSIVE_LANGUAGE');
  });
});

describe('Admin testimonials routes: auth boundary', () => {
  it('rejects an unauthenticated GET /admin/testimonials with 401', async () => {
    const res = await request(app).get('/api/v1/admin/testimonials');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/testimonials')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });

  it('rejects a PATCH without a CSRF token with 403 CSRF_TOKEN_INVALID', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .patch('/api/v1/admin/testimonials/t-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a DELETE without a CSRF token with 403', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/testimonials/t-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });
});

describe('GET /admin/testimonials', () => {
  it('returns the full moderation queue including email and status', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/testimonials').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ email: 'aarav@example.com', status: 'pending' });
  });
});

describe('PATCH /admin/testimonials/:id', () => {
  it('rejects an invalid status value with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/testimonials/t-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'not-a-real-status' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the testimonial does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/testimonials/missing')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('approves a testimonial for an authenticated admin', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/testimonials/t-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(testimonialsService.updateTestimonial).toHaveBeenCalledWith('t-1', { status: 'approved' });
  });
});

describe('DELETE /admin/testimonials/:id', () => {
  it('returns 404 when deleting a testimonial that does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/testimonials/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('deletes a testimonial and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/testimonials/t-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
