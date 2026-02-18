import { Router } from 'express';
import { CutoffsController } from './cutoffs.controller';

const router = Router();
const cutoffsController = new CutoffsController();

// Public route for getting cutoffs with filters
router.get('/', cutoffsController.getCutoffs.bind(cutoffsController));

export default router;
