export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  review_text: string;
  created_at: Date;
}

export interface TestimonialWithEmail extends Testimonial {
  email: string;
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
}
