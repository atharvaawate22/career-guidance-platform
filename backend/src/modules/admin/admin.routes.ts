import { Router } from 'express';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import { UpdatesController } from '../updates/updates.controller';
import * as guidesController from '../guides/guides.controller';
import * as resourcesController from '../resources/resources.controller';
import * as faqsController from '../faqs/faqs.controller';
import * as settingsController from '../settings/settings.controller';
import * as chatbotController from '../chatbot/chatbot.controller';
import adminBookingsRoutes from './admin.bookings.routes';
import adminUploadRoutes from './admin.upload.routes';

const router = Router();
const updatesController = new UpdatesController();

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

// NOTE: Cutoff data is now managed entirely through the offline ETL pipeline
// (scripts/parse_cutoffs_v2.py → scripts/load_cutoffs.js) which writes to the
// normalized colleges/courses/cutoffs tables. The old admin bulk-insert and
// delete-by-year endpoints (which wrote to the legacy cutoff_data table) have
// been removed. The cutoff_data table is retained only as a revert backup.

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

// ── Chatbot: unanswered-query backlog (Phase 2 content planning) ───────────────
router.get(
  '/unanswered-queries',
  authMiddleware,
  requireAdminRole,
  chatbotController.getUnansweredQueries,
);

export default router;
