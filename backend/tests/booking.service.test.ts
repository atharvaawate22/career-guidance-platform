import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createBookingMock,
  updateEmailStatusMock,
  updateMeetLinkMock,
  getExistingActiveBookingByEmailMock,
  generateMeetLinkMock,
  sendBookingConfirmationMock,
  sendAdminBookingAlertMock,
  getSettingMock,
  isEmailDomainDeliverableMock,
} = vi.hoisted(() => ({
  createBookingMock: vi.fn(),
  updateEmailStatusMock: vi.fn(),
  updateMeetLinkMock: vi.fn(),
  getExistingActiveBookingByEmailMock: vi.fn(),
  generateMeetLinkMock: vi.fn(),
  sendBookingConfirmationMock: vi.fn(),
  sendAdminBookingAlertMock: vi.fn(),
  getSettingMock: vi.fn(),
  isEmailDomainDeliverableMock: vi.fn(),
}));

vi.mock('../src/modules/booking/booking.repository', () => ({
  createBooking: createBookingMock,
  updateEmailStatus: updateEmailStatusMock,
  updateMeetLink: updateMeetLinkMock,
  getExistingActiveBookingByEmail: getExistingActiveBookingByEmailMock,
}));

vi.mock('../src/modules/booking/calendar.service', () => ({
  generateMeetLink: generateMeetLinkMock,
}));

vi.mock('../src/modules/booking/email.service', () => ({
  sendBookingConfirmation: sendBookingConfirmationMock,
  sendAdminBookingAlert: sendAdminBookingAlertMock,
}));

vi.mock('../src/modules/settings/settings.repository', () => ({
  getSetting: getSettingMock,
}));

// Mock only the DNS-based check; keep the pure typo-suggestion logic real.
vi.mock('../src/utils/emailValidation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/emailValidation')>()),
  isEmailDomainDeliverable: isEmailDomainDeliverableMock,
}));

import { createBooking } from '../src/modules/booking/booking.service';

function defaultBookingSlotConfig() {
  return {
    key: 'booking_slots',
    value: {
      enabled: true,
      slots: ['10:00', '10:30'],
      working_days: [1, 2, 3, 4, 5],
      special_open_dates: [],
      special_closed_dates: [],
    },
    updated_at: new Date().toISOString(),
  };
}

function getNextWeekdaySlot(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffset);
  const todayIST = nowIST.toISOString().slice(0, 10);
  const [year, month, day] = todayIST.split('-').map(Number);
  let target = new Date(Date.UTC(year, month - 1, day));

  if (nowIST.getUTCHours() >= 9) {
    target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  }

  while ([0, 6].includes(target.getUTCDay())) {
    target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  }

  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T10:00:00+05:30`;
}

describe('booking.service createBooking', () => {
  beforeEach(() => {
    // mockReset clears both call history AND any queued mock implementations
    // (mockResolvedValueOnce / mockRejectedValueOnce) to prevent bleed between tests.
    vi.resetAllMocks();
    updateEmailStatusMock.mockResolvedValue(undefined);
    updateMeetLinkMock.mockResolvedValue(undefined);
    // Default: no existing booking for the email
    getExistingActiveBookingByEmailMock.mockResolvedValue(null);
    getSettingMock.mockResolvedValue(defaultBookingSlotConfig());
    // Default: email domain resolves fine
    isEmailDomainDeliverableMock.mockResolvedValue(true);
    // Fire-and-forget admin alert; default to resolving so it never rejects unexpectedly.
    sendAdminBookingAlertMock.mockResolvedValue(true);
  });

  it('rejects bookings when the email domain does not exist', async () => {
    isEmailDomainDeliverableMock.mockResolvedValueOnce(false);

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@gmail.con',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need guidance',
      meeting_time: getNextWeekdaySlot(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_EMAIL_DOMAIN');
    expect(result.error?.message).toContain('gmail.con');
    // No DB write should happen for an undeliverable email
    expect(createBookingMock).not.toHaveBeenCalled();
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
      meeting_time: getNextWeekdaySlot(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SLOT_TAKEN');
  });

  it('returns slot taken error when the requested time is already booked', async () => {
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
      meeting_time: getNextWeekdaySlot(),
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
      meeting_time: getNextWeekdaySlot(),
    });

    // Booking IS saved in DB; we return success:true so the client shows confirmation.
    expect(result.success).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.data?.booking_id).toBe('booking-calendar-fail');
    expect(result.data?.meet_link).toBeNull();
  });

  it('returns calendar error when meet link generation fails', async () => {
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
      meeting_time: getNextWeekdaySlot(),
    });

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
      meeting_time: getNextWeekdaySlot(),
    });

    expect(result.success).toBe(true);
    expect(result.data?.booking_id).toBe('booking-1');
    expect(result.data?.meet_link).toBe('https://meet.google.com/test');
    expect(result.data?.student_name).toBe('Student');
  });

  it('rejects weekend bookings', async () => {
    // Force a Saturday in IST
    const saturday = new Date('2026-05-23T10:00:00+05:30');

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need guidance',
      meeting_time: saturday.toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SLOT_UNAVAILABLE');
    expect(result.error?.message).toContain('working day');
  });

  it('rejects bookings when the admin disables sessions', async () => {
    const config = defaultBookingSlotConfig();
    getSettingMock.mockResolvedValueOnce({
      ...config,
      value: {
        ...config.value,
        enabled: false,
      },
    });

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need guidance',
      meeting_time: getNextWeekdaySlot(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BOOKINGS_DISABLED');
  });

  it('rejects duplicate bookings for same email', async () => {
    getExistingActiveBookingByEmailMock.mockResolvedValueOnce({
      id: 'existing-booking',
      meeting_time: new Date('2026-05-22T10:00:00+05:30'),
    });

    const result = await createBooking({
      student_name: 'Student',
      email: 'student@example.com',
      phone: '9999999999',
      percentile: 90,
      category: 'OPEN',
      branch_preference: 'Computer Engineering',
      meeting_purpose: 'Need guidance',
      meeting_time: getNextWeekdaySlot(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DUPLICATE_BOOKING');
    expect(result.error?.message).toContain('already have a session');
  });
});
