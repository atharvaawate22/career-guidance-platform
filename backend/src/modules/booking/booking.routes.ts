import { Router, Request, Response, NextFunction } from 'express';
import * as bookingController from './booking.controller';
import { validateBody } from '../../middleware/validateRequest';
import { createBookingSchema } from './booking.schemas';
import { bookingLimiter } from '../../middleware/rateLimit';

const router = Router();

/**
 * Feature gate: set BOOKING_ENABLED=false to return 503 on booking
 * submissions without touching any other endpoint. Defaults to enabled
 * so no config change is needed to keep the current behaviour.
 *
 * Intentionally only applied to the POST route — GET /slots is left open
 * so the frontend can still render the slot calendar (greyed-out) without
 * showing an API error.
 */
function requireBookingEnabled(_req: Request, res: Response, next: NextFunction): void {
  const enabled = (process.env.BOOKING_ENABLED ?? 'true').trim().toLowerCase();
  if (enabled === 'false') {
    res.status(503).json({
      success: false,
      error: {
        code: 'BOOKING_DISABLED',
        message: 'Bookings are not currently available. Please check back later.',
      },
    });
    return;
  }
  next();
}

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

// Public route for creating bookings — gated by BOOKING_ENABLED env var.
router.post(
  '/',
  requireBookingEnabled,
  bookingLimiter,
  validateBody(createBookingSchema),
  bookingController.createBooking,
);

// Public route for fetching booked slots on a given date.
// Not gated: the UI uses this to render the (greyed-out) calendar.
router.get('/slots', bookingController.getBookedSlots);

export default router;

