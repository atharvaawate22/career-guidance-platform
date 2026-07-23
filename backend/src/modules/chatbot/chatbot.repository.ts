import { query } from '../../config/database';
import { buildCategoryCondition } from '../../utils/cutoffFilters';
import logger from '../../utils/logger';

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
  /**
   * word_similarity(filtered query, question): unlike similarity() this is not
   * length-normalised, so a short query ("tfws") that appears as a strong
   * contiguous run inside a long question scores high instead of being diluted.
   * Used only as a rescue for short queries the length-normalised scores miss.
   */
  wsim_filtered: number;
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
 * Gender defaults to General-seat cutoffs (ladies-only rows excluded) unless
 * `ladiesQuota` is set, in which case it flips to ladies-only rows
 * specifically — never both mixed in one reply, since a mixed list would
 * leave the student unable to tell which number is which. The reply text
 * still points to /cutoffs for the full gender/minority/year filter set.
 */
export async function getCutoffAnswer(
  academicYear: number,
  collegeCode: string,
  branchHint: string,
  categoryToken: string,
  ladiesQuota = false,
): Promise<ChatCutoffRow[]> {
  const cat = buildCategoryCondition(categoryToken, false, 4, 'co');
  const genderCondition = ladiesQuota ? `co.gender = 'L'` : `co.gender IS DISTINCT FROM 'L'`;
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
        AND ${genderCondition}
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
            similarity(question, $2) AS sim_filtered,
            word_similarity($2, question) AS wsim_filtered
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

export interface UnansweredQueryGroup {
  message: string;
  count: number;
  channels: string[];
  first_seen: Date;
  last_seen: Date;
}

export interface UnansweredQuerySummary {
  total: number;
  unique_messages: number;
  website: number;
  whatsapp: number;
}

/**
 * Distinct unanswered messages within the last `days`, most-asked first.
 *
 * Grouped on a normalized form of the message — lower-cased, trimmed, and with
 * internal whitespace runs collapsed — so trivial case/spacing variants of the
 * same question collapse into one row with a real frequency count. This is the
 * Phase 2 content backlog, so what matters is "how often is this asked", not
 * each individual row. `contact_identifier` is intentionally NOT selected:
 * prioritising content needs the questions, not who asked them.
 */
const NORMALIZED_MESSAGE = `regexp_replace(btrim(lower(raw_message)), '\\s+', ' ', 'g')`;

export async function getUnansweredQueriesGrouped(
  days: number,
  limit: number,
): Promise<UnansweredQueryGroup[]> {
  const result = await query(
    `SELECT
       ${NORMALIZED_MESSAGE}            AS message,
       COUNT(*)::int                    AS count,
       array_agg(DISTINCT channel)      AS channels,
       MIN(created_at)                  AS first_seen,
       MAX(created_at)                  AS last_seen
     FROM unanswered_queries
     WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
     GROUP BY ${NORMALIZED_MESSAGE}
     ORDER BY count DESC, last_seen DESC
     LIMIT $2`,
    [days, limit],
    { name: 'chatbot.getUnansweredQueriesGrouped' },
  );
  return result.rows;
}

export interface RagChunkMatch {
  topicLabel: string;
  sourceSection: string;
  content: string;
  /** Cosine similarity (1 - cosine distance) against the query embedding. */
  similarity: number;
}

/**
 * Embeds text via the `embed` Supabase Edge Function (gte-small, 384-dim).
 * Returns null on any failure (missing config, network error, non-2xx, bad
 * shape) rather than throwing — the caller treats a null embedding as
 * "retrieval unavailable" and defers, the same way a below-floor similarity
 * score does. RAG never surfaces an infrastructure hiccup as an error to the
 * student.
 */
async function embedQuery(text: string): Promise<number[] | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('[chatbot] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — RAG retrieval skipped');
    return null;
  }

  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      logger.error('[chatbot] embed function returned non-2xx', {
        status: res.status,
        body: await res.text().catch(() => ''),
      });
      return null;
    }
    const { embedding } = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      logger.error('[chatbot] embed function returned an unexpected shape', { embedding });
      return null;
    }
    return embedding;
  } catch (error) {
    logger.error('[chatbot] embed function call failed', error);
    return null;
  }
}

/**
 * Top-N RAG chunks by cosine similarity to the student's message. Returns []
 * (never throws) when embedding fails, so the caller's confidence-floor check
 * naturally treats "couldn't embed" the same as "nothing matched well enough" —
 * both defer rather than generate.
 */
export async function searchRagChunks(text: string, limit = 5): Promise<RagChunkMatch[]> {
  const embedding = await embedQuery(text);
  if (!embedding) return [];

  const vectorLiteral = `[${embedding.join(',')}]`;
  const result = await query(
    `SELECT topic_label, source_section, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM rag_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, limit],
    { name: 'chatbot.searchRagChunks' },
  );
  return result.rows.map((r) => ({
    topicLabel: r.topic_label,
    sourceSection: r.source_section,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

export async function getUnansweredQuerySummary(
  days: number,
): Promise<UnansweredQuerySummary> {
  const result = await query(
    `SELECT
       COUNT(*)::int                                            AS total,
       COUNT(DISTINCT ${NORMALIZED_MESSAGE})::int               AS unique_messages,
       COUNT(*) FILTER (WHERE channel = 'website')::int         AS website,
       COUNT(*) FILTER (WHERE channel = 'whatsapp')::int        AS whatsapp
     FROM unanswered_queries
     WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')`,
    [days],
    { name: 'chatbot.getUnansweredQuerySummary' },
  );
  return result.rows[0];
}
