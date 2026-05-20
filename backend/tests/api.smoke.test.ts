import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/modules/auth/auth.service', () => ({
  login: vi.fn(async () => ({
    token: 'mock.jwt.token',
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    },
  })),
}));

vi.mock('../src/modules/booking/booking.service', () => ({
  createBooking: vi.fn(async () => ({
    success: true,
    message: 'Booking created successfully',
    data: {
      booking_id: 'booking-1',
      meet_link: 'https://meet.google.com/test-link',
    },
  })),
}));

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

let app: typeof import('../src/server').app;

beforeAll(async () => {
  const server = await import('../src/server');
  app = server.app;
});

describe('API smoke: critical login and booking flows', () => {
  it('allows admin login with valid payload and sets session cookies', async () => {
    const response = await request(app).post('/api/v1/admin/login').send({
      email: 'admin@example.com',
      password: 'StrongPass#123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      id: 'admin-1',
      role: 'admin',
    });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : typeof setCookieHeader === 'string'
        ? [setCookieHeader]
        : [];

    expect(
      cookies.some((cookie) => cookie.startsWith('cgp_admin_session=')),
    ).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('cgp_admin_csrf='))).toBe(
      true,
    );
  });

  it('creates booking for valid payload', async () => {
    // Build a guaranteed future Wednesday at 10:00 IST (+05:30)
    const now = new Date();
    const target = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Shift to next Wednesday (day 3)
    const day = target.getDay();
    const daysUntilWed = (3 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + daysUntilWed);
    // Format as YYYY-MM-DDT10:00:00+05:30 (valid slot in IST)
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const meetingTime = `${yyyy}-${mm}-${dd}T10:00:00+05:30`;

    const response = await request(app).post('/api/v1/bookings').send({
      student_name: 'Aarav Kulkarni',
      email: 'aarav@example.com',
      phone: '9876543210',
      percentile: 92.4,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need help with option form strategy',
      meeting_time: meetingTime,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.booking_id).toBeTruthy();
    expect(response.body.data.meet_link).toMatch(/^https:\/\//);
  });
});
