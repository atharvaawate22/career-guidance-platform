import { z } from 'zod';

// Valid booking categories matching Maharashtra MHT-CET reservation structure
export const VALID_BOOKING_CATEGORIES = [
  'OPEN', 'SC', 'ST', 'VJ', 'NT1', 'NT2', 'NT3',
  'OBC', 'EWS', 'TFWS', 'DEF_OPEN', 'DEF_OBC', 'PWD_OPEN',
] as const;

// Valid time slots (HH:MM, 10:00–17:30 at 30-min intervals)
const VALID_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export const createBookingSchema = z.object({
  student_name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be under 120 characters'),

  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address (e.g. name@gmail.com)'),

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
    )
    .refine((val) => {
      const slot = new Date(val).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Asia/Kolkata',
      });
      return VALID_TIME_SLOTS.includes(slot);
    }, `Meeting time must be one of the available slots (${VALID_TIME_SLOTS.join(', ')})`),
});
