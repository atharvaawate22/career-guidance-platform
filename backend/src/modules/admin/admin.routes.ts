import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
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
      res.json({
        success: true,
        deleted: result.rowCount,
        year: year || 'all',
      });
    } catch (error) {
      next(error);
    }
  },
);

// Protected routes for guides management
router.post('/guides', authMiddleware, guidesController.createGuide);
router.get('/guides', authMiddleware, guidesController.getAllGuides);
router.get('/guides/downloads', authMiddleware, guidesController.getDownloads);
router.delete('/guides/:id', authMiddleware, guidesController.deleteGuide);
router.patch(
  '/guides/:id/toggle',
  authMiddleware,
  guidesController.toggleGuide,
);

// Protected routes for resources management
router.post('/resources', authMiddleware, resourcesController.createResource);
router.delete(
  '/resources/:id',
  authMiddleware,
  resourcesController.deleteResource,
);
router.patch(
  '/resources/:id/toggle',
  authMiddleware,
  resourcesController.toggleResource,
);

// Protected routes for bookings management
router.get(
  '/bookings',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookings = await bookingRepository.getAllBookings();
      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/bookings/:id/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
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

      const ALLOWED_STATUSES = [
        'scheduled',
        'confirmed',
        'cancelled',
        'completed',
      ];
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
  },
);

router.delete(
  '/bookings/:id',
  authMiddleware,
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

// Protected route for uploading files to Supabase Storage
router.post(
  '/upload',
  authMiddleware,
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bucket = String(req.query.bucket || '');
      const filename = String(req.query.filename || '');

      if (!bucket || !filename) {
        res.status(400).json({
          success: false,
          error: { message: 'bucket and filename are required' },
        });
        return;
      }

      // Whitelist allowed buckets
      const ALLOWED_BUCKETS = ['guides', 'resources'];
      if (!ALLOWED_BUCKETS.includes(bucket)) {
        res
          .status(400)
          .json({ success: false, error: { message: 'Invalid bucket' } });
        return;
      }

      // Whitelist allowed file extensions
      const ext = filename.split('.').pop()?.toLowerCase() ?? '';
      const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        res.status(400).json({
          success: false,
          error: {
            message:
              'Only PDF and Word documents (.pdf, .doc, .docx) are allowed',
          },
        });
        return;
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        res.status(500).json({
          success: false,
          error: {
            message:
              'Storage not configured on server. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend .env',
          },
        });
        return;
      }

      const contentType =
        req.headers['x-file-content-type'] || 'application/octet-stream';
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': String(contentType),
        },
        body: req.body as Buffer as unknown as BodyInit,
      });

      if (!uploadRes.ok) {
        const err = (await uploadRes.json().catch(() => ({}))) as {
          message?: string;
        };
        res.status(400).json({
          success: false,
          error: {
            message: err.message || `Upload failed (${uploadRes.status})`,
          },
        });
        return;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
      res.json({ success: true, data: { url: publicUrl } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
