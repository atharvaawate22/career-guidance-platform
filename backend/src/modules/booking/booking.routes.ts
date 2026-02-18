import { Router } from 'express';
import * as bookingController from './booking.controller';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    endpoint: '/api/bookings',
    method: 'POST',
    description: 'Book a counseling session with admission experts',
    requiredFields: {
      studentName: 'string',
      email: 'string',
      phone: 'string',
      percentile: 'number',
      category: 'string',
      branchPreference: 'string',
      preferredDate: 'string (ISO 8601 date)',
      preferredTime: 'string (HH:MM format)',
    },
  });
});

// Public route for creating bookings
router.post('/', bookingController.createBooking);

export default router;
