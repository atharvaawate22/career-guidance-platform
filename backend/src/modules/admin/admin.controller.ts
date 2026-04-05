import { Request, Response, NextFunction } from 'express';
import * as bookingRepository from '../booking/booking.repository';
import { invalidateCutoffMetaCache } from '../cutoffs/cutoffsMetaCache';
import { query } from '../../config/database';

const ALLOWED_BOOKING_STATUSES = [
  'scheduled',
  'confirmed',
  'cancelled',
  'completed',
] as const;

export class AdminController {
  async getBookings(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(String(req.query.limit || '50'), 10)),
      );

      const { data, total } = await bookingRepository.getAllBookings(
        page,
        limit,
      );

      res.json({
        success: true,
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

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

      if (
        !ALLOWED_BOOKING_STATUSES.includes(
          status as (typeof ALLOWED_BOOKING_STATUSES)[number],
        )
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${ALLOWED_BOOKING_STATUSES.join(', ')}`,
          },
        });
        return;
      }

      await bookingRepository.updateBookingStatus(String(id), status);
      res.json({
        success: true,
        message: 'Booking status updated',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBooking(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
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
  }

  async deleteCutoffs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const rawYear = req.query.year;
      const hasYearFilter =
        rawYear !== undefined && String(rawYear).trim().length > 0;
      const parsedYear = hasYearFilter
        ? Number.parseInt(String(rawYear), 10)
        : Number.NaN;

      if (hasYearFilter && (!Number.isInteger(parsedYear) || parsedYear <= 0)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'year must be a positive integer when provided',
          },
        });
        return;
      }

      const year = hasYearFilter ? parsedYear : null;
      const sql =
        year === null
          ? 'DELETE FROM cutoff_data'
          : 'DELETE FROM cutoff_data WHERE year = $1';
      const vals: number[] = year === null ? [] : [year];
      const result = await query(sql, vals);
      invalidateCutoffMetaCache();

      res.json({
        success: true,
        deleted: result.rowCount,
        year: year ?? 'all',
      });
    } catch (error) {
      next(error);
    }
  }
}
