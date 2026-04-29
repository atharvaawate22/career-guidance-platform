import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createBookingMock,
  updateEmailStatusMock,
  updateMeetLinkMock,
  generateMeetLinkMock,
  sendBookingConfirmationMock,
} = vi.hoisted(() => ({
  createBookingMock: vi.fn(),
  updateEmailStatusMock: vi.fn(),
  updateMeetLinkMock: vi.fn(),
  generateMeetLinkMock: vi.fn(),
  sendBookingConfirmationMock: vi.fn(),
}));

vi.mock('../src/modules/booking/booking.repository', () => ({
  createBooking: createBookingMock,
  updateEmailStatus: updateEmailStatusMock,
  updateMeetLink: updateMeetLinkMock,
}));

vi.mock('../src/modules/booking/calendar.service', () => ({
  generateMeetLink: generateMeetLinkMock,
}));

vi.mock('../src/modules/booking/email.service', () => ({
  sendBookingConfirmation: sendBookingConfirmationMock,
}));

import { createBooking } from '../src/modules/booking/booking.service';

describe('booking.service createBooking', () => {
  beforeEach(() => {
    // mockReset clears both call history AND any queued mock implementations
    // (mockResolvedValueOnce / mockRejectedValueOnce) to prevent bleed between tests.
    vi.resetAllMocks();
    updateEmailStatusMock.mockResolvedValue(undefined);
    updateMeetLinkMock.mockResolvedValue(undefined);
  });

  it('returns slot taken error when insert hits unique slot collision', async () => {
    generateMeetLinkMock.mockResolvedValueOnce('https://meet.google.com/test');
    createBookingMock.mockRejectedValueOnce({ code: '23505' });

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need guidance',
      meeting_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SLOT_TAKEN');
  });

  it('returns success:true + warning when meet link generation fails (booking still saved)', async () => {
    // DB insert succeeds; calendar fails after.
    createBookingMock.mockResolvedValueOnce({ id: 'booking-calendar-fail' });
    generateMeetLinkMock.mockRejectedValueOnce(new Error('calendar failed'));

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need branch guidance',
      meeting_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    });

    // Booking IS saved in DB; we return success:true so the client shows confirmation.
    expect(result.success).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.data?.booking_id).toBe('booking-calendar-fail');
    expect(result.data?.meet_link).toBeNull();
  });

  it('creates booking successfully', async () => {
    // Set up mocks in the same order the service calls them:
    // 1. DB insert (createBooking), 2. calendar (generateMeetLink), 3. email
    createBookingMock.mockResolvedValueOnce({ id: 'booking-1' });
    generateMeetLinkMock.mockResolvedValueOnce('https://meet.google.com/test');
    sendBookingConfirmationMock.mockResolvedValueOnce(true);

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need branch guidance',
      meeting_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.data?.booking_id).toBe('booking-1');
    expect(result.data?.meet_link).toBe('https://meet.google.com/test');
  });
});
