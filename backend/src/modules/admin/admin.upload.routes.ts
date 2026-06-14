import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import path from 'path';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';

const router = Router();

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

// Upload a guide/resource file to Supabase Storage. Validates filename (no path
// traversal), bucket, extension, declared MIME type, and the file's magic-byte
// signature before forwarding the bytes to Supabase.
router.post(
  '/upload',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bucket = String(req.query.bucket || '');
      // Strip directory components so that e.g. "../../secrets/file.pdf" is
      // reduced to "file.pdf". Also reject any remaining slashes or encoded
      // sequences that could be used to traverse Supabase Storage paths.
      const rawFilename = String(req.query.filename || '');
      const filename = path.basename(rawFilename);
      if (!filename || filename !== rawFilename || /[/\\%]/.test(rawFilename)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Invalid filename: path components are not allowed',
          },
        });
        return;
      }

      if (!bucket || !filename) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'bucket and filename are required',
          },
        });
        return;
      }

      // Whitelist allowed buckets
      const ALLOWED_BUCKETS = ['guides', 'resources'];
      if (!ALLOWED_BUCKETS.includes(bucket)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_BUCKET', message: 'Invalid bucket' },
        });
        return;
      }

      // Whitelist allowed file extensions
      const ext = filename.split('.').pop()?.toLowerCase() ?? '';
      const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
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
            code: 'EMPTY_FILE',
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
            code: 'INVALID_CONTENT_TYPE',
            message: `Invalid content type for .${ext}. Allowed: ${allowedMimeTypes.join(', ')}`,
          },
        });
        return;
      }

      if (!hasMatchingFileSignature(ext, payload)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_SIGNATURE',
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
            code: 'STORAGE_NOT_CONFIGURED',
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
            code: 'UPLOAD_FAILED',
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
