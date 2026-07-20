import { Router } from 'express';
import * as settingsController from './settings.controller';

const router = Router();

// Public routes — consumed by the booking page and layout
router.get('/booking-slots', settingsController.getPublicBookingSlots);
router.get('/announcement', settingsController.getPublicAnnouncement);
router.get('/contact-info', settingsController.getPublicContactInfo);

export default router;
