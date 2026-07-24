/**
 * Channel-agnostic chatbot decision service — the shared "brain" described in
 * CHATBOT_ARCHITECTURE.md. Both the website controller and the WhatsApp
 * webhook call getReply() and render the ChatReply into their own output
 * format; no channel-specific logic lives here.
 *
 * Mostly stateless: each message is still classified independently, and the
 * root menu numbers are globally fixed and never nested, so a bare "1"–"6"
 * reply is unambiguous without remembering what was shown before. The one
 * scoped exception is cutoff-lookup slot memory (see CHAT_SLOTS_TTL_SECONDS
 * below) — a short-TTL Redis entry, keyed by a client-generated sessionId,
 * remembering the last resolved college/branch/category so a bare follow-up
 * like "computer" after "cutoff for COEP" doesn't have to repeat the college.
 * Only the website channel supplies a sessionId; WhatsApp gets the same
 * stateless behavior as before.
 */
import * as repo from './chatbot.repository';
import * as gemini from './gemini.service';
import { cacheGet, cacheSet } from '../../config/redis';
import { ACTIVE_CUTOFF_YEAR, ACTIVE_CAP_SCHEDULE_YEAR } from '../../config/constants';
import {
  MENU_OPTIONS,
  MENU_TEXT,
  FALLBACK_TEXT,
  BRANCH_ALIASES,
  CATEGORY_ALIASES,
  COLLEGE_ALIASES,
  AMBIGUOUS_COLLEGE_ACRONYMS,
  DEFAULT_CATEGORY,
} from './chatbot.constants';
import { ChatChannel, ChatReply } from './chatbot.types';

/**
 * Stripped when extracting a COLLEGE NAME from a message. Includes domain
 * words ("cutoff", "percentile", "branch") on purpose: in "cutoff for COEP
 * CS" everything except the college name is noise. Do NOT reuse this for FAQ
 * search — see FAQ_STOPWORDS.
 */
const NAME_STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'in', 'at', 'of', 'is', 'my', 'what', 'whats',
  "what's", 'give', 'me', 'i', 'want', 'to', 'know', 'cutoff', 'cutoffs',
  'percentile', 'college', 'branch', 'and', 'please', 'tell', 'about',
  'difference', 'between', 'mean', 'means', 'explain', 'does', 'do', 'vs',
  'versus', 'how', 'or',
  // Ladies-quota phrasing ("ladies quota cutoff for COEP CS") — these are
  // noise for college-name extraction, same reasoning as 'cutoff'/'branch'
  // above. See LADIES_QUOTA_PATTERN.
  'ladies', 'quota', 'women', 'womens', 'female',
]);

/**
 * Stripped before FAQ trigram search: generic question filler only.
 *
 * Deliberately keeps domain words that NAME_STOPWORDS discards. Stripping
 * "percentile"/"cutoff" here would gut the very topic being asked about —
 * "difference between percentile and percentage" reduced to "percentage",
 * which scores 0.195 against its own FAQ and loses to the keyword router.
 * Filler still has to go, though: leaving "difference between ... and" in
 * makes that phrasing dominate similarity(), which is why the raw form of
 * "difference between float and freeze" matches the e-Scrutiny FAQ (0.364)
 * over the correct Freeze/Float/Slide one (0.274). Neither form is reliable
 * alone, which is what the agreement rule in scoreBestFaq() resolves.
 */
const FAQ_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'be', 'of', 'for', 'in', 'on', 'at',
  'to', 'and', 'or', 'my', 'me', 'i', 'you', 'it', 'its', 'this', 'that',
  'these', 'those', 'what', 'whats', "what's", 'which', 'who', 'how', 'when',
  'where', 'why', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
  'will', 'please', 'tell', 'give', 'know', 'want', 'explain', 'mean',
  'means', 'meaning', 'difference', 'between', 'vs', 'versus', 'about',
  'any', 'some', 'get', 'there', 'here', 'from', 'with', 'by', 'as', 'if',
  'so', 'than', 'then',
]);

/**
 * Minimum confidence for an FAQ answer to be used when no keyword intent
 * matched at all. On the `similarity()` scale. Matches the previous SQL
 * threshold.
 */
const FAQ_MIN_CONFIDENCE = 0.2;

/**
 * Higher bar an FAQ must clear to OVERRIDE a matched keyword intent. On the
 * `similarity()` scale. Chosen from measured scores against the live FAQ
 * table: real conceptual questions that the keyword router used to hijack
 * score 0.41–0.79, while genuine structured lookups ("cutoff for COEP CS",
 * "when is round 2", "which college can I get with 95 percentile") top out at
 * 0.20. 0.35 sits in that gap with margin on both sides.
 */
