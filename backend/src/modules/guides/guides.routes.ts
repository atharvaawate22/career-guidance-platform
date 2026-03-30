import { Router } from 'express';
import * as guidesController from './guides.controller';
import { validateBody } from '../../middleware/validateRequest';
import { guideDownloadSchema } from './guides.schemas';

const router = Router();

// Public routes
router.get('/', guidesController.getGuides);
router.post('/download', validateBody(guideDownloadSchema), guidesController.downloadGuide);

export default router;
