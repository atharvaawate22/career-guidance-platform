import * as testimonialsRepository from './testimonials.repository';
import { sendBookingStatusEmail } from '../booking/email.service';
import { sanitizeText } from '../../utils/sanitize';
import { containsAbusiveLanguage } from '../../utils/abuseFilter';
import logger from '../../utils/logger';
import {
  Testimonial,
  TestimonialWithEmail,
  CreateTestimonialRequest,
  UpdateTestimonialRequest,
} from './testimonials.types';

interface CreateTestimonialResult {
  success: boolean;
  data?: Testimonial;
  error?: { code: string; message: string };
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  return testimonialsRepository.getPublicTestimonials();
}

export async function getAllTestimonials(): Promise<TestimonialWithEmail[]> {
  return testimonialsRepository.getAllTestimonials();
}

export async function createTestimonial(
  input: CreateTestimonialRequest & { website?: string },
): Promise<CreateTestimonialResult> {
  // Honeypot tripped — pretend success so the bot gets no signal that
  // anything was checked, but don't actually write a row.
  if (input.website) {
    return {
      success: true,
      data: {
        id: 'honeypot',
        name: input.name,
        rating: input.rating,
        review_text: input.review_text,
        created_at: new Date(),
      },
    };
  }

  const name = sanitizeText(input.name);
  const reviewText = sanitizeText(input.review_text);

  if (containsAbusiveLanguage(name) || containsAbusiveLanguage(reviewText)) {
    return {
      success: false,
      error: {
        code: 'ABUSIVE_LANGUAGE',
        message: "Negative and critical reviews are always welcome — we only ask that you avoid slurs or abusive language. Please rework your wording and try again.",
      },
    };
  }

  const testimonial = await testimonialsRepository.createTestimonial({
    name,
    email: input.email,
    rating: input.rating,
    review_text: reviewText,
  });

  sendAdminTestimonialAlert(testimonial, input.email).catch((err) =>
    logger.error('Admin testimonial alert failed', err),
  );

  return { success: true, data: testimonial };
}

export async function updateTestimonial(
  id: string,
  updates: UpdateTestimonialRequest,
): Promise<Testimonial | null> {
  const sanitized: UpdateTestimonialRequest = { ...updates };
  if (sanitized.name !== undefined) sanitized.name = sanitizeText(sanitized.name);
  if (sanitized.review_text !== undefined) sanitized.review_text = sanitizeText(sanitized.review_text);
  return testimonialsRepository.updateTestimonial(id, sanitized);
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  return testimonialsRepository.deleteTestimonial(id);
}

/**
 * Instant admin notification for every new review — reuses the same
 * generic email sender as the new-booking alert (sendBookingStatusEmail
 * accepts any to/subject/text/html, it isn't booking-specific despite the
 * name) so this doesn't need its own SMTP/Gmail transport code.
 */
async function sendAdminTestimonialAlert(
  testimonial: Testimonial,
  submitterEmail: string,
): Promise<boolean> {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GOOGLE_CALENDAR_ID ||
    '';

  if (!adminEmail) {
    logger.warn('No admin notification email configured; skipping new-testimonial alert');
    return false;
  }

  const stars = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);

  const text = `
New testimonial submitted!

Name: ${testimonial.name}
Email: ${submitterEmail}
Rating: ${stars} (${testimonial.rating}/5)

Review:
${testimonial.review_text}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #4F46E5; }
    .review { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4F46E5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>⭐ New Testimonial</h2></div>
    <div class="content">
      <div class="details">
        <div class="detail-row"><span class="label">Name:</span> ${testimonial.name}</div>
        <div class="detail-row"><span class="label">Email:</span> ${submitterEmail}</div>
        <div class="detail-row"><span class="label">Rating:</span> ${stars} (${testimonial.rating}/5)</div>
      </div>
      <div class="review">${testimonial.review_text}</div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendBookingStatusEmail(adminEmail, {
    subject: `⭐ New Testimonial: ${testimonial.name} (${testimonial.rating}/5)`,
    text,
    html,
  });
}
