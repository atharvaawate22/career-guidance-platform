import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500),
  answer: z.string().trim().min(1, 'Answer is required').max(5000),
  display_order: z
    .number({ invalid_type_error: 'display_order must be a number' })
    .int('display_order must be an integer')
    .min(0, 'display_order must be a non-negative integer')
    .optional(),
});

export const updateFaqSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, 'Question must not be empty')
      .max(500)
      .optional(),
    answer: z
      .string()
      .trim()
      .min(1, 'Answer must not be empty')
      .max(5000)
      .optional(),
    display_order: z
      .number({ invalid_type_error: 'display_order must be a number' })
      .int('display_order must be an integer')
      .min(0, 'display_order must be a non-negative integer')
      .optional(),
  })
  .refine(
    (data) =>
      data.question !== undefined ||
      data.answer !== undefined ||
      data.display_order !== undefined,
    { message: 'At least one field (question, answer, or display_order) is required' },
  );
