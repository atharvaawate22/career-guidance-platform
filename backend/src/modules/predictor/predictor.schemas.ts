import { z } from 'zod';

export const VALID_PREDICTOR_CATEGORIES = [
  'OPEN',
  'SC',
  'ST',
  'VJ',
  'NT1',
  'NT2',
  'NT3',
  'OBC',
  'SEBC',
  'EWS',
  'TFWS',
  'MI',
  'ORPHAN',
  'DEF_OPEN',
  'DEF_OBC',
  'DEF_SC',
  'DEF_ST',
  'DEF_SEBC',
  'DEF_VJ',
  'DEF_NT1',
  'DEF_NT2',
  'DEF_NT3',
  'PWD_OPEN',
  'PWD_OBC',
  'PWD_SC',
  'PWD_ST',
  'PWD_SEBC',
  'PWD_VJ',
  'PWD_NT1',
  'PWD_NT2',
  'PWD_NT3',
] as const;

export const VALID_PREDICTOR_GENDERS = ['Male', 'Female', 'All'] as const;

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
    category: z.enum(VALID_PREDICTOR_CATEGORIES, {
      errorMap: () => ({
        message: 'Please select a valid admission category.',
      }),
    }),
    gender: z.enum(VALID_PREDICTOR_GENDERS, {
      errorMap: () => ({
        message: 'Please select a valid gender.',
      }),
    }),
    homeUniversity: z.string().trim().min(1).max(120).optional(),
    branch: z.string().trim().min(1).max(150).optional(),
    stage: z.string().trim().min(1).max(20).optional(),
    minority_types: z
      .array(z.string().trim().min(1, 'Minority type cannot be empty').max(50))
      .max(10)
      .optional(),
    minority_groups: z
      .array(z.string().trim().min(1, 'Minority group cannot be empty').max(50))
      .max(20)
      .optional(),
    level: z
      .string()
      .trim()
      .min(1, 'Seat level cannot be empty')
      .max(80)
      .optional(),
    preferred_branches: z
      .array(z.string().trim().min(1, 'Preferred branch cannot be empty').max(150))
      .max(20)
      .optional(),
    cities: z
      .array(z.string().trim().min(1, 'City name cannot be empty').max(100))
      .max(30)
      .optional(),
    include_tfws: z.boolean().optional(),
  })
  .refine((data) => data.rank !== undefined || data.percentile !== undefined, {
    message: 'Either rank or percentile is required',
    path: ['rank'],
  });
