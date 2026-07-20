/**
 * Channel-agnostic chatbot decision service — the shared "brain" described in
 * CHATBOT_ARCHITECTURE.md. Both the website controller and the WhatsApp
 * webhook call getReply() and render the ChatReply into their own output
 * format; no channel-specific logic lives here.
 *
 * Deliberately stateless: no per-session/per-user conversation state is
 * stored anywhere (no Redis session, no DB row). The root menu numbers are
 * globally fixed and never nested, so a bare "1"–"6" reply is unambiguous
 * without remembering what was shown before. This keeps Phase 1 genuinely
 * rule-based (each message is classified independently) and avoids building
 * session/state infrastructure before there's a proven need for it.
 */
import * as repo from './chatbot.repository';
import { ACTIVE_CUTOFF_YEAR, ACTIVE_CAP_SCHEDULE_YEAR } from '../../config/constants';
import {
  MENU_OPTIONS,
  MENU_TEXT,
  FALLBACK_TEXT,
  BRANCH_ALIASES,
  CATEGORY_ALIASES,
  COLLEGE_ALIASES,
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
 * matched at all. Matches the previous SQL threshold.
 */
const FAQ_MIN_CONFIDENCE = 0.2;

/**
 * Higher bar an FAQ must clear to OVERRIDE a matched keyword intent. Chosen
 * from measured scores against the live FAQ table: real conceptual questions
 * that the keyword router used to hijack score 0.41–0.79, while genuine
 * structured lookups ("cutoff for COEP CS", "when is round 2", "which
 * college can I get with 95 percentile") top out at 0.20. 0.35 sits in that
 * gap with margin on both sides.
 */
const FAQ_OVERRIDE_CONFIDENCE = 0.35;

/** Cap on how many distinct courses a single cutoff reply lists before deferring to /cutoffs — keeps WhatsApp replies readable. */
const MAX_COURSES_LISTED = 8;

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

async function handleCutoffIntent(normalized: string): Promise<ChatReply> {
  const words = normalized.split(/\s+/).filter(Boolean);

  const categoryToken = findAliasToken(words, CATEGORY_ALIASES) ?? DEFAULT_CATEGORY;
  const branchHint = findAliasToken(words, BRANCH_ALIASES);
  const collegeMatches = await resolveCollege(normalized, words);

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
  );

  if (rows.length === 0) {
    return withMenu(
      `No ${categoryToken} category cutoff data found for ${collegeMatches[0].name} in that branch for ${ACTIVE_CUTOFF_YEAR}. ` +
        'Try the full Cutoff Finder at /cutoffs for other categories or years.',
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
      `${collegeName} — ${courseName}\n${categoryToken} category, ${ACTIVE_CUTOFF_YEAR}:\n${lines}\n\n${footer}`,
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
    `${collegeName} — ${categoryToken} category, ${ACTIVE_CUTOFF_YEAR}.\n` +
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

interface FaqCandidate {
  answer: string;
  confidence: number;
}

/**
 * Best FAQ match for a message, with a confidence the router can weigh
 * against a keyword-intent match.
 *
 * Scores each FAQ against both the raw message and a filler-stripped form,
 * then combines them by AGREEMENT rather than by taking the higher score:
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
 */
async function scoreBestFaq(normalized: string): Promise<FaqCandidate | null> {
  const contentWords = normalized
    .split(/\s+/)
    .filter((w) => w && !FAQ_STOPWORDS.has(w));
  const filtered = contentWords.length > 0 ? contentWords.join(' ') : normalized;

  const rows = await repo.scoreFaqs(normalized, filtered);
  if (rows.length === 0) return null;

  let bestRaw = rows[0];
  let bestFiltered = rows[0];
  for (const row of rows) {
    if (Number(row.sim_raw) > Number(bestRaw.sim_raw)) bestRaw = row;
    if (Number(row.sim_filtered) > Number(bestFiltered.sim_filtered)) bestFiltered = row;
  }

  const agree = bestRaw.question === bestFiltered.question;
  if (agree) {
    return {
      answer: bestRaw.answer,
      confidence: Math.max(Number(bestRaw.sim_raw), Number(bestRaw.sim_filtered)),
    };
  }
  return {
    answer: bestFiltered.answer,
    confidence: Number(bestFiltered.sim_filtered),
  };
}

const MENU_TRIGGERS = new Set(['hi', 'hello', 'hey', 'hii', 'menu', 'help', 'start', 'options']);
const CUTOFF_PATTERN = /\b(cutoff|cut off|percentile)\b/;
const CAP_DATE_PATTERN = /\b(cap round|cap date|round date|schedule|when is round|registration date|choice filling|seat allotment)\b/;
const DOCUMENTS_PATTERN = /\b(document|documents|checklist|papers needed|required documents)\b/;
const PREDICTOR_PATTERN = /\b(chance|chances|eligible|eligibility|which college|predict|predictor)\b/;
const COUNSELOR_PATTERN = /\b(counselor|counsellor|talk to|human|real person|agent|call me|speak to)\b/;

type IntentHandler = (normalized: string) => ChatReply | Promise<ChatReply>;

/**
 * Ordered keyword rules. Returns the matching handler (not its result) so the
 * caller can weigh it against FAQ confidence before committing to it.
 */
const KEYWORD_INTENTS: Array<{ pattern: RegExp; handler: IntentHandler }> = [
  { pattern: CUTOFF_PATTERN, handler: handleCutoffIntent },
  { pattern: CAP_DATE_PATTERN, handler: handleCapDatesIntent },
  { pattern: DOCUMENTS_PATTERN, handler: () => handleDocumentsIntent() },
  { pattern: PREDICTOR_PATTERN, handler: () => handlePredictorIntent() },
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

  // The keyword router and the FAQ search are evaluated together and compared
  // by confidence, rather than the router short-circuiting unconditionally.
  // Several real questions carry an intent keyword while actually being
  // conceptual — "what is the difference between percentile and percentage"
  // and "what is the source of the cutoff data" both contain cutoff/percentile
  // triggers, and used to be answered with a nonsensical "Which college?"
  // despite having exact FAQ entries. A confident FAQ match now wins; a weak
  // one still defers to the structured-lookup intent.
  const keywordIntent = detectKeywordIntent(normalized);
  const faq = await scoreBestFaq(normalized);

  if (keywordIntent) {
    if (faq && faq.confidence >= FAQ_OVERRIDE_CONFIDENCE) {
      return withMenu(faq.answer, true);
    }
    return keywordIntent(normalized);
  }

  if (faq && faq.confidence >= FAQ_MIN_CONFIDENCE) {
    return withMenu(faq.answer, true);
  }

  await repo.logUnansweredQuery(channel, rawMessage, contactIdentifier);
  return withMenu(FALLBACK_TEXT, false);
}
