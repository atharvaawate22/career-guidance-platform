import * as capScheduleRepository from './capSchedule.repository';
import { sendBookingStatusEmail } from '../booking/email.service';
import {
  CapScheduleEvent,
  CapScheduleEventStatus,
  CapScheduleTimeline,
  CreateCapScheduleEventRequest,
  RevisionEntry,
  UpdateCapScheduleEventRequest,
} from './capSchedule.types';

export async function getPublicTimeline(
  academicYear: number,
): Promise<CapScheduleTimeline> {
  const events = await capScheduleRepository.getEventsByYear(academicYear);
  const last_updated = events.reduce<string | null>((latest, event) => {
    const updated = new Date(event.updated_at).toISOString();
    return !latest || updated > latest ? updated : latest;
  }, null);
  return { academic_year: academicYear, events, last_updated };
}

export async function getAllEventsForAdmin(
  academicYear?: number,
): Promise<CapScheduleEvent[]> {
  return capScheduleRepository.getAllEvents(academicYear);
}

export async function createEvent(
  input: CreateCapScheduleEventRequest,
): Promise<CapScheduleEvent> {
  return capScheduleRepository.createEvent(input);
}

/** Today in Asia/Kolkata as YYYY-MM-DD — CAP notices are Maharashtra-local. */
function todayIST(): string {
  return dateInIST(0);
}

/**
 * Today + `days` in Asia/Kolkata as YYYY-MM-DD. Adding whole days in UTC
 * before formatting into IST is safe here specifically because India has a
 * fixed UTC+5:30 offset year-round (no DST) — this would need real calendar
 * arithmetic in a zone that observes DST.
 */
function dateInIST(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
}

/** A default suggestion only — never overrides a status the admin set explicitly. */
function deriveStatus(effectiveDate: string | null): CapScheduleEventStatus {
  if (!effectiveDate) return 'upcoming';
  const today = todayIST();
  if (effectiveDate === today) return 'today';
  return effectiveDate < today ? 'completed' : 'upcoming';
}

export async function updateEvent(
  id: string,
  patch: UpdateCapScheduleEventRequest,
): Promise<CapScheduleEvent | null | 'NO_FIELDS'> {
  if (Object.keys(patch).length === 0) return 'NO_FIELDS';

  const current = await capScheduleRepository.getEventById(id);
  if (!current) return null;

  const changedAt = new Date().toISOString();
  const revisionAppend: RevisionEntry[] = [];

  if (
    patch.planned_date !== undefined &&
    patch.planned_date !== current.planned_date
  ) {
    revisionAppend.push({
      field: 'planned_date',
      previous_date: current.planned_date,
      changed_at: changedAt,
    });
  }
  if (
    patch.revised_date !== undefined &&
    patch.revised_date !== current.revised_date
  ) {
    revisionAppend.push({
      field: 'revised_date',
      previous_date: current.revised_date,
      changed_at: changedAt,
    });
  }

  // Suggest a status when a date moves and the caller didn't set one in the
  // same request, unless the event is deliberately marked "postponed" — that
  // has to be cleared by an explicit status change, not implied by a date edit.
  const dateChanged =
    patch.planned_date !== undefined || patch.revised_date !== undefined;
  if (patch.status === undefined && dateChanged && current.status !== 'postponed') {
    const effectiveDate =
      (patch.revised_date !== undefined ? patch.revised_date : current.revised_date) ??
      (patch.planned_date !== undefined ? patch.planned_date : current.planned_date);
    patch.status = deriveStatus(effectiveDate);
  }

  return capScheduleRepository.updateEvent(id, patch, revisionAppend);
}

export async function deleteEvent(id: string): Promise<boolean> {
  return capScheduleRepository.deleteEvent(id);
}

export interface ReminderCheckResult {
  checked_date: string;
  events: CapScheduleEvent[];
  emailed: boolean;
}

/**
 * Finds events landing tomorrow (IST) and emails a heads-up so there is time
 * to pre-draft the "results expected" copy before the event, not after.
 * Called by a scheduled GitHub Actions workflow, not a logged-in admin — see
 * capSchedule.middleware.ts. Postponed/completed events are excluded by the
 * repository query since neither needs a "coming up tomorrow" nudge.
 */
export async function sendUpcomingReminders(): Promise<ReminderCheckResult> {
  const checked_date = dateInIST(1);
  const events = await capScheduleRepository.getEventsOnDate(checked_date);

  if (events.length === 0) {
    return { checked_date, events, emailed: false };
  }

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GOOGLE_CALENDAR_ID ||
    '';

  if (!adminEmail) {
    return { checked_date, events, emailed: false };
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'https://www.cethub.in')
    .split(',')[0]
    .trim();
  const adminUrl = `${frontendUrl}/admin/cap-schedule`;
  const dateLabel = new Date(`${checked_date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const lines = events.map((e) => `- ${e.round_label} — ${e.event_label}`);
  const subject = `⏰ CAP schedule: ${events.length} event${events.length > 1 ? 's' : ''} tomorrow (${dateLabel})`;
  const text = `
The following MHT-CET CAP schedule event${events.length > 1 ? 's are' : ' is'} due tomorrow, ${dateLabel}:

${lines.join('\n')}

Pre-draft the "results expected" / "results out" copy now, then update the event in the admin panel once it happens:
${adminUrl}
  `.trim();
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>⏰ CAP schedule — due tomorrow</h2>
    <p>${dateLabel}</p>
    <ul>
      ${events.map((e) => `<li><strong>${e.round_label}</strong> — ${e.event_label}</li>`).join('')}
    </ul>
    <p>Pre-draft the "results expected" / "results out" copy now, then update the event once it happens:</p>
    <p><a href="${adminUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Open CAP Schedule admin</a></p>
  </div>
</body>
</html>
  `.trim();

  const emailed = await sendBookingStatusEmail(adminEmail, { subject, text, html });
  return { checked_date, events, emailed };
}
