import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createBookingMock,
  updateEmailStatusMock,
  generateMeetLinkMock,
  sendBookingConfirmationMock,
} = vi.hoisted(() => ({
  createBookingMock: vi.fn(),
  updateEmailStatusMock: vi.fn(),
  generateMeetLinkMock: vi.fn(),
  sendBookingConfirmationMock: vi.fn(),
}));

vi.mock('../src/modules/booking/booking.repository', () => ({
  createBooking: createBookingMock,
  updateEmailStatus: updateEmailStatusMock,
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
    vi.clearAllMocks();
    updateEmailStatusMock.mockResolvedValue(undefined);
  });

  it('returns validation error for invalid email', async () => {
    const result = await createBooking({
      student_name: 'Student',
      email: 'invalid-email',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Guidance',
      meeting_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns calendar error when meet link generation fails', async () => {
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

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('CALENDAR_ERROR');
  });

  it('creates booking successfully', async () => {
    generateMeetLinkMock.mockResolvedValueOnce('https://meet.google.com/test');
    createBookingMock.mockResolvedValueOnce({ id: 'booking-1' });
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
