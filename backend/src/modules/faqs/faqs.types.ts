export interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
  display_order?: number;
}

export interface UpdateFaqRequest {
  question?: string;
  answer?: string;
  display_order?: number;
}
