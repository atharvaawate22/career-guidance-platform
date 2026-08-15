import { Request, Response, NextFunction } from 'express';
import * as guidesService from './guides.service';
import { sanitizeText } from '../../utils/sanitize';
import { createGuideSchema } from './guides.schemas';

export async function getGuides(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const guides = await guidesService.getActiveGuides();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({
      success: true,
      data: guides,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadGuide(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await guidesService.downloadGuide({ guide_id: req.body.guide_id });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createGuide(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parse = createGuideSchema.safeParse(req.body);
    if (!parse.success) {
      const first = parse.error.issues[0];
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: first?.message ?? 'Invalid request',
          details: parse.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    const { title, description, file_url } = parse.data;
    const guide = await guidesService.createGuide({
      title: sanitizeText(title),
      description: sanitizeText(description),
      file_url,
    });
    res.status(201).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllGuides(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const guides = await guidesService.getAllGuides();
    res.json({ success: true, data: guides });
  } catch (error) {
    next(error);
  }
}

export async function deleteGuide(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const deleted = await guidesService.deleteGuide(String(id));
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Guide not found' },
      });
      return;
    }
    res.json({ success: true, message: 'Guide deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleGuide(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'is_active must be a boolean',
        },
      });
      return;
    }

    const guide = await guidesService.toggleGuide(
      String(id),
      is_active,
    );
    if (!guide) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Guide not found' },
      });
      return;
    }
    res.json({ success: true, data: guide });
  } catch (error) {
    next(error);
  }
}

export async function getDownloads(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const downloads = await guidesService.getDownloads();
    res.json({ success: true, data: downloads });
  } catch (error) {
    next(error);
  }
}
