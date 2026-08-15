import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

const sampleEvent = {
  id: 'event-1',
  academic_year: 2025,
  round_label: 'CAP Round 1',
  event_label: 'Provisional Allotment',
  display_order: 0,
  planned_date: '2025-08-01',
  revised_date: null,
  revision_history: [],
  status: 'upcoming',
  result_url: null,
  result_note: null,
  notes: null,
  created_at: new Date('2025-01-01T00:00:00Z'),
  updated_at: new Date('2025-01-01T00:00:00Z'),
};

vi.mock('../src/modules/capSchedule/capSchedule.repository', () => ({
  getEventsByYear: vi.fn(async (academicYear: number) => [
    { ...sampleEvent, academic_year: academicYear },
  ]),
  getAllEvents: vi.fn(async () => [sampleEvent]),
  getEventsOnDate: vi.fn(async () => []),
  getEventById: vi.fn(async (id: string) => (id === 'missing' ? null : sampleEvent)),
  createEvent: vi.fn(async (input: Record<string, unknown>) => ({
    ...sampleEvent,
    id: 'event-new',
    ...input,
  })),
  updateEvent: vi.fn(async (id: string, fields: Record<string, unknown>) => {
    if (id === 'missing') return null;
    return { ...sampleEvent, ...fields, id };
  }),
  deleteEvent: vi.fn(async (id: string) => id !== 'missing'),
}));

vi.mock('../src/modules/booking/email.service', () => ({
  sendBookingStatusEmail: vi.fn(async () => true),
}));

let app: typeof import('../src/server').app;
let capScheduleRepository: typeof import('../src/modules/capSchedule/capSchedule.repository');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  capScheduleRepository = await import('../src/modules/capSchedule/capSchedule.repository');
});

beforeEach(() => {
  // clearAllMocks resets call history only — the implementations set in the
  // vi.mock factory above survive, so nothing needs to be re-wired here.
  vi.clearAllMocks();
});

describe('GET /api/v1/cap-schedule-events (public)', () => {
  it('returns the timeline envelope for the active academic year', async () => {
    const res = await request(app).get('/api/v1/cap-schedule-events');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      events: [expect.objectContaining({ id: 'event-1' })],
    });
    expect(res.body.data.last_updated).not.toBeNull();
  });

  it('accepts an explicit academic_year query param', async () => {
    const res = await request(app).get('/api/v1/cap-schedule-events?academic_year=2024');

    expect(res.status).toBe(200);
    expect(res.body.data.academic_year).toBe(2024);
    expect(capScheduleRepository.getEventsByYear).toHaveBeenCalledWith(2024);
  });

  it('rejects a non-numeric academic_year with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/cap-schedule-events?academic_year=not-a-year');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/cap-schedule-events/reminder-check', () => {
  const REMINDER_PATH = '/api/v1/cap-schedule-events/reminder-check';

  it('returns 503 when the reminder token is not configured', async () => {
    delete process.env.CAP_SCHEDULE_REMINDER_TOKEN;
    const res = await request(app).post(REMINDER_PATH);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_CONFIGURED');
  });

  it('rejects a request with a missing or wrong token with 401', async () => {
    process.env.CAP_SCHEDULE_REMINDER_TOKEN = 'reminder-secret';
    const res = await request(app)
      .post(REMINDER_PATH)
      .set('x-reminder-token', 'wrong-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    delete process.env.CAP_SCHEDULE_REMINDER_TOKEN;
  });

  it('runs the reminder check when the token matches', async () => {
    process.env.CAP_SCHEDULE_REMINDER_TOKEN = 'reminder-secret';
    const res = await request(app)
      .post(REMINDER_PATH)
      .set('x-reminder-token', 'reminder-secret');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('checked_date');
    delete process.env.CAP_SCHEDULE_REMINDER_TOKEN;
  });
});

describe('Admin cap-schedule-events routes: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/cap-schedule-events');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/cap-schedule-events')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/admin/cap-schedule-events', () => {
  it('returns all events for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app)
      .get('/api/v1/admin/cap-schedule-events')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/v1/admin/cap-schedule-events', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/cap-schedule-events')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({
        academic_year: 2025,
        round_label: 'CAP Round 1',
        event_label: 'Registration',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a payload missing required fields with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/cap-schedule-events')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ academic_year: 2025 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid planned_date format with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/cap-schedule-events')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        academic_year: 2025,
        round_label: 'CAP Round 1',
        event_label: 'Registration',
        planned_date: '01-08-2025',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an event on a valid payload', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .post('/api/v1/admin/cap-schedule-events')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({
        academic_year: 2025,
        round_label: 'CAP Round 1',
        event_label: 'Registration',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('event-new');
    expect(capScheduleRepository.createEvent).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/v1/admin/cap-schedule-events/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .put('/api/v1/admin/cap-schedule-events/event-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ event_label: 'Updated label' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects an empty body with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/cap-schedule-events/event-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the event does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/cap-schedule-events/missing')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ event_label: 'Updated label' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates an event on a valid payload', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .put('/api/v1/admin/cap-schedule-events/event-1')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ event_label: 'Updated label' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.event_label).toBe('Updated label');
  });
});

describe('DELETE /api/v1/admin/cap-schedule-events/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/cap-schedule-events/event-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('returns 404 when the event does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/cap-schedule-events/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('deletes an event and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/cap-schedule-events/event-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
