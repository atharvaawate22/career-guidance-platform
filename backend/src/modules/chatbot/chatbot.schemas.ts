import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message is required')
    .max(500, 'Message must be under 500 characters'),
});
