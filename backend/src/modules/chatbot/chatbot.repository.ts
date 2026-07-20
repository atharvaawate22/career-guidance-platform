import { query } from '../../config/database';
import { buildCategoryCondition } from '../../utils/cutoffFilters';

export interface CollegeMatch {
  college_code: string;
  name: string;
}

export interface ChatCutoffRow {
  college_name: string;
  branch: string;
  cap_round: number;
  percentile: number | null;
}

export interface CapScheduleRow {
  cap_round: number;
  event_name: string;
  start_date: string | null;
  end_date: string | null;
  is_confirmed: boolean;
  notes: string | null;
}

export interface DocumentChecklistRow {
  document_name: string;
  description: string | null;
}

export interface FaqScoreRow {
  question: string;
  answer: string;
  sim_raw: number;
  sim_filtered: number;
}

/** Exact-ish substring match against the college name first (cheap, precise for full names). */
export async function searchCollegesByName(
  hint: string,
  limit = 3,
): Promise<CollegeMatch[]> {
  const result = await query(
    `SELECT college_code, name
     FROM colleges
     WHERE name ILIKE '%' || $1 || '%'
     ORDER BY LENGTH(name) ASC
     LIMIT $2`,
    [hint, limit],
    { name: 'chatbot.searchCollegesByName' },
  );
  return result.rows;
}

/** Trigram fuzzy fallback for when the student's phrasing doesn't literally appear in any college name. */
export async function searchCollegesByTrigram(
  hint: string,
  limit = 3,
): Promise<CollegeMatch[]> {
  const result = await query(
    `SELECT college_code, name, similarity(name, $1) AS sim
     FROM colleges
     WHERE similarity(name, $1) > 0.25
     ORDER BY sim DESC
     LIMIT $2`,
    [hint, limit],
    { name: 'chatbot.searchCollegesByTrigram' },
  );
  return result.rows;
}

/**
 * Closing percentile per (course, CAP round) for a college + branch keyword.
 *
 * `DISTINCT ON (c.id, co.cap_round)` — the course id is part of the key on
 * purpose. Deduping on cap_round ALONE would collapse genuinely different
 * courses into one row per round, and because the tiebreak is
 * `closing_rank DESC` (worst rank = last admitted seat, the correct closing
 * cutoff *within* one course) it would systematically surface the LEAST
 * selective course among everything the keyword matched. At a college with
 * six "computer" courses that reports the IoT/Cyber-Security cutoff as if it
 * were the Computer Engineering cutoff — understating it by a full
 * percentile point. Keying on (course, round) keeps "worst rank" scoped to a
 * single course, which is what it actually means; the caller then decides
 * how to present multiple matched courses rather than silently picking one.
 *
 * Ladies-only rows are excluded (General-seat cutoffs by default); the reply
 * points to /cutoffs for gender/minority/year filters.
 */
export async function getCutoffAnswer(
  academicYear: number,
  collegeCode: string,
  branchHint: string,
  categoryToken: string,
): Promise<ChatCutoffRow[]> {
  const cat = buildCategoryCondition(categoryToken, false, 4, 'co');
  const sql = `
    SELECT college_name, branch, cap_round, percentile
    FROM (
      SELECT DISTINCT ON (c.id, co.cap_round)
        col.name AS college_name,
        c.id AS course_id,
        c.course_name AS branch,
        co.cap_round,
        co.closing_percentile AS percentile,
        co.closing_rank
      FROM cutoffs co
      JOIN courses c ON c.id = co.course_id
      JOIN colleges col ON col.college_code = c.college_code
      WHERE co.academic_year = $1
        AND col.college_code = $2
        AND (c.course_name ILIKE '%' || $3 || '%' OR c.branch_group ILIKE '%' || $3 || '%')
        AND co.gender IS DISTINCT FROM 'L'
        ${cat.condition ? `AND ${cat.condition}` : ''}
      ORDER BY c.id, co.cap_round, co.closing_rank DESC NULLS LAST
    ) closing
    ORDER BY branch ASC, cap_round ASC
    LIMIT 60
  `;
  const result = await query(
    sql,
    [academicYear, collegeCode, branchHint, ...cat.values],
    { name: 'chatbot.getCutoffAnswer' },
  );
  return result.rows;
}

export async function getCapSchedule(
  academicYear: number,
  round?: number,
): Promise<CapScheduleRow[]> {
  const conditions = ['academic_year = $1'];
  const values: unknown[] = [academicYear];
  if (round !== undefined) {
    conditions.push('cap_round = $2');
    values.push(round);
  }
  const result = await query(
    `SELECT cap_round, event_name, start_date, end_date, is_confirmed, notes
     FROM cap_schedule
     WHERE ${conditions.join(' AND ')}
     ORDER BY cap_round ASC, start_date ASC NULLS LAST`,
    values,
    { name: 'chatbot.getCapSchedule' },
  );
  return result.rows;
}

export async function getDocumentChecklist(
  category = 'general',
): Promise<DocumentChecklistRow[]> {
  const result = await query(
    `SELECT document_name, description
     FROM document_checklist
     WHERE category = $1 AND is_active = true
     ORDER BY display_order ASC`,
    [category],
    { name: 'chatbot.getDocumentChecklist' },
  );
  return result.rows;
}

/**
 * Trigram-scores every active FAQ against two forms of the student's message
 * at once — the raw text and a filler-stripped form — so the caller can judge
 * confidence rather than just taking whatever cleared a fixed threshold.
 * Reuses the admin-managed FAQ content, so chatbot copy stays editable from
 * /admin/faqs without a deploy.
 *
 * Returns unfiltered scores (no WHERE cutoff): thresholds are a routing
 * decision and live in chatbot.service.ts. The table is small (tens of rows),
 * so scoring all of it in one round trip is cheaper than two filtered queries.
 */
export async function scoreFaqs(
  rawText: string,
  filteredText: string,
): Promise<FaqScoreRow[]> {
  const result = await query(
    `SELECT question,
            answer,
            similarity(question, $1) AS sim_raw,
            similarity(question, $2) AS sim_filtered
     FROM faqs
     WHERE is_active = true`,
    [rawText, filteredText],
    { name: 'chatbot.scoreFaqs' },
  );
  return result.rows;
}

export async function logUnansweredQuery(
  channel: string,
  rawMessage: string,
  contactIdentifier?: string,
): Promise<void> {
  await query(
    `INSERT INTO unanswered_queries (channel, raw_message, contact_identifier)
     VALUES ($1, $2, $3)`,
    [channel, rawMessage, contactIdentifier ?? null],
    { name: 'chatbot.logUnansweredQuery' },
  );
}
