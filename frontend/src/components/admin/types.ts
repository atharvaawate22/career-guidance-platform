// ── Shared types across admin components ──────────────────────────────────────

export interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
  source_url?: string | null;
}

export interface Booking {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_purpose: string;
  meeting_time: string;
  meet_link: string;
  booking_status: string;
  email_status: string;
  created_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

export interface GuideDownload {
  id: string;
  name: string | null;
  email: string | null;
  percentile: number | null;
  downloaded_at: string;
  guide_title: string;
}

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface Testimonial {
  id: string;
  name: string;
  email: string;
  rating: number;
  review_text: string;
  /** Moderation state — only `approved` reviews appear on the public site. */
  status: TestimonialStatus;
  created_at: string;
}

export interface AnalyticsData {
  booking_status_breakdown: { booking_status: string; count: number }[];
  bookings_per_day: { date: string; count: number }[];
  counts: {
    total_updates: number;
    total_bookings: number;
    pending_bookings: number;
    active_faqs: number;
    total_faqs: number;
    active_resources: number;
    active_guides: number;
    total_downloads: number;
  };
  recent_downloads: number;
}

export interface BookingSlotConfig {
  enabled: boolean;
  slot_duration_minutes?: number;
  slots: string[];
  working_days: number[];
  special_open_dates: string[];
  special_closed_dates: string[];
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  type: string;
  pages?: string[];
}

export interface ContactInfoConfig {
  email: string;
  phone: string;
}

export interface PlatformSettings {
  booking_slots: BookingSlotConfig;
  announcement: AnnouncementConfig;
  contact_info: ContactInfoConfig;
}

export type CapScheduleEventStatus = "upcoming" | "today" | "completed" | "postponed";

export interface CapScheduleRevisionEntry {
  field: "planned_date" | "revised_date";
  previous_date: string | null;
  changed_at: string;
}

export interface CapScheduleEvent {
  id: string;
  academic_year: number;
  round_label: string;
  event_label: string;
  display_order: number;
  planned_date: string | null;
  revised_date: string | null;
  revision_history: CapScheduleRevisionEntry[];
  status: CapScheduleEventStatus;
  result_url: string | null;
  result_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TabType =
  | "dashboard"
  | "updates"
  | "bookings"
  | "faqs"
  | "resources"
  | "guides"
  | "settings";

export interface AdminTabProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  handleSessionExpired: () => void;
  API_BASE_URL: string;
}
