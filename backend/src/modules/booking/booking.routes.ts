import { Router } from 'express';
import * as bookingController from './booking.controller';
import { validateBody } from '../../middleware/validateRequest';
import { createBookingSchema } from './booking.schemas';
import { bookingLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    endpoint: '/api/v1/bookings',
    method: 'POST',
    description: 'Book a counseling session with admission experts',
    requiredFields: {
      studentName: 'string',
      email: 'string',
      phone: 'string',
      percentile: 'number',
      category: 'string',
      branchPreference: 'string',
      meetingPurpose: 'string',
      preferredDate: 'string (ISO 8601 date)',
      preferredTime: 'string (HH:MM format)',
    },
  });
});

// Public route for creating bookings
router.post(
  '/',
  bookingLimiter,
  validateBody(createBookingSchema),
  bookingController.createBooking,
);

// Public route for fetching booked slots on a given date
router.get('/slots', bookingController.getBookedSlots);

export default router;
