export type CapScheduleEventStatus = 'upcoming' | 'today' | 'completed' | 'postponed';

/** One superseded date, appended by the service whenever a date changes. */
export interface RevisionEntry {
  field: 'planned_date' | 'revised_date';
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
  revision_history: RevisionEntry[];
  status: CapScheduleEventStatus;
  result_url: string | null;
  result_note: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCapScheduleEventRequest {
  academic_year: number;
  round_label: string;
  event_label: string;
  display_order?: number;
  planned_date?: string | null;
  revised_date?: string | null;
  status?: CapScheduleEventStatus;
  result_url?: string | null;
  result_note?: string | null;
  notes?: string | null;
}

export interface UpdateCapScheduleEventRequest {
  round_label?: string;
  event_label?: string;
  display_order?: number;
  planned_date?: string | null;
  revised_date?: string | null;
  status?: CapScheduleEventStatus;
  result_url?: string | null;
  result_note?: string | null;
  notes?: string | null;
}

export interface CapScheduleTimeline {
  academic_year: number;
  events: CapScheduleEvent[];
  last_updated: string | null;
}
