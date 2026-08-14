/** Moderation state. Reviews land as `pending` and are published only once approved. */
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  review_text: string;
  created_at: Date;
}

/**
 * Admin view. Carries the two fields the public API must never return: the
 * submitter's email (collected for admin reference only) and the moderation
 * status.
 */
export interface TestimonialWithEmail extends Testimonial {
  email: string;
  status: TestimonialStatus;
}

export interface CreateTestimonialRequest {
  name: string;
  email: string;
  rating: number;
  review_text: string;
}

export interface UpdateTestimonialRequest {
  name?: string;
  rating?: number;
  review_text?: string;
  status?: TestimonialStatus;
}
