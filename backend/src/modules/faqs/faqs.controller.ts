import { Request, Response, NextFunction } from 'express';
import * as faqService from './faqs.service';
import { CreateFaqRequest, UpdateFaqRequest } from './faqs.types';

export async function getFaqs(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const faqs = await faqService.getActiveFaqs();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
}

export async function getAllFaqs(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const faqs = await faqService.getAllFaqs();
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
}

export async function createFaq(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const faqRequest: CreateFaqRequest = {
      question: req.body.question,
      answer: req.body.answer,
      display_order: req.body.display_order,
    };
    const faq = await faqService.createFaq(faqRequest);
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
      return;
    }

    if (error instanceof Error && error.message.includes('display_order')) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
      return;
    }

    next(error);
  }
}

export async function updateFaq(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const faqRequest: UpdateFaqRequest = {
      question: req.body.question,
      answer: req.body.answer,
      display_order: req.body.display_order,
    };
    const faq = await faqService.updateFaq(String(id), faqRequest);
    if (!faq) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ not found' },
      });
      return;
    }
    res.json({ success: true, data: faq });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('required') ||
        error.message.includes('display_order'))
    ) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
      return;
    }

    next(error);
  }
}

export async function deleteFaq(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const deleted = await faqService.deleteFaq(String(id));
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ not found' },
      });
      return;
    }
    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleFaq(
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
    const updated = await faqService.toggleFaqActive(String(id), is_active);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ not found' },
      });
      return;
    }
    res.json({
      success: true,
      message: `FAQ ${is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
}
