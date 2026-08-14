import { z } from 'zod';

export const createTestimonialSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().email('Please provide a valid email address'),
  rating: z.number({ invalid_type_error: 'Rating must be a number' }).int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  review_text: z.string().trim().min(10, 'Please share a few more details (at least 10 characters)').max(800, 'Review is too long'),
  // Honeypot — real users never see or fill this field. Anything non-empty
  // here means the request almost certainly came from a bot, so it's
  // silently dropped (no error) rather than rejected, to avoid tipping the
  // bot off that the field is being checked.
  website: z.string().optional().default(''),
});

export const updateTestimonialSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long').optional(),
  rating: z.number({ invalid_type_error: 'Rating must be a number' }).int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
  review_text: z.string().trim().min(10, 'Please share a few more details (at least 10 characters)').max(800, 'Review is too long').optional(),
  // Moderation gate (migration 026). Admin-only — this schema is mounted on
  // the authenticated PATCH /admin/testimonials/:id route.
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});