const FAQ_OVERRIDE_CONFIDENCE = 0.35;

/**
 * Rescue threshold on the `word_similarity()` scale — a DIFFERENT scale from
 * the two above, re-measured from scratch rather than reusing 0.35/0.20.
 *
 * `similarity()` is length-normalised, so a short query is diluted by the long
 * FAQ question around the match: "what is TFWS" scores only 0.125 against
 * "What is the Tuition Fee Waiver Scheme (TFWS)?" and falls through the
 * fallback despite being an exact hit. `word_similarity()` scores that pair at
 * 1.000. Measured separation on the filtered query: short exact-ish hits
 * ("tfws", "float", "e-scrutiny") land at 1.000; the highest non-matching
 * query reaches 0.615, so 0.70 clears the gap with margin.
 */
const WORD_SIM_RESCUE = 0.7;

/**
 * word_similarity() is generous enough that a single GENERIC domain word,
 * being a substring of some FAQ question, scores 1.000 on its own — "the
 * college" → "college" matches "How reliable is the College Predictor?" at
 * 1.000. So the rescue only fires when the filtered query still carries a
 * DISTINCTIVE (non-generic) token after these are removed; queries made only
 * of generic domain words are already handled by the keyword router.
 */
const RESCUE_GENERIC_WORDS = new Set([
  'college', 'colleges', 'cutoff', 'cutoffs', 'branch', 'branches',
  'predictor', 'predict', 'admission', 'admissions', 'seat', 'seats',
  'exam', 'process', 'college.',
]);

/** Cap on how many distinct courses a single cutoff reply lists before deferring to /cutoffs — keeps WhatsApp replies readable. */
const MAX_COURSES_LISTED = 8;

/** Top-N chunks retrieved for RAG generation context. */
const RAG_TOP_K = 5;

/**
 * Retrieval-confidence floor on the top retrieved chunk's cosine similarity
 * (`1 - cosine distance`). Below the floor, RAG defers rather than generating
 * — never guess from a weak match.
 *
 * Measured 2026-07-23 against the live rag_chunks table: 10 in-corpus
 * synthesis questions (one per chunk, e.g. "I floated round 1 and got better
 * in round 2, do I lose my round 1 seat?") scored 0.8720-0.9424 on their
 * correct chunk; 10 out-of-corpus/near-miss questions (documents, TFWS, fee
 * amounts, junk text — several of which are actually intercepted earlier in
 * the router anyway) scored 0.7628-0.8308. 0.85 sits in that gap with margin
 * on both sides. This is a small (20-question) first-pass calibration, not a
 * permanently-correct number — revisit if real RAG-deferred traffic (logged
 * to unanswered_queries below the floor) suggests it needs adjusting.
 */
const RAG_CONFIDENCE_FLOOR = 0.85;

/**
 * Narrows several matched courses to one using the extra words the student
 * typed, so the "reply with a more specific branch name" prompt in the
 * multi-course reply is a real affordance rather than a dead end.
 *
 * BRANCH_ALIASES maps a whole family to one keyword ("cse" -> "computer"), so
 * the alias alone can never distinguish Computer Engineering from CSE (Data
 * Science). These two rules work off the raw message instead:
 *
 *  1. The full course name typed out ("…computer engineering").
 *  2. Otherwise the distinguishing words ("data science", "cyber") that hit
 *     one matched course more than any other.
 *
 * Returns the original map unchanged when the message is still ambiguous —
 * listing every course is the safe outcome, never a silent guess.
 */
function narrowCoursesByMessage(
  byCourse: Map<string, repo.ChatCutoffRow[]>,
  normalized: string,
  branchHint: string,
): Map<string, repo.ChatCutoffRow[]> {
  if (byCourse.size <= 1) return byCourse;
  const courseNames = [...byCourse.keys()];

  const single = (name: string) =>
    new Map([[name, byCourse.get(name) as repo.ChatCutoffRow[]]]);

  // 1. Exact course name present in the message.
  const exact = courseNames.filter((name) => normalized.includes(name.toLowerCase()));
  if (exact.length === 1) return single(exact[0]);

  // 2. Distinguishing words, scored by how many hit each course name.
  const hintWords = new Set(branchHint.toLowerCase().split(/\s+/));
  const extras = normalized
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !NAME_STOPWORDS.has(w) &&
        !hintWords.has(w) &&
        !BRANCH_ALIASES[w] &&
        !CATEGORY_ALIASES[w],
    );
  if (extras.length === 0) return byCourse;

  let bestScore = 0;
  let bestNames: string[] = [];
  for (const name of courseNames) {
    const lower = name.toLowerCase();
    const score = extras.filter((w) => lower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestNames = [name];
    } else if (score === bestScore && score > 0) {
      bestNames.push(name);
    }
  }
  return bestScore > 0 && bestNames.length === 1 ? single(bestNames[0]) : byCourse;
}

