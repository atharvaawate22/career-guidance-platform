import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

vi.mock('../src/modules/settings/settings.repository', () => ({
  getSetting: vi.fn(async (_key: string) => null),
  getAllSettings: vi.fn(async () => []),
  upsertSetting: vi.fn(async (key: string, value: Record<string, unknown>) => ({
    key,
    value,
    updated_at: '2026-01-01T00:00:00.000Z',
  })),
}));

vi.mock('../src/config/database', () => ({
  query: vi.fn(async () => ({ rows: [] })),
}));

let app: typeof import('../src/server').app;
let settingsRepository: typeof import('../src/modules/settings/settings.repository');
let database: typeof import('../src/config/database');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  settingsRepository = await import('../src/modules/settings/settings.repository');
  database = await import('../src/config/database');
});

describe('GET /settings/booking-slots (public)', () => {
  it('returns the default shape when no setting row exists', async () => {
    vi.mocked(settingsRepository.getSetting).mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/settings/booking-slots');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enabled).toBe(true);
    expect(Array.isArray(res.body.data.slots)).toBe(true);
  });

  it('returns the stored value when present', async () => {
    vi.mocked(settingsRepository.getSetting).mockResolvedValueOnce({
      key: 'booking_slots',
      value: { enabled: false, slots: ['10:00'], working_days: [1], special_open_dates: [], special_closed_dates: [] },
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const res = await request(app).get('/api/v1/settings/booking-slots');

    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    expect(res.body.data.slots).toEqual(['10:00']);
  });
});

describe('GET /settings/announcement (public)', () => {
  it('returns the default disabled shape when no setting row exists', async () => {
    vi.mocked(settingsRepository.getSetting).mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/settings/announcement');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ enabled: false, text: '', version: 0 });
  });
});

describe('GET /settings/contact-info (public)', () => {
  it('returns the default empty shape when no setting row exists', async () => {
    vi.mocked(settingsRepository.getSetting).mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/settings/contact-info');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ email: '', phone: '' });
  });
});

describe('Admin settings routes: auth boundary', () => {
  it('rejects an unauthenticated GET /admin/settings with 401', async () => {
    const res = await request(app).get('/api/v1/admin/settings');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role on GET /admin/settings with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/settings')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated PUT /admin/settings/:key with 401', async () => {
    const res = await request(app)
      .put('/api/v1/admin/settings/contact_info')
      .send({ email: 'a@b.com', phone: '123' });
    expect(res.status).toBe(401);
  });

  it('rejects a mutating request without a CSRF token with 403', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .put('/api/v1/admin/settings/contact_info')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ email: 'a@b.com', phone: '123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
});

describe('GET /admin/settings', () => {
  it('returns a key->value map for an authenticated admin', async () => {
    vi.mocked(settingsRepository.getAllSettings).mockResolvedValueOnce([
      { key: 'contact_info', value: { email: 'a@b.com', phone: '123' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { key: 'announcement', value: { enabled: true, text: 'Hi', type: 'info', pages: [], version: 2 }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]);

    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/settings').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contact_info).toEqual({ email: 'a@b.com', phone: '123' });
    expect(res.body.data.announcement.version).toBe(2);
  });
});

describe('PUT /admin/settings/:key', () => {
  it('rejects a key outside the allowed set with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/settings/not_a_real_key')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ foo: 'bar' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a booking_slots body missing required fields with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/settings/booking_slots')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ enabled: true }); // missing slots / working_days

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates booking_slots and persists the parsed value', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/settings/booking_slots')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        enabled: true,
        slots: ['11:00', '11:30'],
        working_days: [1, 2, 3],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(settingsRepository.upsertSetting).toHaveBeenCalledWith(
      'booking_slots',
      expect.objectContaining({
        enabled: true,
        slots: ['11:00', '11:30'],
        working_days: [1, 2, 3],
        slot_duration_minutes: 30,
      }),
    );
  });

  it('bumps the announcement version server-side and sanitizes the text', async () => {
    vi.mocked(settingsRepository.getSetting).mockResolvedValueOnce({
      key: 'announcement',
      value: { enabled: true, text: 'Old', type: 'info', pages: [], version: 5 },
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/settings/announcement')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ enabled: true, text: 'Degree & PG updates', type: 'info', pages: ['/home'] });

    expect(res.status).toBe(200);
    expect(settingsRepository.upsertSetting).toHaveBeenCalledWith(
      'announcement',
      expect.objectContaining({ text: 'Degree & PG updates', version: 6 }),
    );
  });
});

describe('Admin analytics endpoint', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/analytics');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });

  it('aggregates the parallel analytics queries into one payload', async () => {
    vi.mocked(database.query)
      .mockResolvedValueOnce({ rows: [{ booking_status: 'scheduled', count: 3 }] } as never)
      .mockResolvedValueOnce({ rows: [{ date: '2026-08-10', count: 2 }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            total_updates: 5,
            total_bookings: 10,
            pending_bookings: 2,
            active_faqs: 4,
            total_faqs: 6,
            active_resources: 3,
            active_guides: 2,
            total_downloads: 20,
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [{ recent_downloads: 7 }] } as never);

    const { cookies } = adminSessionWithCsrf();
    const res = await request(app).get('/api/v1/admin/analytics').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking_status_breakdown).toEqual([{ booking_status: 'scheduled', count: 3 }]);
    expect(res.body.data.counts.total_updates).toBe(5);
    expect(res.body.data.recent_downloads).toBe(7);
  });
});
