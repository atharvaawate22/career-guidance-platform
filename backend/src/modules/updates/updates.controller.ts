import { Request, Response, NextFunction } from 'express';
import { UpdatesService } from './updates.service';
import { Update } from './updates.types';
import logger from '../../utils/logger';

const updatesService = new UpdatesService();

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
      const { title, content, published_date } = req.body as Omit<Update, 'id'>;

      if (!title || !content) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title and content are required',
          },
        });
        return;
      }

      const newUpdate = await updatesService.createUpdate({
        title,
        content,
        published_date: '', // Will use CURRENT_TIMESTAMP in database
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
      const { title, content, published_date } = req.body;

      if (!title && !content && !published_date) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'At least one field (title, content, or published_date) is required',
          },
        });
        return;
      }

      const updatedUpdate = await updatesService.updateUpdate(id, {
        title,
        content,
        published_date,
      });

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

      const deleted = await updatesService.deleteUpdate(id);

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
