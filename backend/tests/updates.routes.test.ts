import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

const mockGetAllUpdates = vi.fn(async () => [
  { id: 'u-1', title: 'MHT-CET Round 1 CAP schedule released', content: 'Details inside.', published_date: '2026-08-01', source_url: null },
]);
const mockCreateUpdate = vi.fn(async (update: { title: string; content: string }) => ({
  id: 'u-new',
  title: update.title,
  content: update.content,
  published_date: '2026-08-15',
  source_url: null,
}));
const mockUpdateUpdate = vi.fn(async (id: string) => {
  if (id === 'missing') return null;
  return { id, title: 'Updated title', content: 'Updated content', published_date: '2026-08-15', edited_at: '2026-08-15T00:00:00.000Z', source_url: null };
});
const mockDeleteUpdate = vi.fn(async (id: string) => id !== 'missing');

vi.mock('../src/modules/updates/updates.service', () => ({
  UpdatesService: vi.fn().mockImplementation(() => ({
    getAllUpdates: mockGetAllUpdates,
    createUpdate: mockCreateUpdate,
    updateUpdate: mockUpdateUpdate,
    deleteUpdate: mockDeleteUpdate,
  })),
}));

let app: typeof import('../src/server').app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
});

describe('GET /updates (public)', () => {
  it('returns the updates envelope', async () => {
    const res = await request(app).get('/api/v1/updates/');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 'u-1', title: 'MHT-CET Round 1 CAP schedule released' });
  });
});

describe('Admin updates routes: auth boundary', () => {
  it('rejects an unauthenticated POST /admin/updates with 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .send({ title: 'Title', content: 'Content body here.' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ title: 'Title', content: 'Content body here.' });
    expect(res.status).toBe(403);
  });

  it('rejects a mutating request without a CSRF token with 403 CSRF_TOKEN_INVALID', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ title: 'Title', content: 'Content body here.' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
});

describe('POST /admin/updates', () => {
  it('rejects a missing title with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ content: 'Content body here.' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a title over 300 characters with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'x'.repeat(301), content: 'Content body here.' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid source_url with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Title', content: 'Content body here.', source_url: 'not-a-valid-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an update for an authenticated admin', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/updates')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'New CAP round announced', content: 'Full details of the new round.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New CAP round announced');
    expect(mockCreateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New CAP round announced', content: 'Full details of the new round.' }),
    );
  });
});

describe('PUT /admin/updates/:id', () => {
  it('rejects a mutating request without a CSRF token with 403', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .put('/api/v1/admin/updates/u-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ title: 'New title' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects an empty body with 400 VALIDATION_ERROR (no fields to update)', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/updates/u-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid source_url with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/updates/u-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ source_url: 'not-a-valid-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the update does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/updates/missing')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'New title' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates an update for an authenticated admin', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/updates/u-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('u-1');
  });
});

describe('DELETE /admin/updates/:id', () => {
  it('rejects a mutating request without a CSRF token with 403', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/updates/u-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('returns 404 when deleting an update that does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/updates/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('deletes an update and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/updates/u-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
