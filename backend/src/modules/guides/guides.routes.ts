import { Router } from 'express';
import * as guidesController from './guides.controller';

const router = Router();

// Public routes
router.get('/', guidesController.getGuides);
router.post('/download', guidesController.downloadGuide);

export default router;