function formatPercentile(percentile: number | null): string {
  return percentile != null ? `${percentile}%ile` : 'no data';
}

function withMenu(text: string, matched: boolean): ChatReply {
  return {
    text,
    quickReplies: MENU_OPTIONS.map((o) => ({ number: o.number, label: o.label })),
    matched,
  };
}

function findAliasToken(
  words: string[],
  aliases: Record<string, string>,
): string | undefined {
  for (const w of words) {
    if (aliases[w]) return aliases[w];
  }
  return undefined;
}

/**
 * Handles acronyms shared by several distinct colleges (MIT, VIT). Returns:
 *  - `{ resolved }`  when the message carries a word that distinguishes one
 *    candidate (e.g. "MIT academy", "VIT mumbai") — resolve it normally.
 *  - `{ prompt }`    when it's still ambiguous — ask rather than guess.
 *  - `null`          when no ambiguous acronym is present — caller falls
 *    through to ordinary college resolution.
 *
 * Deliberately never silently picks a default: a confident wrong college is
 * exactly the failure this item exists to remove.
 */
async function resolveAmbiguousAcronym(
  normalized: string,
  words: string[],
): Promise<{ resolved?: repo.CollegeMatch[]; prompt?: string } | null> {
  for (const w of words) {
    const candidates = AMBIGUOUS_COLLEGE_ACRONYMS[w];
    if (!candidates) continue;

    const distinguished = candidates.filter((c) =>
      c.keywords.some((k) => normalized.includes(k)),
    );
    if (distinguished.length === 1) {
      const matches = await repo.searchCollegesByName(distinguished[0].hint);
      if (matches.length > 0) return { resolved: matches };
    }

    const list = candidates.map((c) => `- ${c.label}`).join('\n');
    return {
      prompt:
        `"${w.toUpperCase()}" could mean a few different colleges — which did you mean?\n${list}\n\n` +
        'Reply with a distinguishing word from the name (e.g. its location) plus your branch.',
    };
  }
  return null;
}

async function resolveCollege(
  normalized: string,
  words: string[],
): Promise<repo.CollegeMatch[]> {
  // 1. Known acronym (COEP, VJTI, ...)
  for (const w of words) {
    if (COLLEGE_ALIASES[w]) {
      const matches = await repo.searchCollegesByName(COLLEGE_ALIASES[w]);
      if (matches.length > 0) return matches;
    }
  }

  // 2. Strip stopwords/branch/category tokens, use what's left as a name hint.
  const hint = words
    .filter((w) => !NAME_STOPWORDS.has(w) && !BRANCH_ALIASES[w] && !CATEGORY_ALIASES[w])
    .join(' ')
    .trim();
  if (hint.length < 3) return [];

  const byName = await repo.searchCollegesByName(hint);
  if (byName.length > 0) return byName;

  return repo.searchCollegesByTrigram(hint);
}

/**
 * Detects a request for ladies-quota (gender = 'L') cutoff data specifically,
 * as opposed to the General-seat default. Roughly a third of all cutoff rows
 * are ladies-quota — previously unreachable through the chatbot because
 * getCutoffAnswer() unconditionally excluded them, so a student asking about
 * ladies quota silently got the General-category number back with no
 * indication it wasn't what they asked for.
 */
const LADIES_QUOTA_PATTERN =
  /\bladies\b|\bwomen'?s?\s+(quota|seat|seats|category)\b|\bfemale\s+(quota|seat|seats|category)\b/;

/** Remembered cutoff-lookup context for a chat session — see the file header comment. */
interface ChatSlots {
  collegeCode?: string;
  collegeName?: string;
  branchHint?: string;
  categoryToken?: string;
}

/** Short — a follow-up is expected within the same conversational burst, not a returning-visitor's next session. */
const CHAT_SLOTS_TTL_SECONDS = 20 * 60;

function slotsKey(sessionId: string): string {
  return `chatbot:slots:${sessionId}`;
}

async function loadSlots(sessionId: string | undefined): Promise<ChatSlots> {
  if (!sessionId) return {};
  return (await cacheGet<ChatSlots>(slotsKey(sessionId))) ?? {};
}

