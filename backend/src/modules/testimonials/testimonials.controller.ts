import { Request, Response, NextFunction } from 'express';
import * as testimonialsService from './testimonials.service';

export async function getTestimonials(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const testimonials = await testimonialsService.getPublicTestimonials();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ success: true, data: testimonials });
  } catch (error) {
    next(error);
  }
}

export async function createTestimonial(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await testimonialsService.createTestimonial(req.body);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAllTestimonials(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const testimonials = await testimonialsService.getAllTestimonials();
    res.json({ success: true, data: testimonials });
  } catch (error) {
    next(error);
  }
}

export async function updateTestimonial(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await testimonialsService.updateTestimonial(String(id), req.body);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Testimonial not found' },
      });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteTestimonial(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await testimonialsService.deleteTestimonial(String(id));
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Testimonial not found' },
      });
      return;
    }
    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    next(error);
  }
}
