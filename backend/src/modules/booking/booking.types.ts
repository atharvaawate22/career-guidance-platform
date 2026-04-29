export interface Booking {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_purpose: string;
  meeting_time: Date;
  meet_link: string;
  booking_status: string;
  email_status: string;
  created_at: Date;
}

export interface CreateBookingRequest {
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_purpose: string;
  meeting_time: string; // ISO string
}

export interface CreateBookingResponse {
  success: boolean;
  message?: string;
  /** Set when booking succeeded but a non-fatal step (e.g. calendar) failed. */
  warning?: string;
  error?: {
    code: string;
    message: string;
  };
  data?: {
    booking_id: string;
    /** null when the calendar API failed; admin will add the link manually. */
    meet_link: string | null;
  };
}
