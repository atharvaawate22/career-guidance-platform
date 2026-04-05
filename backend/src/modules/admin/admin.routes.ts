import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import { validateBody } from '../../middleware/validateRequest';
import { UpdatesController } from '../updates/updates.controller';
import {
  createUpdateSchema,
  updateUpdateSchema,
} from '../updates/updates.schemas';
import { CutoffsController } from '../cutoffs/cutoffs.controller';
import { AdminController } from './admin.controller';
import { invalidateCutoffMetaCache } from '../cutoffs/cutoffsMetaCache';
import * as guidesController from '../guides/guides.controller';
import * as resourcesController from '../resources/resources.controller';
import * as faqsController from '../faqs/faqs.controller';

const router = Router();
const updatesController = new UpdatesController();
const cutoffsController = new CutoffsController();
const adminController = new AdminController();

const ALLOWED_UPLOAD_MIME_BY_EXT: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword', 'application/doc'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

const OLE_DOC_SIGNATURE = Buffer.from('d0cf11e0a1b11ae1', 'hex');
const ZIP_SIGNATURES = [
  Buffer.from('504b0304', 'hex'),
  Buffer.from('504b0506', 'hex'),
  Buffer.from('504b0708', 'hex'),
];

const normalizeMime = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.split(';')[0].trim().toLowerCase();
};

const readUploadContentType = (req: Request): string => {
  const explicitHeader = req.headers['x-file-content-type'];
  if (typeof explicitHeader === 'string' && explicitHeader.trim()) {
    return normalizeMime(explicitHeader);
  }
  if (Array.isArray(explicitHeader) && explicitHeader.length > 0) {
    return normalizeMime(explicitHeader[0]);
  }
  return normalizeMime(req.headers['content-type']);
};

const hasMatchingFileSignature = (ext: string, payload: Buffer): boolean => {
  if (!Buffer.isBuffer(payload) || payload.length === 0) {
    return false;
  }

  if (ext === 'pdf') {
    return payload.subarray(0, 5).toString('utf8') === '%PDF-';
  }

  if (ext === 'doc') {
    return payload.subarray(0, 8).equals(OLE_DOC_SIGNATURE);
  }

  if (ext === 'docx') {
    const header = payload.subarray(0, 4);
    return ZIP_SIGNATURES.some((sig) => header.equals(sig));
  }

  return false;
};

// Protected routes for updates
router.post(
  '/updates',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  validateBody(createUpdateSchema),
  updatesController.createUpdate.bind(updatesController),
);

router.put(
  '/updates/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  validateBody(updateUpdateSchema),
  updatesController.updateUpdate.bind(updatesController),
);

router.delete(
  '/updates/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  updatesController.deleteUpdate.bind(updatesController),
);

// Protected route for bulk inserting cutoffs
router.post(
  '/cutoffs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  cutoffsController.bulkInsertCutoffs.bind(cutoffsController),
);

// Protected route to delete cutoff data for a specific year (for re-importing)
router.delete(
  '/cutoffs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  adminController.deleteCutoffs.bind(adminController),
);

// Protected routes for guides management
router.post(
  '/guides',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.createGuide,
);
router.get(
  '/guides',
  authMiddleware,
  requireAdminRole,
  guidesController.getAllGuides,
);
router.get(
  '/guides/downloads',
  authMiddleware,
  requireAdminRole,
  guidesController.getDownloads,
);
router.delete(
  '/guides/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.deleteGuide,
);
router.patch(
  '/guides/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  guidesController.toggleGuide,
);

// Protected routes for resources management
router.post(
  '/resources',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.createResource,
);
router.delete(
  '/resources/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.deleteResource,
);
router.patch(
  '/resources/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  resourcesController.toggleResource,
);

// Protected routes for FAQ management
router.post(
  '/faqs',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.createFaq,
);
router.get(
  '/faqs',
  authMiddleware,
  requireAdminRole,
  faqsController.getAllFaqs,
);
router.put(
  '/faqs/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.updateFaq,
);
router.delete(
  '/faqs/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.deleteFaq,
);
router.patch(
  '/faqs/:id/toggle',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  faqsController.toggleFaq,
);

// Protected routes for bookings management
router.get(
  '/bookings',
  authMiddleware,
  requireAdminRole,
  adminController.getBookings.bind(adminController),
);

router.patch(
  '/bookings/:id/status',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  adminController.updateBookingStatus.bind(adminController),
);

router.delete(
  '/bookings/:id',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  adminController.deleteBooking.bind(adminController),
);

// Protected route for uploading files to Supabase Storage
router.post(
  '/upload',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bucket = String(req.query.bucket || '');
      const filename = String(req.query.filename || '');

      if (!bucket || !filename) {
        res.status(400).json({
          success: false,
          error: { message: 'bucket and filename are required' },
        });
        return;
      }

      // Whitelist allowed buckets
      const ALLOWED_BUCKETS = ['guides', 'resources'];
      if (!ALLOWED_BUCKETS.includes(bucket)) {
        res
          .status(400)
          .json({ success: false, error: { message: 'Invalid bucket' } });
        return;
      }

      // Whitelist allowed file extensions
      const ext = filename.split('.').pop()?.toLowerCase() ?? '';
      const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        res.status(400).json({
          success: false,
          error: {
            message:
              'Only PDF and Word documents (.pdf, .doc, .docx) are allowed',
          },
        });
        return;
      }

      const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (payload.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Uploaded file content is empty',
          },
        });
        return;
      }

      const contentType = readUploadContentType(req);
      const allowedMimeTypes = ALLOWED_UPLOAD_MIME_BY_EXT[ext] || [];
      if (!contentType || !allowedMimeTypes.includes(contentType)) {
        res.status(400).json({
          success: false,
          error: {
            message: `Invalid content type for .${ext}. Allowed: ${allowedMimeTypes.join(', ')}`,
          },
        });
        return;
      }

      if (!hasMatchingFileSignature(ext, payload)) {
        res.status(400).json({
          success: false,
          error: {
            message:
              'Uploaded file signature does not match the file extension',
          },
        });
        return;
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        res.status(500).json({
          success: false,
          error: {
            message:
              'Storage not configured on server. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend .env',
          },
        });
        return;
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': contentType,
        },
        body: payload as unknown as BodyInit,
      });

      if (!uploadRes.ok) {
        const err = (await uploadRes.json().catch(() => ({}))) as {
          message?: string;
        };
        res.status(400).json({
          success: false,
          error: {
            message: err.message || `Upload failed (${uploadRes.status})`,
          },
        });
        return;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
      res.json({ success: true, data: { url: publicUrl } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
