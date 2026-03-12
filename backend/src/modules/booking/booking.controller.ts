import { Request, Response, NextFunction } from 'express';
import * as bookingService from './booking.service';
import * as bookingRepository from './booking.repository';
import { CreateBookingRequest } from './booking.types';

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const bookingRequest: CreateBookingRequest = {
      student_name: req.body.student_name,
      email: req.body.email,
      phone: req.body.phone,
      percentile: req.body.percentile,
      category: req.body.category,
      branch_preference: req.body.branch_preference,
      meeting_time: req.body.meeting_time,
    };

    const result = await bookingService.createBooking(bookingRequest);

    if (!result.success) {
      const code = result.error?.code;
      // Distinguish between client validation errors and server-side failures
      const status =
        code === 'VALIDATION_ERROR'
          ? 400
          : code === 'CALENDAR_ERROR'
            ? 503
            : 500;
      res.status(status).json(result);
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
      res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      return;
    }
    const slots = await bookingRepository.getBookedSlotsForDate(date);
    res.json({ date, booked: slots });
  } catch (error) {
    next(error);
  }
}
