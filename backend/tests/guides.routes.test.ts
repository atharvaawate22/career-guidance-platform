import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

const ACTIVE_GUIDE_ID = '11111111-1111-1111-1111-111111111111';
const INACTIVE_GUIDE_ID = '33333333-3333-3333-3333-333333333333';
const MISSING_GUIDE_ID = '22222222-2222-2222-2222-222222222222';

vi.mock('../src/modules/guides/guides.repository', () => ({
  getActiveGuides: vi.fn(async () => [
    {
      id: ACTIVE_GUIDE_ID,
      title: 'JEE Guide',
      description: 'A helpful guide',
      file_url: 'https://example.com/guide.pdf',
      is_active: true,
      created_at: new Date('2024-01-01'),
    },
  ]),
  getGuideById: vi.fn(async (id: string) => {
    if (id === ACTIVE_GUIDE_ID) {
      return {
        id,
        title: 'JEE Guide',
        description: 'A helpful guide',
        file_url: 'https://example.com/guide.pdf',
        is_active: true,
        created_at: new Date('2024-01-01'),
      };
    }
    if (id === INACTIVE_GUIDE_ID) {
      return {
        id,
        title: 'Retired Guide',
        description: 'No longer available',
        file_url: 'https://example.com/old.pdf',
        is_active: false,
        created_at: new Date('2023-01-01'),
      };
    }
    return null;
  }),
  recordDownload: vi.fn(async () => undefined),
  createGuide: vi.fn(
    async (guide: { title: string; description: string; file_url: string }) => ({
      id: 'new-guide-id',
      ...guide,
      is_active: true,
      created_at: new Date('2024-06-01'),
    }),
  ),
  getAllGuides: vi.fn(async () => [
    {
      id: ACTIVE_GUIDE_ID,
      title: 'JEE Guide',
      description: 'A helpful guide',
      file_url: 'https://example.com/guide.pdf',
      is_active: true,
      created_at: new Date('2024-01-01'),
    },
  ]),
  deleteGuide: vi.fn(async (id: string) => id !== 'missing'),
  toggleGuide: vi.fn(async (id: string, isActive: boolean) => {
    if (id === 'missing') return null;
    return {
      id,
      title: 'JEE Guide',
      description: 'A helpful guide',
      file_url: 'https://example.com/guide.pdf',
      is_active: isActive,
      created_at: new Date('2024-01-01'),
    };
  }),
  getDownloads: vi.fn(async () => [
    {
      id: 'dl-1',
      name: 'Student',
      email: 'student@example.com',
      percentile: 95.5,
      downloaded_at: new Date('2024-02-01'),
      guide_title: 'JEE Guide',
    },
  ]),
}));

let app: typeof import('../src/server').app;
let guidesRepository: typeof import('../src/modules/guides/guides.repository');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  guidesRepository = await import('../src/modules/guides/guides.repository');
});

describe('GET /api/v1/guides', () => {
  it('returns active guides in the expected envelope', async () => {
    const res = await request(app).get('/api/v1/guides');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(ACTIVE_GUIDE_ID);
  });
});

describe('POST /api/v1/guides/download', () => {
  it('rejects a non-UUID guide_id with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/guides/download')
      .send({ guide_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing guide_id with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/guides/download').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the file_url for an active guide and records the download', async () => {
    const res = await request(app)
      .post('/api/v1/guides/download')
      .send({ guide_id: ACTIVE_GUIDE_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.file_url).toBe('https://example.com/guide.pdf');
    expect(guidesRepository.recordDownload).toHaveBeenCalledWith({
      guide_id: ACTIVE_GUIDE_ID,
    });
  });

  it('returns 400 GUIDE_NOT_FOUND when the guide does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/guides/download')
      .send({ guide_id: MISSING_GUIDE_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GUIDE_NOT_FOUND');
  });

  it('returns 400 GUIDE_UNAVAILABLE for an inactive guide', async () => {
    const res = await request(app)
      .post('/api/v1/guides/download')
      .send({ guide_id: INACTIVE_GUIDE_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GUIDE_UNAVAILABLE');
  });
});

describe('Admin guides routes: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/guides');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/guides')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/admin/guides', () => {
  it('returns all guides for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/guides').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/v1/admin/guides/downloads', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/guides/downloads');
    expect(res.status).toBe(401);
  });

  it('returns download records for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app)
      .get('/api/v1/admin/guides/downloads')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/v1/admin/guides', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({
        title: 'Guide',
        description: 'Desc',
        file_url: 'https://example.com/g.pdf',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a missing title with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ description: 'Desc', file_url: 'https://example.com/g.pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing description with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Guide', file_url: 'https://example.com/g.pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing file_url with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Guide', description: 'Desc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-URL file_url with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Guide', description: 'Desc', file_url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a guide and sanitizes title/description before saving', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/guides')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        title: '<b>JEE</b> Guide',
        description: '<i>Helpful</i> guide',
        file_url: 'https://example.com/g.pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(guidesRepository.createGuide).toHaveBeenCalledWith({
      title: 'JEE Guide',
      description: 'Helpful guide',
      file_url: 'https://example.com/g.pdf',
    });
  });
});

describe('DELETE /api/v1/admin/guides/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete(`/api/v1/admin/guides/${ACTIVE_GUIDE_ID}`)
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('deletes a guide and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete(`/api/v1/admin/guides/${ACTIVE_GUIDE_ID}`)
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the guide does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/guides/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/v1/admin/guides/:id/toggle', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .patch(`/api/v1/admin/guides/${ACTIVE_GUIDE_ID}/toggle`)
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ is_active: false });

    expect(res.status).toBe(403);
  });

  it('rejects a non-boolean is_active with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch(`/api/v1/admin/guides/${ACTIVE_GUIDE_ID}/toggle`)
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('toggles a guide and returns the updated record', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch(`/api/v1/admin/guides/${ACTIVE_GUIDE_ID}/toggle`)
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_active).toBe(false);
  });

  it('returns 404 when the guide does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/guides/missing/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: true });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
