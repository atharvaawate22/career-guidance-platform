import { Router, Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import { UpdatesController } from '../updates/updates.controller';
import { CutoffsController } from '../cutoffs/cutoffs.controller';
import { invalidateCutoffMetaCache } from '../cutoffs/cutoffsMetaCache';
import { cacheDelete } from '../../config/redis';
import * as guidesController from '../guides/guides.controller';
import * as resourcesController from '../resources/resources.controller';
import * as faqsController from '../faqs/faqs.controller';
import * as settingsController from '../settings/settings.controller';
import { query as dbQuery } from '../../config/database';
import adminBookingsRoutes from './admin.bookings.routes';
import adminUploadRoutes from './admin.upload.routes';

const router = Router();
const updatesController = new UpdatesController();
const cutoffsController = new CutoffsController();

// Sub-routers extracted into their own modules to keep this file focused.
// They define their full sub-paths (/bookings*, /upload), so mounting order
// here does not matter.
router.use(adminBookingsRoutes);
router.use(adminUploadRoutes);

// Protected routes for updates
router.post(
  '/updates',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  updatesController.createUpdate.bind(updatesController),
);

router.put(
  '/updates/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  updatesController.updateUpdate.bind(updatesController),
);

router.delete(
  '/updates/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  updatesController.deleteUpdate.bind(updatesController),
);

// Protected route for bulk inserting cutoffs
router.post(
  '/cutoffs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  cutoffsController.bulkInsertCutoffs.bind(cutoffsController),
);

// Protected route to delete cutoff data for a specific year (for re-importing)
router.delete(
  '/cutoffs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawYear = req.query.year;

      // year is required — refusing to accept a request that would delete
      // ALL cutoff data in one shot (no accidental full wipe from a missing param).
      if (rawYear === undefined || String(rawYear).trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'year query parameter is required (e.g. ?year=2025)',
          },
        });
        return;
      }

      const parsedYear = Number.parseInt(String(rawYear), 10);
      if (!Number.isInteger(parsedYear) || parsedYear <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'year must be a positive integer',
          },
        });
        return;
      }

      const result = await dbQuery(
        'DELETE FROM cutoff_data WHERE year = $1',
        [parsedYear],
      );
      invalidateCutoffMetaCache();
      await cacheDelete('predictor:*');
      await cacheDelete('cutoffs:*');
      await cacheDelete('cutoffs:meta:*');
      res.json({
        success: true,
        deleted: result.rowCount,
        year: parsedYear,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Protected routes for guides management
router.post(
  '/guides',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.createGuide,
);
router.get(
  '/guides',
  authMiddleware,
  requireAdminRole,
  guidesController.getAllGuides,
);
router.get(
  '/guides/downloads',
  authMiddleware,
  requireAdminRole,
  guidesController.getDownloads,
);
router.delete(
  '/guides/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.deleteGuide,
);
router.patch(
  '/guides/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.toggleGuide,
);

// Protected routes for resources management
router.get(
  '/resources',
  authMiddleware,
  requireAdminRole,
  resourcesController.getAllResources,
);

router.post(
  '/resources',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.createResource,
);
router.delete(
  '/resources/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.deleteResource,
);
router.patch(
  '/resources/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.toggleResource,
);

// Protected routes for FAQ management
router.post(
  '/faqs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.createFaq,
);
router.get(
  '/faqs',
  authMiddleware,
  requireAdminRole,
  faqsController.getAllFaqs,
);
router.put(
  '/faqs/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.updateFaq,
);
router.delete(
  '/faqs/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.deleteFaq,
);
router.patch(
  '/faqs/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.toggleFaq,
);

// ── Admin settings routes ─────────────────────────────────────────────────────
router.get(
  '/settings',
  authMiddleware,
  requireAdminRole,
  settingsController.getAllSettings,
);

router.put(
  '/settings/:key',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  settingsController.updateSetting,
);

// ── Analytics endpoint ────────────────────────────────────────────────────────
router.get(
  '/analytics',
  authMiddleware,
  requireAdminRole,
  settingsController.getAnalytics,
);

export default router;
