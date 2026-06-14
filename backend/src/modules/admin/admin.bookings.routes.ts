import { Router, Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import * as bookingRepository from '../booking/booking.repository';
import * as emailService from '../booking/email.service';
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
];

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
      const { status, reason } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required',
          },
        });
        return;
      }

      if (!ALLOWED_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
          },
        });
        return;
      }

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
            bookingCancellationEmail(
              updated,
              typeof reason === 'string' ? reason : undefined,
            ),
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
