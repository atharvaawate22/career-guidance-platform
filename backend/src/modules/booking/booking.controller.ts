import { Request, Response, NextFunction } from 'express';
import * as bookingService from './booking.service';
import * as bookingRepository from './booking.repository';
import { CreateBookingRequest } from './booking.types';
import { sanitizeText } from '../../utils/sanitize';

function bookingErrorStatus(code?: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_EMAIL_DOMAIN':
      return 400;
    case 'BOOKINGS_DISABLED':
      return 403;
    case 'SLOT_UNAVAILABLE':
    case 'SLOT_TAKEN':
    case 'DUPLICATE_BOOKING':
      return 409;
    case 'CALENDAR_ERROR':
      return 503;
    default:
      return 500;
  }
}

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const bookingRequest: CreateBookingRequest = {
      student_name: sanitizeText(req.body.student_name),
      email: req.body.email,
      phone: req.body.phone,
      percentile: req.body.percentile,
      category: req.body.category,
      branch_preference: sanitizeText(req.body.branch_preference),
      meeting_purpose: sanitizeText(req.body.meeting_purpose),
      meeting_time: req.body.meeting_time,
    };

    const result = await bookingService.createBooking(bookingRequest);

    if (!result.success) {
      res.status(bookingErrorStatus(result.error?.code)).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getBookedSlots(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'date query param required (YYYY-MM-DD)',
        },
      });
      return;
    }
    const slots = await bookingRepository.getBookedSlotsForDate(date);
    res.json({ date, booked: slots });
  } catch (error) {
    next(error);
  }
}
