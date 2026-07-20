/**
 * Root menu shown on greeting/help and logged into every reply's quickReplies.
 * Numbers are globally stable and never nested — see chatbot.service.ts for
 * why this bot is deliberately stateless (no per-session menu context).
 */
export const MENU_OPTIONS = [
  { number: 1, label: 'Cutoff percentile for a college & branch' },
  { number: 2, label: 'CAP round dates' },
  { number: 3, label: 'Documents needed for CAP' },
  { number: 4, label: 'Which colleges can I get? (Predictor)' },
  { number: 5, label: 'Talk to a counselor' },
  { number: 6, label: 'Ask a general question (float vs freeze, HU/OHU, etc.)' },
] as const;

export const MENU_TEXT =
  'Hi! I\'m the CET Hub assistant. What would you like help with?\n\n' +
  MENU_OPTIONS.map((o) => `${o.number}. ${o.label}`).join('\n') +
  '\n\nReply with a number, or just type your question.';

export const FALLBACK_TEXT =
  "I didn't understand that. Try asking about cutoffs, CAP dates, or documents — " +
  'or reply "menu" to see all options.';

/** Common abbreviations students actually type, mapped onto substrings that appear in `courses.branch_group`. */
export const BRANCH_ALIASES: Record<string, string> = {
  cs: 'computer',
  cse: 'computer',
  comp: 'computer',
  computer: 'computer',
  it: 'information technology',
  extc: 'electronics',
  'e&tc': 'electronics',
  entc: 'electronics',
  ece: 'electronics',
  electronics: 'electronics',
  mech: 'mechanical',
  mechanical: 'mechanical',
  civil: 'civil',
  chem: 'chemical',
  chemical: 'chemical',
  electrical: 'electrical',
  ee: 'electrical',
  aids: 'artificial intelligence',
  aiml: 'artificial intelligence',
  'ai/ds': 'artificial intelligence',
  ai: 'artificial intelligence',
  robotics: 'robotics',
  instru: 'instrumentation',
  instrumentation: 'instrumentation',
  auto: 'automobile',
  automobile: 'automobile',
  production: 'production',
  textile: 'textile',
  biotech: 'bio',
};

/** Category tokens a student might type, mapped to the `buildCategoryCondition` vocabulary. */
export const CATEGORY_ALIASES: Record<string, string> = {
  open: 'OPEN',
  general: 'OPEN',
  gen: 'OPEN',
  obc: 'OBC',
  sebc: 'SEBC',
  sc: 'SC',
  st: 'ST',
  vj: 'VJ',
  nt1: 'NT1',
  nt2: 'NT2',
  nt3: 'NT3',
  ews: 'EWS',
  tfws: 'TFWS',
};

export const DEFAULT_CATEGORY = 'OPEN';

/**
 * Common college acronyms students type instead of the full registered name
 * (e.g. "COEP" for "College of Engineering, Pune"). Plain ILIKE/trigram
 * matching on `colleges.name` alone won't resolve these, so they're matched
 * as a literal token first. Not exhaustive — anything missed here still
 * falls through to trigram similarity, and ultimately to the fallback log
 * if neither resolves.
 */
// Verified against the live `colleges` table (each hint resolves to exactly
// one row) — see CHATBOT_ARCHITECTURE.md for why these can't just be derived
// from the acronym itself (some official names don't contain the acronym at
// all; others collide with unrelated colleges as a bare substring).
export const COLLEGE_ALIASES: Record<string, string> = {
  coep: 'COEP',
  vjti: 'VJTI',
  pict: 'Pune Institute of Computer Technology',
  spit: 'Sardar Patel Institute of Technology',
  djsce: 'Dwarkadas J. Sanghvi College of Engineering',
  ict: 'Institute of Chemical Technology, Matunga, Mumbai',
  vit: 'Vishwakarma Institute of Technology',
  pvg: 'PVG',
  mit: 'MIT Academy of Engineering',
  scoe: 'Sinhgad College of Engineering, Vadgaon',
  ltcoe: 'Lokmanya Tilak College of Engineering, Kopar Khairane',
  kjsce: 'K J Somaiya Institute of Technology',
  somaiya: 'K J Somaiya Institute of Technology',
  tsec: 'Thadomal Shahani Engineering College',
  fcrit: 'Conceicao Rodrigues College of Engineering',
  wce: 'Walchand College of Engineering, Sangli',
  walchand: 'Walchand College of Engineering, Sangli',
};
