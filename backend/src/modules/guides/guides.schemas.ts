import { z } from 'zod';

export const guideDownloadSchema = z.object({
  guide_id: z.string().trim().uuid('guide_id must be a valid UUID'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name is too long'),
  email: z.string().trim().email('Please provide a valid email address'),
  percentile: z
    .number({ invalid_type_error: 'Percentile must be a number' })
    .min(0, 'Percentile must be between 0 and 100')
    .max(100, 'Percentile must be between 0 and 100')
    .optional(),
});
