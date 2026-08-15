import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import * as bookingRepository from '../booking/booking.repository';
import * as emailService from '../booking/email.service';
import { sanitizeText } from '../../utils/sanitize';
import {
  bookingCancellationEmail,
  bookingRescheduledEmail,
} from '../booking/booking.emails';

const router = Router();

const ALLOWED_STATUSES = [
  'scheduled',
  'confirmed',
  'cancelled',
  'rescheduled',
  'no_show',
  'completed',
] as const;

const updateBookingStatusSchema = z.object({
  status: z.enum(ALLOWED_STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
  }),
  // Free-text admin note; capped and stripped of any markup before it can
  // reach the cancellation email template (see booking.emails.ts).
  reason: z
    .string()
    .trim()
    .max(500, 'reason must be under 500 characters')
    .optional(),
});

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// List bookings. Paginated via ?page= and ?limit= (limit capped to protect the
// DB); response carries pagination metadata so the client can page through.
router.get(
  '/bookings',
  authMiddleware,
  requireAdminRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parsePositiveInt(req.query.page, 1);
      const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
      const { data, total } = await bookingRepository.getAllBookings(
        page,
        limit,
      );
      res.json({
        success: true,
        data,
        meta: { page, limit, total },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/bookings/:id/status',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parse = updateBookingStatusSchema.safeParse(req.body);
      if (!parse.success) {
        const first = parse.error.issues[0];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: first?.message ?? 'Invalid request',
          },
        });
        return;
      }
      const { status, reason } = parse.data;
      const sanitizedReason = reason ? sanitizeText(reason) : undefined;

      const updated = await bookingRepository.updateBookingStatus(
        String(id),
        status,
      );
      if (!updated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found',
          },
        });
        return;
      }

      if (status === 'cancelled') {
        void emailService
          .sendBookingStatusEmail(
            updated.email,
            bookingCancellationEmail(updated, sanitizedReason),
          )
          .catch((error) =>
            req.log?.error({ error }, 'Cancellation email failed'),
          );
      }

      if (status === 'rescheduled') {
        void emailService
          .sendBookingStatusEmail(
            updated.email,
            bookingRescheduledEmail(updated),
          )
          .catch((error) =>
            req.log?.error({ error }, 'Reschedule email failed'),
          );
      }

      res.json({
        success: true,
        message: 'Booking status updated',
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/bookings/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await bookingRepository.deleteBooking(String(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Booking deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
