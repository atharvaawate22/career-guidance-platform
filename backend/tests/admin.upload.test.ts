import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';
const UPLOAD_PATH = '/api/v1/admin/upload';

const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n%mock pdf body for tests');
const GARBAGE_BYTES = Buffer.from('this is definitely not a pdf');

let app: typeof import('../src/server').app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe('POST /admin/upload: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });

  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
});

describe('POST /admin/upload: validation', () => {
  it('rejects a path-traversal filename attempt', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: '../../secrets/passwords.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILENAME');
  });

  it('rejects a bucket outside the allow-list', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'not-a-real-bucket', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BUCKET');
  });

  it('rejects a disallowed file extension', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'script.exe' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/octet-stream')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects an empty file body', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_FILE');
  });

  it('rejects a content-type that does not match the extension', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'text/plain')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CONTENT_TYPE');
  });

  it('rejects a body whose magic bytes do not match its declared type', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf')
      .send(GARBAGE_BYTES);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
  });

  it('reports storage as unconfigured when Supabase env vars are missing', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('STORAGE_NOT_CONFIGURED');
  });
});

describe('POST /admin/upload: success path', () => {
  it('uploads a valid PDF and returns its public URL', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post(UPLOAD_PATH)
      .query({ bucket: 'guides', filename: 'file.pdf' })
      .set('Cookie', cookies)
      .set(csrfHeader)
      .set('Content-Type', 'application/pdf')
      .send(VALID_PDF_BYTES);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBe(
      'https://project.supabase.test/storage/v1/object/public/guides/file.pdf',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [uploadUrl, init] = fetchMock.mock.calls[0];
    expect(uploadUrl).toBe(
      'https://project.supabase.test/storage/v1/object/guides/file.pdf',
    );
    expect(init.headers.Authorization).toBe('Bearer test-service-role-key');
  });
});
