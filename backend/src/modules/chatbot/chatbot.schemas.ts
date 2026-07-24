import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message is required')
    .max(500, 'Message must be under 500 characters'),
  /** Client-generated per-tab id used to remember the last college/branch/category across a short follow-up window. Optional — WhatsApp and any client that omits it just gets today's stateless behavior. */
  sessionId: z.string().uuid().optional(),
});