async function handleCutoffIntent(normalized: string, sessionId?: string): Promise<ChatReply> {
  const words = normalized.split(/\s+/).filter(Boolean);
  const slots = await loadSlots(sessionId);

  const explicitCategory = findAliasToken(words, CATEGORY_ALIASES);
  const categoryToken = explicitCategory ?? slots.categoryToken ?? DEFAULT_CATEGORY;
  const branchHint = findAliasToken(words, BRANCH_ALIASES) ?? slots.branchHint;
  const ladiesQuota = LADIES_QUOTA_PATTERN.test(normalized);
  const categoryLabel = ladiesQuota ? `${categoryToken} category (Ladies quota)` : `${categoryToken} category`;

  // Shared acronyms (MIT, VIT) prompt for the specific college rather than
  // silently resolving to one; skip straight to the prompt when still ambiguous.
  const ambiguous = await resolveAmbiguousAcronym(normalized, words);
  if (ambiguous?.prompt) {
    return withMenu(ambiguous.prompt, true);
  }
  let collegeMatches = ambiguous?.resolved ?? (await resolveCollege(normalized, words));

  // Nothing in THIS message named a college — fall back to what the session
  // last resolved, so a bare "computer" after "cutoff for COEP" still works.
  if (collegeMatches.length === 0 && slots.collegeCode && slots.collegeName) {
    collegeMatches = [{ college_code: slots.collegeCode, name: slots.collegeName }];
  }

  if (collegeMatches.length === 0) {
    return withMenu(
      'Which college? Try something like "cutoff for COEP CS" or "percentile for VJTI mechanical OBC".',
      true,
    );
  }

  if (collegeMatches.length > 1) {
    const names = collegeMatches.map((c) => `- ${c.name}`).join('\n');
    return withMenu(
      `I found a few matches — which one did you mean?\n${names}\n\nTry again with the full college name.`,
      true,
    );
  }

  // Exactly one college resolved (this message or remembered) — worth
  // remembering from here on, even if the branch still isn't known yet.
  if (sessionId) {
    const newSlots: ChatSlots = {
      ...slots,
      collegeCode: collegeMatches[0].college_code,
      collegeName: collegeMatches[0].name,
    };
    if (branchHint) newSlots.branchHint = branchHint;
    if (explicitCategory) newSlots.categoryToken = explicitCategory;
    await cacheSet(slotsKey(sessionId), newSlots, CHAT_SLOTS_TTL_SECONDS);
  }

  if (!branchHint) {
    return withMenu(
      `Got it — ${collegeMatches[0].name}. Which branch? (e.g. Computer, Mechanical, Civil, Electronics)`,
      true,
    );
  }

  const rows = await repo.getCutoffAnswer(
    ACTIVE_CUTOFF_YEAR,
    collegeMatches[0].college_code,
    branchHint,
    categoryToken,
    ladiesQuota,
  );

  if (rows.length === 0) {
    return withMenu(
      `No ${categoryLabel} cutoff data found for ${collegeMatches[0].name} in that branch for ${ACTIVE_CUTOFF_YEAR}. ` +
        `Try the full Cutoff Finder at /cutoffs for other categories, years${ladiesQuota ? ', or quotas' : ''}.`,
      true,
    );
  }

  const collegeName = rows[0].college_name;
  const footer = 'Full filters (year, gender, minority quota) at /cutoffs.';

  // A branch keyword like "computer" routinely matches several distinct
  // courses at one college (Computer Engineering, CSE (AI & ML), CSE (Data
  // Science), …) whose cutoffs differ by more than a percentile point. Show
  // each one rather than collapsing them, so the student never reads one
  // branch's number as if it were another's.
  const grouped = new Map<string, repo.ChatCutoffRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.branch);
    if (existing) existing.push(row);
    else grouped.set(row.branch, [row]);
  }

  // Honour any extra detail the student typed before deciding this is
  // ambiguous — "computer engineering" should not be answered as if they had
  // only said "computer".
  const byCourse = narrowCoursesByMessage(grouped, normalized, branchHint);

  if (byCourse.size === 1) {
    const [courseName, courseRows] = [...byCourse.entries()][0];
    const lines = courseRows
      .map((r) => `Round ${r.cap_round}: ${formatPercentile(r.percentile)}`)
      .join('\n');
    return withMenu(
      `${collegeName} — ${courseName}\n${categoryLabel}, ${ACTIVE_CUTOFF_YEAR}:\n${lines}\n\n${footer}`,
      true,
    );
  }

  // Rows arrive ordered by (branch, cap_round), so [0] is each course's
  // earliest available round. Listing every course × every round would be a
  // wall of text on WhatsApp, so show one representative round per course
  // (labelled, since availability can differ) and offer to drill in.
  const perCourse = [...byCourse.values()]
    .map((courseRows) => courseRows[0])
    .sort((a, b) => (b.percentile ?? -1) - (a.percentile ?? -1));

  const shown = perCourse.slice(0, MAX_COURSES_LISTED);
  const lines = shown
    .map((r) => `- ${r.branch} — Round ${r.cap_round}: ${formatPercentile(r.percentile)}`)
    .join('\n');
  const overflow =
    perCourse.length > shown.length
      ? `\n…and ${perCourse.length - shown.length} more at /cutoffs.`
      : '';

  return withMenu(
    `${collegeName} — ${categoryLabel}, ${ACTIVE_CUTOFF_YEAR}.\n` +
      `"${branchHint}" matches ${perCourse.length} branches here, and their cutoffs differ — ` +
      `so here's each one:\n${lines}${overflow}\n\n` +
      'Reply with a more specific branch name for the full round-by-round breakdown. ' +
      footer,
    true,
  );
}

