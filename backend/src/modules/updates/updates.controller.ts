import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { UpdatesService } from './updates.service';
import logger from '../../utils/logger';

const updatesService = new UpdatesService();

const createUpdateSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(300, 'Title must be under 300 characters'),
  content: z
    .string({ required_error: 'Content is required' })
    .trim()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be under 10,000 characters'),
  published_date: z
    .string()
    .trim()
    .optional(),
});

const updateUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(300).optional(),
  content: z.string().trim().min(1, 'Content cannot be empty').max(10000).optional(),
  published_date: z.string().trim().optional(),
}).refine(
  (data) => data.title !== undefined || data.content !== undefined || data.published_date !== undefined,
  { message: 'At least one field (title, content, or published_date) is required' },
);

export class UpdatesController {
  async getUpdates(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updates = await updatesService.getAllUpdates();
      logger.info('Fetched all updates');
      res.json({
        success: true,
        data: updates,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUpdate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parse = createUpdateSchema.safeParse(req.body);
      if (!parse.success) {
        const first = parse.error.issues[0];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: first?.message ?? 'Invalid request',
            details: parse.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        });
        return;
      }

      const { title, content, published_date } = parse.data;
      const newUpdate = await updatesService.createUpdate({
        title,
        content,
        published_date: published_date || '',
      });

      res.status(201).json({
        success: true,
        data: newUpdate,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUpdate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const parse = updateUpdateSchema.safeParse(req.body);
      if (!parse.success) {
        const first = parse.error.issues[0];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: first?.message ?? 'Invalid request',
            details: parse.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        });
        return;
      }

      const { title, content, published_date } = parse.data;
      const updatedUpdate = await updatesService.updateUpdate(String(id), {
        title,
        content,
        published_date,
      });

      if (updatedUpdate === 'NO_FIELDS') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update were provided',
          },
        });
        return;
      }

      if (!updatedUpdate) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Update not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUpdate,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUpdate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await updatesService.deleteUpdate(String(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Update not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Update deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
