import { Request, Response, NextFunction } from 'express';
import * as guidesService from './guides.service';
import { GuideDownloadRequest, CreateGuideRequest } from './guides.types';

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
    const downloadRequest: GuideDownloadRequest = {
      guide_id: req.body.guide_id,
      name: req.body.name,
      email: req.body.email,
      percentile: req.body.percentile,
    };

    const result = await guidesService.downloadGuide(downloadRequest);

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
    const guideRequest: CreateGuideRequest = {
      title: req.body.title,
      description: req.body.description,
      file_url: req.body.file_url,
    };

    if (
      !guideRequest.title?.trim() ||
      !guideRequest.description?.trim() ||
      !guideRequest.file_url?.trim()
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title, description, and file_url are required',
        },
      });
      return;
    }

    const guide = await guidesService.createGuide(guideRequest);
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