const ROUND_PATTERN = /\bround\s*([1-4])\b|\b([1-4])(?:st|nd|rd|th)\s*round\b|\br([1-4])\b/;

async function handleCapDatesIntent(normalized: string): Promise<ChatReply> {
  const m = normalized.match(ROUND_PATTERN);
  const round = m ? Number(m[1] || m[2] || m[3]) : undefined;

  const rows = await repo.getCapSchedule(ACTIVE_CAP_SCHEDULE_YEAR, round);
  if (rows.length === 0) {
    return withMenu(
      `I don't have CAP round ${round ?? ''} schedule info for ${ACTIVE_CAP_SCHEDULE_YEAR} yet. Check /updates for the latest official notice.`,
      true,
    );
  }

  const anyConfirmed = rows.some((r) => r.is_confirmed);
  if (!anyConfirmed) {
    return withMenu(
      `The official CAP ${ACTIVE_CAP_SCHEDULE_YEAR} schedule hasn't been released by DTE Maharashtra yet. ` +
        "I'll have exact dates as soon as they're published — check /updates for the latest notice in the meantime.",
      true,
    );
  }

  const lines = rows
    .filter((r) => r.is_confirmed)
    .map((r) => `Round ${r.cap_round} — ${r.event_name}: ${r.start_date ?? '?'} to ${r.end_date ?? '?'}`)
    .join('\n');
  return withMenu(`CAP ${ACTIVE_CAP_SCHEDULE_YEAR} schedule:\n${lines}`, true);
}

async function handleDocumentsIntent(): Promise<ChatReply> {
  const rows = await repo.getDocumentChecklist('general');
  const lines = rows
    .map((r, i) => `${i + 1}. ${r.document_name}${r.description ? ` — ${r.description}` : ''}`)
    .join('\n');
  return withMenu(
    `Documents typically needed for CAP admission:\n${lines}\n\n` +
      'Requirements vary slightly by college — always carry originals + one photocopy of each.',
    true,
  );
}

function handlePredictorIntent(): ChatReply {
  return withMenu(
    'Head to our College Predictor at /predictor — enter your percentile or rank, category, and preferred branches to see Safe / Target / Dream colleges.',
    true,
  );
}

function handleCounselorIntent(): ChatReply {
  return withMenu(
    'You can book a free 20-minute session with a counselor at /book, or tap "Continue on WhatsApp" to chat with us directly.',
    true,
  );
}

/**
 * Defer branches — the guardrails for the boundaries agreed for Phase 2:
 * personalized recommendations and date/fee-specific numbers are never
 * answered from static content, they point the student to the right tool or a
 * consultation. These run BEFORE the keyword/FAQ router so they can't be
 * mis-answered, and they exist now (ahead of the RAG path) so the same guards
 * are in place when RAG lands. Date questions are already handled by the CAP
 * schedule intent (which defers to /updates until DTE publishes), so the only
 * uncovered "number" case here is fee amounts.
 */
function handlePersonalizedDefer(): ChatReply {
  return withMenu(
    "That really depends on your percentile, category, and what you actually want from your degree — " +
      "it's too personal a call for me to flatten into one generic answer. Try the College Predictor at " +
      '/predictor to see which colleges fit your score, or book a free session at /book and talk it ' +
      'through properly with a counselor.',
    true,
  );
}

/**
 * The seat acceptance fee is flat across every category and depends only on
 * how many times the student has accepted a NEW seat in CAP (1st / 2nd via
 * Betterment / 3rd via Betterment) — see migrations/021_fee_schedule.sql for
 * the sourced figures. There's no category to ask for, and the full answer
 * is short enough to just state directly rather than slot-filling first.
 */
