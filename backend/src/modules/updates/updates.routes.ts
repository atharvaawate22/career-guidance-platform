import { Router } from 'express';
import { UpdatesController } from './updates.controller';

const router = Router();
const updatesController = new UpdatesController();

router.get('/', updatesController.getUpdates.bind(updatesController));

export default router;
