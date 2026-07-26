import { Router } from 'express';
import * as testimonialsController from './testimonials.controller';
import { validateBody } from '../../middleware/validateRequest';
import { createTestimonialSchema } from './testimonials.schemas';
import { testimonialLimiter } from '../../middleware/rateLimit';

const router = Router();

router.get('/', testimonialsController.getTestimonials);
router.post(
  '/',
  testimonialLimiter,
  validateBody(createTestimonialSchema),
  testimonialsController.createTestimonial,
);

export default router;