async function handleFeeIntent(): Promise<ChatReply> {
  const rows = await repo.getFeeSchedule(ACTIVE_CAP_SCHEDULE_YEAR);
  const confirmed = rows.filter((r) => r.is_confirmed);

  if (confirmed.length === 0) {
    return withMenu(
      `I don't have the official ${ACTIVE_CAP_SCHEDULE_YEAR} seat acceptance fee published yet. ` +
        'Check /updates or the CAP information brochure on the CET Cell website for the latest amounts.',
      true,
    );
  }

  const lines = confirmed
    .map((r) => `${r.seat_sequence}. ${r.label}: ₹${r.amount_inr.toLocaleString('en-IN')}`)
    .join('\n');
  const source = confirmed.find((r) => r.source_url)?.source_url;

  return withMenu(
    `The CAP ${ACTIVE_CAP_SCHEDULE_YEAR} seat acceptance fee is the same for every category — it only ` +
      "depends on how many times you've accepted a new seat:\n\n" +
      `${lines}\n\n` +
      "It's non-refundable and paid separately each time you accept a seat. Your first-ever allotment " +
      "is always ₹1,000 no matter which CAP round it happens in." +
      (source ? `\n\nSource: ${source}` : ''),
    true,
  );
}

/**
 * The final fallback (§3.2 in CHATBOT_ARCHITECTURE.md): only reached once the
 * keyword router and the FAQ trigram match (primary + rescue) have all
 * declined, so this only runs for conceptual questions with no FAQ coverage.
 * Retrieval failure, a below-floor top match, a safety-blocked/empty Gemini
 * response, or an unconfigured GEMINI_API_KEY all return null the same way —
 * the caller treats every one of those identically as "RAG couldn't answer"
 * and falls through to the existing log + generic fallback, never guessing
 * and never surfacing an infrastructure error to the student.
 */
async function tryRag(rawMessage: string): Promise<string | null> {
  const chunks = await repo.searchRagChunks(rawMessage, RAG_TOP_K);
  if (chunks.length === 0 || chunks[0].similarity < RAG_CONFIDENCE_FLOOR) {
    return null;
  }
  return gemini.generateGroundedAnswer(rawMessage, chunks);
}

interface FaqCandidate {
  answer: string;
  confidence: number;
}

interface FaqScoreResult {
  /**
   * The similarity()-scale candidate from the raw/filtered agreement rule.
   * Its confidence is compared against FAQ_OVERRIDE_CONFIDENCE / FAQ_MIN_CONFIDENCE.
   */
  primary: FaqCandidate | null;
  /**
   * A rescue candidate from word_similarity() for short queries the
   * length-normalised primary misses. `null` unless it clears WORD_SIM_RESCUE
   * AND the filtered query carries a distinctive (non-generic) token.
   * Deliberately only consulted on the no-keyword-intent path so its
   * generosity can't hijack a structured lookup.
   */
  rescue: FaqCandidate | null;
}

/**
 * Best FAQ match for a message across two scoring strategies.
 *
 * Primary (similarity(), length-normalised): scores each FAQ against both the
 * raw message and a filler-stripped form, then combines them by AGREEMENT
 * rather than by taking the higher score:
 *
 * - Both forms pick the same FAQ  -> confident; use the higher of the two
 *   scores. ("difference between percentile and percentage" agrees on its
 *   own FAQ, lifting it from the filtered form's weak 0.195 to 0.649.)
 * - They disagree                 -> trust the filtered form. Raw text lets
 *   shared boilerplate dominate, which is exactly how "difference between
 *   float and freeze" lands on the e-Scrutiny FAQ; the filtered form keys on
 *   "float freeze" and picks correctly.
 *
 * Taking max() across both forms would reintroduce that float/freeze bug,
 * since the wrong raw match (0.364) outscores the right filtered one (0.274).
 *
 * Rescue (word_similarity(), not length-normalised): the best filtered-form
 * word_similarity match, kept only when it clears WORD_SIM_RESCUE and the
 * filtered query still has a distinctive token (see RESCUE_GENERIC_WORDS).
 */
