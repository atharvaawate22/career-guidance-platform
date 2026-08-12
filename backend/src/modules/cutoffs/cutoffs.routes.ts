import { Router } from 'express';
import { CutoffsController } from './cutoffs.controller';
import { validateQuery } from '../../middleware/validateRequest';
import { cutoffsQuerySchema, cutoffsMetaQuerySchema } from './cutoffs.schemas';

const router = Router();
const cutoffsController = new CutoffsController();

// Public routes. The two list endpoints validate their query string up front
// (see cutoffs.schemas.ts); /college/:code takes no query params and validates
// its route param inline in the controller.
router.get(
  '/meta',
  validateQuery(cutoffsMetaQuerySchema),
  cutoffsController.getMeta.bind(cutoffsController),
);
router.get(
  '/college/:code',
  cutoffsController.getCollegeCutoffs.bind(cutoffsController),
);
router.get(
  '/',
  validateQuery(cutoffsQuerySchema),
  cutoffsController.getCutoffs.bind(cutoffsController),
);

export default router;
