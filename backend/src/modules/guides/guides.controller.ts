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

    const guide = await guidesService.createGuide(guideRequest);
    res.status(201).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
}
