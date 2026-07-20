import { Router } from 'express';
import * as whatsappController from './whatsapp.controller';
import { verifyWhatsAppSignature } from './whatsapp.middleware';

const router = Router();

router.get('/webhook', whatsappController.verifyWebhook);
router.post('/webhook', verifyWhatsAppSignature, whatsappController.receiveMessage);

export default router;
