import { query } from '../../config/database';
import {
  CapScheduleEvent,
  CreateCapScheduleEventRequest,
  RevisionEntry,
  UpdateCapScheduleEventRequest,
} from './capSchedule.types';

const SELECT_COLUMNS = `id, academic_year, round_label, event_label, display_order,
  planned_date, revised_date, revision_history, status, result_url, result_note,
  notes, created_at, updated_at`;

export async function getEventsByYear(
  academicYear: number,
): Promise<CapScheduleEvent[]> {
  const result = await query(
    `SELECT ${SELECT_COLUMNS} FROM cap_schedule_events WHERE academic_year = $1 ORDER BY display_order ASC`,
    [academicYear],
    { name: 'capSchedule.getByYear' },
  );
  return result.rows;
}

/** Admin listing — every year unless one is requested. */
export async function getAllEvents(
  academicYear?: number,
): Promise<CapScheduleEvent[]> {
  if (academicYear !== undefined) return getEventsByYear(academicYear);
  const result = await query(
    `SELECT ${SELECT_COLUMNS} FROM cap_schedule_events ORDER BY academic_year DESC, display_order ASC`,
    undefined,
    { name: 'capSchedule.getAll' },
  );
  return result.rows;
}

/** Events whose effective date (revised, falling back to planned) falls on the given day. */
export async function getEventsOnDate(dateStr: string): Promise<CapScheduleEvent[]> {
  const result = await query(
    `SELECT ${SELECT_COLUMNS} FROM cap_schedule_events
     WHERE status NOT IN ('postponed', 'completed')
       AND COALESCE(revised_date, planned_date) = $1
     ORDER BY display_order ASC`,
    [dateStr],
    { name: 'capSchedule.getOnDate' },
  );
  return result.rows;
}

export async function getEventById(id: string): Promise<CapScheduleEvent | null> {
  const result = await query(
    `SELECT ${SELECT_COLUMNS} FROM cap_schedule_events WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function createEvent(
  input: CreateCapScheduleEventRequest,
): Promise<CapScheduleEvent> {
  const result = await query(
    `INSERT INTO cap_schedule_events
      (academic_year, round_label, event_label, display_order, planned_date, revised_date, status, result_url, result_note, notes)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'upcoming'), $8, $9, $10)
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.academic_year,
      input.round_label,
      input.event_label,
      input.display_order ?? 0,
      input.planned_date ?? null,
      input.revised_date ?? null,
      input.status ?? null,
      input.result_url ?? null,
      input.result_note ?? null,
      input.notes ?? null,
    ],
  );
  return result.rows[0];
}

/**
 * `revisionAppend` is folded into `revision_history` here (rather than by the
 * caller re-reading and rewriting the array) so a concurrent edit can never
 * clobber a history entry written between the service's read and this write.
 */
export async function updateEvent(
  id: string,
  fields: UpdateCapScheduleEventRequest,
  revisionAppend: RevisionEntry[],
): Promise<CapScheduleEvent | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (fields.round_label !== undefined) {
    setClauses.push(`round_label = $${i++}`);
    values.push(fields.round_label);
  }
  if (fields.event_label !== undefined) {
    setClauses.push(`event_label = $${i++}`);
    values.push(fields.event_label);
  }
  if (fields.display_order !== undefined) {
    setClauses.push(`display_order = $${i++}`);
    values.push(fields.display_order);
  }
  if (fields.planned_date !== undefined) {
    setClauses.push(`planned_date = $${i++}`);
    values.push(fields.planned_date);
  }
  if (fields.revised_date !== undefined) {
    setClauses.push(`revised_date = $${i++}`);
    values.push(fields.revised_date);
  }
  if (fields.status !== undefined) {
    setClauses.push(`status = $${i++}`);
    values.push(fields.status);
  }
  if (fields.result_url !== undefined) {
    setClauses.push(`result_url = $${i++}`);
    values.push(fields.result_url);
  }
  if (fields.result_note !== undefined) {
    setClauses.push(`result_note = $${i++}`);
    values.push(fields.result_note);
  }
  if (fields.notes !== undefined) {
    setClauses.push(`notes = $${i++}`);
    values.push(fields.notes);
  }
  if (revisionAppend.length > 0) {
    setClauses.push(`revision_history = revision_history || $${i++}::jsonb`);
    values.push(JSON.stringify(revisionAppend));
  }

  if (setClauses.length === 0) {
    return getEventById(id);
  }

  setClauses.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `UPDATE cap_schedule_events SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLUMNS}`,
    values,
  );
  return result.rows[0] || null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM cap_schedule_events WHERE id = $1 RETURNING id',
    [id],
  );
  return result.rowCount != null && result.rowCount > 0;
}