async function scoreBestFaq(normalized: string): Promise<FaqScoreResult> {
  const contentWords = normalized
    .split(/\s+/)
    .filter((w) => w && !FAQ_STOPWORDS.has(w));
  const filtered = contentWords.length > 0 ? contentWords.join(' ') : normalized;

  const rows = await repo.scoreFaqs(normalized, filtered);
  if (rows.length === 0) return { primary: null, rescue: null };

  let bestRaw = rows[0];
  let bestFiltered = rows[0];
  let bestWord = rows[0];
  for (const row of rows) {
    if (Number(row.sim_raw) > Number(bestRaw.sim_raw)) bestRaw = row;
    if (Number(row.sim_filtered) > Number(bestFiltered.sim_filtered)) bestFiltered = row;
    if (Number(row.wsim_filtered) > Number(bestWord.wsim_filtered)) bestWord = row;
  }

  const agree = bestRaw.question === bestFiltered.question;
  const primary: FaqCandidate = agree
    ? {
        answer: bestRaw.answer,
        confidence: Math.max(Number(bestRaw.sim_raw), Number(bestRaw.sim_filtered)),
      }
    : {
        answer: bestFiltered.answer,
        confidence: Number(bestFiltered.sim_filtered),
      };

  // Rescue only when the filtered query keeps a distinctive token — a query
  // that is nothing but generic domain words ("the college") would score 1.000
  // on word_similarity against any FAQ mentioning that word.
  const hasDistinctiveToken = contentWords.some((w) => !RESCUE_GENERIC_WORDS.has(w));
  const rescue: FaqCandidate | null =
    hasDistinctiveToken && Number(bestWord.wsim_filtered) >= WORD_SIM_RESCUE
      ? { answer: bestWord.answer, confidence: Number(bestWord.wsim_filtered) }
      : null;

  return { primary, rescue };
}

const MENU_TRIGGERS = new Set(['hi', 'hello', 'hey', 'hii', 'menu', 'help', 'start', 'options']);

/**
 * Personalized-recommendation questions ("which branch is best for me",
 * "should I pick CS or IT for me"). Keyed on personal-reference phrases and
 * explicit recommendation verbs, deliberately narrow so it does NOT catch
 * "which college can I get with 95 percentile" (a predictor lookup — no
 * "for me" / "best … for" / "should I pick") or mechanics questions like
 * "should I float or freeze" (float/freeze aren't in the verb list).
 */
const PERSONALIZED_RECO_PATTERN =
  /\bfor me\b|\bfor my (rank|percentile|score|marks|category|situation|case|profile)\b|\brecommend\b|\bsuggest (a |an |me )?(college|branch|course)\b|\bbest (college|branch|course) for\b|\bshould i (pick|choose|take|opt for|go for|prefer|select)\b/;

/** Fee-amount questions — routed to handleFeeIntent() (real, sourced figures; see migrations/021_fee_schedule.sql). */
const FEE_PATTERN =
  /\bhow much (is|are|does|will|would|to pay|do i pay)\b|\bfee amount\b|\bfees? (amount|cost|structure|details)\b|\bseat acceptance fee\b|\bwhat (is|are) the fees?\b|\bcost of admission\b|\badmission fee\b/;

const CUTOFF_PATTERN = /\b(cutoff|cut off|percentile)\b/;
const CAP_DATE_PATTERN = /\b(cap round|cap date|round date|schedule|when is round|registration date|choice filling|seat allotment)\b/;
const DOCUMENTS_PATTERN = /\b(document|documents|checklist|papers needed|required documents)\b/;
const PREDICTOR_PATTERN = /\b(chance|chances|eligible|eligibility|which college|predict|predictor)\b/;
const COUNSELOR_PATTERN = /\b(counselor|counsellor|talk to|human|real person|agent|call me|speak to)\b/;

type IntentHandler = (normalized: string, sessionId?: string) => ChatReply | Promise<ChatReply>;

/**
 * Ordered keyword rules — first match wins. Returns the matching handler (not
 * its result) so the caller can weigh it against FAQ confidence before
 * committing to it.
 *
 * PREDICTOR is checked BEFORE CUTOFF on purpose. A predictor question ("which
 * college can I get with 95 percentile") contains the word "percentile", which
 * also triggers CUTOFF — but a cutoff lookup names a specific college and
 * never carries a predictor phrase (chance/eligible/which college/predict), so
 * ordering predictor first captures the overlap without stealing genuine
 * cutoff queries. Before this order, that question hit CUTOFF and dead-ended on
 * "Which college?" despite being exactly what the predictor answers.
 */
const KEYWORD_INTENTS: Array<{ pattern: RegExp; handler: IntentHandler }> = [
  { pattern: PREDICTOR_PATTERN, handler: () => handlePredictorIntent() },
  { pattern: FEE_PATTERN, handler: () => handleFeeIntent() },
  { pattern: CUTOFF_PATTERN, handler: handleCutoffIntent },
  { pattern: CAP_DATE_PATTERN, handler: handleCapDatesIntent },
  { pattern: DOCUMENTS_PATTERN, handler: () => handleDocumentsIntent() },
  { pattern: COUNSELOR_PATTERN, handler: () => handleCounselorIntent() },
];

