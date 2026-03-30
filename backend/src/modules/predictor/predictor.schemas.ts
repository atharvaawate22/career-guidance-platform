import { z } from 'zod';

export const predictorRequestSchema = z
  .object({
    rank: z
      .number({ invalid_type_error: 'Rank must be a number' })
      .int('Rank must be an integer')
      .positive('Rank must be a positive number')
      .optional(),
    percentile: z
      .number({ invalid_type_error: 'Percentile must be a number' })
      .min(0, 'Percentile must be between 0 and 100')
      .max(100, 'Percentile must be between 0 and 100')
      .optional(),
    category: z.string().trim().min(1).max(100).optional(),
    gender: z.string().trim().min(1).max(50).optional(),
    minority_types: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    minority_groups: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    level: z.string().trim().min(1).max(80).optional(),
    preferred_branches: z
      .array(z.string().trim().min(1).max(150))
      .max(20)
      .optional(),
    cities: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    include_tfws: z.boolean().optional(),
  })
  .refine((data) => data.rank !== undefined || data.percentile !== undefined, {
    message: 'Either rank or percentile is required',
    path: ['rank'],
  });
