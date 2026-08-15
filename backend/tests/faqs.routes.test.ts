import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

const sampleFaq = {
  id: 'faq-1',
  question: 'What is CAP?',
  answer: 'Centralized Admission Process for MHT-CET.',
  display_order: 0,
  is_active: true,
  created_at: new Date('2025-01-01T00:00:00Z'),
};

vi.mock('../src/modules/faqs/faqs.repository', () => ({
  getActiveFaqs: vi.fn(async () => [sampleFaq]),
  getAllFaqs: vi.fn(async () => [sampleFaq, { ...sampleFaq, id: 'faq-2', is_active: false }]),
  createFaq: vi.fn(async (input: Record<string, unknown>) => ({
    ...sampleFaq,
    id: 'faq-new',
    display_order: 0,
    ...input,
  })),
  updateFaq: vi.fn(async (id: string, fields: Record<string, unknown>) => {
    if (id === 'missing') return null;
    return { ...sampleFaq, ...fields, id };
  }),
  deleteFaq: vi.fn(async (id: string) => id !== 'missing'),
  toggleFaqActive: vi.fn(async (id: string) => id !== 'missing'),
}));

let app: typeof import('../src/server').app;
let faqsRepository: typeof import('../src/modules/faqs/faqs.repository');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  faqsRepository = await import('../src/modules/faqs/faqs.repository');
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/faqs (public)', () => {
  it('returns the active FAQ envelope', async () => {
    const res = await request(app).get('/api/v1/faqs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([expect.objectContaining({ id: 'faq-1' })]);
  });

  it('carries a public Cache-Control header from the referenceCache middleware', async () => {
    // The controller itself sets `Cache-Control: no-store`, but this route is
    // mounted behind the `referenceCache` middleware (see server.ts), which
    // wraps res.json and overwrites the header on any 2xx JSON response —
    // so the header actually observed by a client is the shared-cache one,
    // not the controller's no-store.
    const res = await request(app).get('/api/v1/faqs');
    expect(res.headers['cache-control']).toBe(
      'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400',
    );
  });
});

describe('Admin faqs routes: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/faqs');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/faqs')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/admin/faqs', () => {
  it('returns all FAQs (active and inactive) for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/faqs').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/v1/admin/faqs', () => {
  const VALID_PAYLOAD = {
    question: 'What is CAP Round 1?',
    answer: 'The first round of the Centralized Admission Process.',
  };

  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/faqs')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a question shorter than 5 characters with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/faqs')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ question: 'Hi?', answer: VALID_PAYLOAD.answer });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing answer with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/faqs')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ question: VALID_PAYLOAD.question });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a FAQ on a valid payload', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/faqs')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('faq-new');
    expect(faqsRepository.createFaq).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/v1/admin/faqs/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .put('/api/v1/admin/faqs/faq-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ question: 'Updated question here?' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects an answer over the max length with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/faqs/faq-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ answer: 'a'.repeat(3001) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the FAQ does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/faqs/missing')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ question: 'Updated question here?' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates a FAQ on a valid payload', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/faqs/faq-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ question: 'Updated question here?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.question).toBe('Updated question here?');
  });
});

describe('DELETE /api/v1/admin/faqs/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/faqs/faq-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('returns 404 when the FAQ does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/faqs/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('deletes a FAQ and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/faqs/faq-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PATCH /api/v1/admin/faqs/:id/toggle', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .patch('/api/v1/admin/faqs/faq-1/toggle')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ is_active: false });

    expect(res.status).toBe(403);
  });

  it('rejects a non-boolean is_active with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/faqs/faq-1/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the FAQ does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/faqs/missing/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: false });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('toggles a FAQ active state', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/faqs/faq-1/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(faqsRepository.toggleFaqActive).toHaveBeenCalledWith('faq-1', false);
  });
});
