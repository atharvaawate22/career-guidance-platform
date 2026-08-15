import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { adminSessionWithCsrf, signAdminToken } from './helpers/auth';

const SESSION_COOKIE = 'cgp_admin_session';

vi.mock('../src/modules/booking/booking.repository', () => ({
  getAllBookings: vi.fn(async (page: number, limit: number) => ({
    data: [
      {
        id: 'booking-1',
        student_name: 'Aarav Kulkarni',
        email: 'aarav@example.com',
        booking_status: 'scheduled',
      },
    ],
    total: 1,
    __page: page,
    __limit: limit,
  })),
  updateBookingStatus: vi.fn(async (id: string, status: string) => {
    if (id === 'missing') return null;
    return {
      id,
      student_name: 'Aarav Kulkarni',
      email: 'aarav@example.com',
      booking_status: status,
    };
  }),
  deleteBooking: vi.fn(async (id: string) => id !== 'missing'),
}));

vi.mock('../src/modules/booking/email.service', () => ({
  sendBookingStatusEmail: vi.fn(async () => undefined),
}));

let app: typeof import('../src/server').app;
let bookingRepository: typeof import('../src/modules/booking/booking.repository');
let emailService: typeof import('../src/modules/booking/email.service');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const server = await import('../src/server');
  app = server.app;
  bookingRepository = await import('../src/modules/booking/booking.repository');
  emailService = await import('../src/modules/booking/email.service');
});

describe('Admin bookings routes: auth boundary', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/bookings');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin role with 403', async () => {
    const token = signAdminToken({ role: 'user' });
    const res = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/bookings', () => {
  it('returns paginated bookings for an authenticated admin', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app)
      .get('/api/v1/admin/bookings?page=2&limit=10')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 10, total: 1 });
  });

  it('caps an oversized limit at 200', async () => {
    const { cookies } = adminSessionWithCsrf();
    const res = await request(app)
      .get('/api/v1/admin/bookings?limit=99999')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(200);
  });
});

describe('PATCH /admin/bookings/:id/status', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/booking-1/status')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`])
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a missing status with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/booking-1/status')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a status outside the allowed set with 400 VALIDATION_ERROR', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/booking-1/status')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'deleted-by-hand' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when the booking does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/missing/status')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates status and fires a cancellation email when status=cancelled', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/booking-1/status')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'cancelled', reason: 'Student requested a reschedule' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(bookingRepository.updateBookingStatus).toHaveBeenCalledWith(
      'booking-1',
      'cancelled',
    );
    expect(emailService.sendBookingStatusEmail).toHaveBeenCalledTimes(1);
  });

  it('does not send an email for a non-terminal status change', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .patch('/api/v1/admin/bookings/booking-1/status')
      .set('Cookie', cookies)
      .set(csrfHeader)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(emailService.sendBookingStatusEmail).not.toHaveBeenCalled();
  });
});

describe('DELETE /admin/bookings/:id', () => {
  it('rejects a mutating request without a CSRF token', async () => {
    const token = signAdminToken();
    const res = await request(app)
      .delete('/api/v1/admin/bookings/booking-1')
      .set('Cookie', [`${SESSION_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
  });

  it('deletes a booking and returns success', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/bookings/booking-1')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when deleting a booking that does not exist', async () => {
    const { cookies, csrfHeader } = adminSessionWithCsrf();
    const res = await request(app)
      .delete('/api/v1/admin/bookings/missing')
      .set('Cookie', cookies)
      .set(csrfHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
