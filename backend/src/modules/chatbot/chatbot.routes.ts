import { Router } from 'express';
import * as chatbotController from './chatbot.controller';
import { validateBody } from '../../middleware/validateRequest';
import { chatMessageSchema } from './chatbot.schemas';
import { chatbotLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post(
  '/message',
  chatbotLimiter,
  validateBody(chatMessageSchema),
  chatbotController.postMessage,
);

export default router;
