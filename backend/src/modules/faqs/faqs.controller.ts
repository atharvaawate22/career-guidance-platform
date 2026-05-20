import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import * as faqService from './faqs.service';
import { sanitizeText } from '../../utils/sanitize';

const createFaqSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be under 500 characters'),
  answer: z
    .string({ required_error: 'Answer is required' })
    .trim()
    .min(5, 'Answer must be at least 5 characters')
    .max(3000, 'Answer must be under 3,000 characters'),
  display_order: z.number().int().min(0).optional(),
});

const updateFaqSchema = z.object({
  question: z.string().trim().min(5).max(500).optional(),
  answer: z.string().trim().min(5).max(3000).optional(),
  display_order: z.number().int().min(0).optional(),
});

export async function getFaqs(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const faqs = await faqService.getActiveFaqs();
    res.set('Cache-Control', 'no-store');
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
    const parse = createFaqSchema.safeParse(req.body);
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

    const faq = await faqService.createFaq({
      ...parse.data,
      question: sanitizeText(parse.data.question),
      answer: sanitizeText(parse.data.answer),
    });
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
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

    const parse = updateFaqSchema.safeParse(req.body);
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

    const faq = await faqService.updateFaq(String(id), {
      ...parse.data,
      question: parse.data.question ? sanitizeText(parse.data.question) : undefined,
      answer: parse.data.answer ? sanitizeText(parse.data.answer) : undefined,
    });
    if (!faq) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ not found' },
      });
      return;
    }
    res.json({ success: true, data: faq });
  } catch (error) {
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
