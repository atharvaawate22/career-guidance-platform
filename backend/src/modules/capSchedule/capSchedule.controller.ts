import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as capScheduleService from './capSchedule.service';
import { ACTIVE_CAP_SCHEDULE_YEAR } from '../../config/constants';
import { capScheduleYearQuerySchema } from './capSchedule.schemas';

type YearQuery = z.infer<typeof capScheduleYearQuerySchema>;

export async function getPublicSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { academic_year } = req.validatedQuery as YearQuery;
    const timeline = await capScheduleService.getPublicTimeline(
      academic_year ?? ACTIVE_CAP_SCHEDULE_YEAR,
    );
    res.json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
}

export async function getAllEventsAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { academic_year } = req.validatedQuery as YearQuery;
    const events = await capScheduleService.getAllEventsForAdmin(academic_year);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const event = await capScheduleService.createEvent(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await capScheduleService.updateEvent(String(id), req.body);

    if (updated === 'NO_FIELDS') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one field is required' },
      });
      return;
    }

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'CAP schedule event not found' },
      });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function checkReminders(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await capScheduleService.sendUpcomingReminders();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await capScheduleService.deleteEvent(String(id));

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'CAP schedule event not found' },
      });
      return;
    }

    res.json({ success: true, message: 'CAP schedule event deleted successfully' });
  } catch (error) {
    next(error);
  }
}
