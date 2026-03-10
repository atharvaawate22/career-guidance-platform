import { Router } from 'express';
import * as resourcesController from './resources.controller';

const router = Router();

// Public: list active resources (optional ?category= filter)
router.get('/', resourcesController.getResources);

export default router;
