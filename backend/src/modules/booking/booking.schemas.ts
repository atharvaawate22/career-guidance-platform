import { z } from 'zod';
import * as settingsRepository from '../settings/settings.repository';
import { VALID_PREDICTOR_CATEGORIES } from '../predictor/predictor.schemas';
import { suggestEmailDomain } from '../../utils/emailValidation';

// Valid booking categories matching Maharashtra MHT-CET reservation structure
export const VALID_BOOKING_CATEGORIES = VALID_PREDICTOR_CATEGORIES;

// Default time slots — used as fallback if DB config is unavailable
const DEFAULT_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export interface BookingSlotConfig {
  enabled: boolean;
  slots: string[];
  working_days: number[];
  special_open_dates: string[];
  special_closed_dates: string[];
}

/**
 * Fetches the current booking slot configuration from the database.
 * Falls back to defaults if the DB is unavailable or the setting doesn't exist.
 */
export async function getBookingSlotConfig(): Promise<BookingSlotConfig> {
  try {
    const setting = await settingsRepository.getSetting('booking_slots');
    if (setting?.value) {
      const v = setting.value as Record<string, unknown>;
      return {
        enabled: v.enabled !== false,
        slots: Array.isArray(v.slots) ? v.slots as string[] : DEFAULT_TIME_SLOTS,
        working_days: Array.isArray(v.working_days) ? v.working_days as number[] : DEFAULT_WORKING_DAYS,
        special_open_dates: Array.isArray(v.special_open_dates) ? v.special_open_dates as string[] : [],
        special_closed_dates: Array.isArray(v.special_closed_dates) ? v.special_closed_dates as string[] : [],
      };
    }
  } catch {
    // Fall back to defaults if DB read fails
  }
  return {
    enabled: true,
    slots: DEFAULT_TIME_SLOTS,
    working_days: DEFAULT_WORKING_DAYS,
    special_open_dates: [],
    special_closed_dates: [],
  };
}

// Base schema without time slot validation (time slot is validated dynamically)
export const createBookingSchema = z.object({
  student_name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be under 120 characters'),

  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address (e.g. name@gmail.com)')
    .superRefine((email, ctx) => {
      const suggested = suggestEmailDomain(email);
      if (suggested) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please enter a valid email address. Did you mean @${suggested}?`,
        });
      }
    }),

  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[0-9\s()-]+$/, 'Phone number contains invalid characters'),

  percentile: z
    .number({ required_error: 'Percentile is required', invalid_type_error: 'Percentile must be a number' })
    .min(0, 'Percentile must be between 0 and 100')
    .max(100, 'Percentile must be between 0 and 100'),

  category: z.enum(VALID_BOOKING_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid category (e.g. OPEN, OBC, SC)' }),
  }),

  branch_preference: z
    .string({ required_error: 'Branch preference is required' })
    .trim()
    .min(2, 'Branch preference must be at least 2 characters')
    .max(200, 'Branch preference is too long'),

  meeting_purpose: z
    .string({ required_error: 'Purpose of meeting is required' })
    .trim()
    .min(3, 'Please describe your purpose (at least 3 characters)')
    .max(500, 'Purpose must be under 500 characters'),

  meeting_time: z
    .string({ required_error: 'Meeting date and time is required' })
    .datetime({ offset: true, message: 'Meeting time must be a valid ISO date-time with timezone offset' })
    .refine(
      (val) => new Date(val) > new Date(),
      'Meeting time must be in the future',
    ),
});
