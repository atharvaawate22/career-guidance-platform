import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

vi.mock('../src/modules/resources/resources.repository', () => ({
  getActiveResources: vi.fn(async (category?: string) => [
    {
      id: 'resource-1',
      title: 'Engineering Colleges List',
      description: 'A curated list',
      file_url: 'https://example.com/list.pdf',
      category: category ?? 'Colleges',
      is_active: true,
      created_at: new Date('2024-01-01'),
    },
  ]),
  getAllResources: vi.fn(async () => [
    {
      id: 'resource-1',
      title: 'Engineering Colleges List',
      description: 'A curated list',
      file_url: 'https://example.com/list.pdf',
      category: 'Colleges',
      is_active: true,
      created_at: new Date('2024-01-01'),
    },
  ]),
  createResource: vi.fn(
    async (resource: {
      title: string;
      description: string;
      file_url: string;
      category: string;
    }) => ({
      id: 'new-resource-id',
      ...resource,
      is_active: true,
      created_at: new Date('2024-06-01'),
    }),
  ),
  deleteResource: vi.fn(async (id: string) => id !== 'missing'),
  toggleResourceActive: vi.fn(async (id: string) => id !== 'missing'),
}));

let app: typeof import('../src/server').app;
let resourcesRepository: typeof import('../src/modules/resources/resources.repository');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  resourcesRepository = await import('../src/modules/resources/resources.repository');
});

describe('GET /api/v1/resources', () => {
  it('returns active resources in the expected envelope', async () => {
    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('resource-1');
  });

  it('passes the category query param through to the service', async () => {
    const res = await request(app).get('/api/v1/resources?category=Books');
    expect(res.status).toBe(200);
    expect(resourcesRepository.getActiveResources).toHaveBeenCalledWith('Books');
  });
});

describe('Admin resources routes: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/resources');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/resources')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/admin/resources', () => {
  it('returns all resources for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/resources').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/v1/admin/resources', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({
        title: 'Resource',
        description: 'Desc',
        file_url: 'https://example.com/r.pdf',
        category: 'Colleges',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a missing title with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        description: 'Desc',
        file_url: 'https://example.com/r.pdf',
        category: 'Colleges',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing description with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        title: 'Resource',
        file_url: 'https://example.com/r.pdf',
        category: 'Colleges',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing file_url with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ title: 'Resource', description: 'Desc', category: 'Colleges' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing category with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        title: 'Resource',
        description: 'Desc',
        file_url: 'https://example.com/r.pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a whitespace-only title with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        title: '   ',
        description: 'Desc',
        file_url: 'https://example.com/r.pdf',
        category: 'Colleges',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a resource and sanitizes title/description/category before saving', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/resources')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        title: '<b>Engineering</b> List',
        description: '<i>Curated</i> resource',
        file_url: 'https://example.com/r.pdf',
        category: '<b>Colleges</b>',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(resourcesRepository.createResource).toHaveBeenCalledWith({
      title: 'Engineering List',
      description: 'Curated resource',
      file_url: 'https://example.com/r.pdf',
      category: 'Colleges',
    });
  });
});

describe('DELETE /api/v1/admin/resources/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/resources/resource-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('deletes a resource and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/resources/resource-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the resource does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/resources/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/v1/admin/resources/:id/toggle', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .patch('/api/v1/admin/resources/resource-1/toggle')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ is_active: false });

    expect(res.status).toBe(403);
  });

  it('rejects a non-boolean is_active with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/resources/resource-1/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('deactivates a resource and reports the outcome in the message', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/resources/resource-1/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('activates a resource and reports the outcome in the message', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/resources/resource-1/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/activated/i);
  });

  it('returns 404 when the resource does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/resources/missing/toggle')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ is_active: true });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
