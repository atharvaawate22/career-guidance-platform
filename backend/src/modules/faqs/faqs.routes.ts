import { Router } from 'express';
import * as faqsController from './faqs.controller';

const router = Router();

router.get('/', faqsController.getFaqs);

export default router;
