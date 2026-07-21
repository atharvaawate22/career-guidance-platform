import { Router } from 'express';
import { CutoffsController } from './cutoffs.controller';

const router = Router();
const cutoffsController = new CutoffsController();

// Public routes
router.get('/meta', cutoffsController.getMeta.bind(cutoffsController));
router.get(
  '/college/:code',
  cutoffsController.getCollegeCutoffs.bind(cutoffsController),
);
router.get('/', cutoffsController.getCutoffs.bind(cutoffsController));

export default router;
