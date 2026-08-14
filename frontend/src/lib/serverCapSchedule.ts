/**
 * Server-side data access for the evergreen CAP schedule page.
 *
 * Same shape as serverCutoffs.ts: runs only in server components, leans on
 * the Next.js data cache so ISR doesn't hammer the free-tier origin, and
 * never hard-fails on a fetch error so a stale/asleep backend degrades to
 * "no data" instead of a build/ISR failure.
 */
import { API_BASE_URL } from "@/lib/apiBaseUrl";

const BACKEND = API_BASE_URL;
const PROXY_TOKEN = process.env.INTERNAL_PROXY_TOKEN || "";

/**
 * Kept short (relative to the 6h cutoffs TTL) because this page's whole
 * point is that an admin edit — a revised date, a "results are out" note —
 * shows up on the live URL within minutes, not on the next deploy.
 */
export const CAP_SCHEDULE_REVALIDATE_SECONDS = 300;

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

export interface CapScheduleTimeline {
  academic_year: number;
  events: CapScheduleEvent[];
  last_updated: string | null;
}

export async function fetchCapSchedule(
  academicYear: number,
): Promise<CapScheduleTimeline | null> {
  if (!BACKEND) return null;
  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  try {
    const res = await fetch(
      `${BACKEND}/api/v1/cap-schedule-events?academic_year=${academicYear}`,
      { headers, next: { revalidate: CAP_SCHEDULE_REVALIDATE_SECONDS } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data.data as CapScheduleTimeline) : null;
  } catch {
    return null;
  }
}
