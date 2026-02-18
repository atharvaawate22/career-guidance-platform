import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { UpdatesController } from '../updates/updates.controller';
import { CutoffsController } from '../cutoffs/cutoffs.controller';
import * as guidesController from '../guides/guides.controller';
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

// Protected route for creating guides
router.post('/guides', authMiddleware, guidesController.createGuide);

// Protected routes for bookings management
router.get('/bookings', authMiddleware, async (req, res, next) => {
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

router.patch('/bookings/:id/status', authMiddleware, async (req, res, next) => {
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

    await bookingRepository.updateBookingStatus(id, status);
    res.json({
      success: true,
      message: 'Booking status updated',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/bookings/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await bookingRepository.deleteBooking(id);

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
