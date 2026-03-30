import { z } from 'zod';

export const createBookingSchema = z.object({
  student_name: z
    .string()
    .trim()
    .min(2, 'Student name must be at least 2 characters')
    .max(120, 'Student name is too long'),
  email: z.string().trim().email('Please provide a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 digits')
    .max(20, 'Phone number is too long')
    .regex(/^[+0-9\s()-]+$/, 'Phone number contains invalid characters'),
  percentile: z
    .number({ invalid_type_error: 'Percentile must be a number' })
    .min(0, 'Percentile must be between 0 and 100')
    .max(100, 'Percentile must be between 0 and 100'),
  category: z.string().trim().min(1, 'Category is required').max(100),
  branch_preference: z
    .string()
    .trim()
    .min(1, 'Branch preference is required')
    .max(200),
  meeting_purpose: z
    .string()
    .trim()
    .min(1, 'Meeting purpose is required')
    .max(500),
  meeting_time: z
    .string()
    .datetime({ message: 'meeting_time must be a valid ISO date-time' }),
});