function detectKeywordIntent(normalized: string): IntentHandler | null {
  for (const { pattern, handler } of KEYWORD_INTENTS) {
    if (pattern.test(normalized)) return handler;
  }
  return null;
}

export async function getReply(
  rawMessage: string,
  channel: ChatChannel,
  contactIdentifier?: string,
  sessionId?: string,
): Promise<ChatReply> {
  const normalized = rawMessage.trim().toLowerCase();

  if (!normalized || MENU_TRIGGERS.has(normalized)) {
    return withMenu(MENU_TEXT, true);
  }

  if (/^[1-6]$/.test(normalized)) {
    switch (normalized) {
      case '1':
        return withMenu(
          'Sure — tell me the college and branch, e.g. "cutoff for COEP CS" or "percentile for VJTI mechanical OBC".',
          true,
        );
      case '2':
        return handleCapDatesIntent(normalized);
      case '3':
        return handleDocumentsIntent();
      case '4':
        return handlePredictorIntent();
      case '5':
        return handleCounselorIntent();
      default:
        return withMenu(
          'Type your question — e.g. "difference between float and freeze" or "what is HU vs OHU".',
          true,
        );
    }
  }

  // Personalized-recommendation questions are never answered from static
  // content — this defer still runs before the keyword/FAQ router. Fee
  // questions used to get the same unconditional treatment, but now that the
  // real amounts are looked up (see handleFeeIntent/FEE_PATTERN in
  // KEYWORD_INTENTS below) there's no reason to intercept them early.
  if (PERSONALIZED_RECO_PATTERN.test(normalized)) {
    return handlePersonalizedDefer();
  }

  // The keyword router and the FAQ search are evaluated together and compared
  // by confidence, rather than the router short-circuiting unconditionally.
  // Several real questions carry an intent keyword while actually being
  // conceptual — "what is the difference between percentile and percentage"
  // and "what is the source of the cutoff data" both contain cutoff/percentile
  // triggers, and used to be answered with a nonsensical "Which college?"
  // despite having exact FAQ entries. A confident FAQ match now wins; a weak
  // one still defers to the structured-lookup intent.
  const keywordIntent = detectKeywordIntent(normalized);
  const { primary, rescue } = await scoreBestFaq(normalized);

  if (keywordIntent) {
    // Only the length-normalised primary can override a structured lookup.
    // The word_similarity rescue is deliberately NOT consulted here — its
    // generosity would let a structured query ("cutoff for COEP CS") match an
    // FAQ on a shared substring and hijack the intent.
    if (primary && primary.confidence >= FAQ_OVERRIDE_CONFIDENCE) {
      return withMenu(primary.answer, true);
    }
    return keywordIntent(normalized, sessionId);
  }

  if (primary && primary.confidence >= FAQ_MIN_CONFIDENCE) {
    return withMenu(primary.answer, true);
  }

  // No keyword intent and the primary score is weak — try the short-query
  // word_similarity rescue before giving up ("what is TFWS", "what is float").
  if (rescue) {
    return withMenu(rescue.answer, true);
  }

  // A bare reply like "computer" or "obc" never contains "cutoff"/"percentile",
  // so CUTOFF_PATTERN (and therefore the whole keyword router) never fires for
  // it — without this, a session that just asked "which branch?" for a
  // remembered college would dead-end every follow-up straight into the
  // generic fallback. Deliberately narrow (EVERY word must be a recognised
  // branch/category alias, not just one) so it only catches genuine bare
  // slot-answers, never a real question that happens to contain one of those
  // words ("what is TFWS" is already resolved by the rescue above).
  if (sessionId) {
    const pendingSlots = await loadSlots(sessionId);
    if (pendingSlots.collegeCode) {
      const words = normalized.split(/\s+/).filter(Boolean);
      const isPureSlotAnswer =
        words.length > 0 && words.every((w) => BRANCH_ALIASES[w] || CATEGORY_ALIASES[w]);
      if (isPureSlotAnswer) {
        return handleCutoffIntent(normalized, sessionId);
      }
    }
  }

  // Last resort: RAG over the seat-mechanics corpus (Phase 2 step b). Runs
  // only here — after the keyword router and every FAQ path have declined —
  // so it fires rarely, on genuinely uncovered conceptual questions.
  const ragAnswer = await tryRag(rawMessage);
  if (ragAnswer) {
    return withMenu(ragAnswer, true);
  }

  await repo.logUnansweredQuery(channel, rawMessage, contactIdentifier);
  return withMenu(FALLBACK_TEXT, false);
}
