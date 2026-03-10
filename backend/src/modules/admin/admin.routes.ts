import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { UpdatesController } from '../updates/updates.controller';
import { CutoffsController } from '../cutoffs/cutoffs.controller';
import * as guidesController from '../guides/guides.controller';
import * as resourcesController from '../resources/resources.controller';
import * as bookingRepository from '../booking/booking.repository';

const router = Router();
const updatesController = new UpdatesController();
const cutoffsController = new CutoffsController();

// Protected routes for updates
router.post(
  '/updates',
  authMiddleware,
  updatesController.createUpdate.bind(updatesController),
);

router.put(
  '/updates/:id',
  authMiddleware,
  updatesController.updateUpdate.bind(updatesController),
);

router.delete(
  '/updates/:id',
  authMiddleware,
  updatesController.deleteUpdate.bind(updatesController),
);

// Protected route for bulk inserting cutoffs
router.post(
  '/cutoffs',
  authMiddleware,
  cutoffsController.bulkInsertCutoffs.bind(cutoffsController),
);

// Protected route to delete cutoff data for a specific year (for re-importing)
router.delete(
  '/cutoffs',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = req.query.year ? Number(req.query.year) : null;
      const { query: dbQuery } = await import('../../config/database');
      const sql = year
        ? 'DELETE FROM cutoff_data WHERE year = $1'
        : 'DELETE FROM cutoff_data';
      const vals = year ? [year] : [];
      const result = await dbQuery(sql, vals);
      res.json({ success: true, deleted: result.rowCount, year: year || 'all' });
    } catch (error) {
      next(error);
    }
  },
);

// Protected route for creating guides
router.post('/guides', authMiddleware, guidesController.createGuide);

// Protected routes for resources management
router.post('/resources', authMiddleware, resourcesController.createResource);
router.delete('/resources/:id', authMiddleware, resourcesController.deleteResource);
router.patch('/resources/:id/toggle', authMiddleware, resourcesController.toggleResource);

// Protected routes for bookings management
router.get('/bookings', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingRepository.getAllBookings();
    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/bookings/:id/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

    const ALLOWED_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed'];
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

    await bookingRepository.updateBookingStatus(String(id), status);
    res.json({
      success: true,
      message: 'Booking status updated',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/bookings/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
});

export default router;
