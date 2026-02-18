import { Request, Response, NextFunction } from 'express';
import * as bookingService from './booking.service';
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
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
