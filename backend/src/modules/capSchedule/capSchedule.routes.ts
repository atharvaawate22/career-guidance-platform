import { Router } from 'express';
import * as capScheduleController from './capSchedule.controller';
import { validateQuery } from '../../middleware/validateRequest';
import { capScheduleYearQuerySchema } from './capSchedule.schemas';
import { verifyReminderToken } from './capSchedule.middleware';

const router = Router();

router.get(
  '/',
  validateQuery(capScheduleYearQuerySchema),
  capScheduleController.getPublicSchedule,
);

// Called by a scheduled GitHub Actions workflow (not a logged-in admin), so
// this is guarded by a shared-secret header instead of the cookie session
// used by /admin/cap-schedule-events — see capSchedule.middleware.ts.
router.post(
  '/reminder-check',
  verifyReminderToken,
  capScheduleController.checkReminders,
);

export default router;
