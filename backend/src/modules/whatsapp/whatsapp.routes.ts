import { Router } from 'express';
import * as whatsappController from './whatsapp.controller';
import { verifyWhatsAppSignature } from './whatsapp.middleware';
import { whatsappWebhookLimiter } from '../../middleware/rateLimit';

const router = Router();

router.get('/webhook', whatsappController.verifyWebhook);
// Signature verification runs first so unsigned/forged requests are rejected
// before ever consuming a rate-limit slot; the limiter then keys on wa_id
// (see rateLimit.ts) rather than IP, since every request here comes from Meta.
router.post(
  '/webhook',
  verifyWhatsAppSignature,
  whatsappWebhookLimiter,
  whatsappController.receiveMessage,
);

export default router;
