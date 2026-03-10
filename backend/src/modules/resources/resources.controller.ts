import { Request, Response, NextFunction } from 'express';
import * as resourcesService from './resources.service';
import { CreateResourceRequest } from './resources.types';

export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const resources = await resourcesService.getActiveResources(category);
    res.json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
}

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    const resourceRequest: CreateResourceRequest = {
      title: req.body.title,
      description: req.body.description,
      file_url: req.body.file_url,
      category: req.body.category,
    };
    const resource = await resourcesService.createResource(resourceRequest);
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
      return;
    }
    next(error);
  }
}

export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deleted = await resourcesService.deleteResource(String(id));
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleResource(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'is_active must be a boolean' } });
      return;
    }
    const updated = await resourcesService.toggleResourceActive(String(id), is_active);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }
    res.json({ success: true, message: `Resource ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    next(error);
  }
}
