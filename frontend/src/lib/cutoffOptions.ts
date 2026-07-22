export const CUTOFF_CATEGORIES = [
  'OPEN',
  'SC',
  'ST',
  'VJ',
  'NT1',
  'NT2',
  'NT3',
  'OBC',
  'SEBC',
  'EWS',
  'TFWS',
  'MI',
  'ORPHAN',
  'DEF_OPEN',
  'DEF_OBC',
  'DEF_SC',
  'DEF_ST',
  'DEF_SEBC',
  'DEF_VJ',
  'DEF_NT1',
  'DEF_NT2',
  'DEF_NT3',
  'PWD_OPEN',
  'PWD_OBC',
  'PWD_SC',
  'PWD_ST',
  'PWD_SEBC',
  'PWD_VJ',
  'PWD_NT1',
  'PWD_NT2',
  'PWD_NT3',
] as const;

export const CUTOFF_LEVELS = [
  'State Level',
  'Home University Level',
  'Other Than Home University Level',
] as const;

export const CUTOFF_STAGES = ['I', 'II', 'III', 'IV'] as const;

/** CAP rounds (1–4). The cutoff data now models the round explicitly, separate
 *  from the allotment stage within a round. */
export const CAP_ROUNDS = [1, 2, 3, 4] as const;

/* ── Branch families ──────────────────────────────────────────────────────
 * The raw DTE branch list is ~100 near-duplicate strings ("Computer Science
 * and Engineering (Data Science)", "CSE (AI and ML)", …). Families give users
 * one-click selection of a whole discipline and drive popularity-first
 * ordering in the dropdowns, so CS/ENTC/Mech sit above the Oil/Textile long
 * tail instead of being interleaved alphabetically. */

export interface BranchFamily {
  key: string;
  label: string;
  pattern: RegExp;
}

/** Order doubles as display/popularity precedence (used as sort tiebreak). */
export const BRANCH_FAMILIES: BranchFamily[] = [
  { key: "cs", label: "Computer & Allied (CS / IT / AI / DS)", pattern: /computer|information technology|artificial intelligence|data science|machine learning|cyber|software|internet of things|\biot\b/ },
  { key: "entc", label: "Electronics & Telecom (ENTC / VLSI)", pattern: /electronic|telecommunication|communication|vlsi|\b5g\b/ },
  { key: "mech", label: "Mechanical & Allied", pattern: /mechanical|mechatronic|production engineering|manufacturing|automobile|automation|robotic/ },
  { key: "civil", label: "Civil & Allied", pattern: /civil|structural|infrastructure/ },
  { key: "elec", label: "Electrical & Allied", pattern: /electrical/ },
];

function normalizeBranch(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}

/**
 * Assign a branch to exactly one family: the one whose keyword appears
 * EARLIEST in the name. Position (not family precedence) decides, so
 * "Civil Engineering with Computer Application" stays Civil rather than
 * being swept into Computer & Allied, while "Computer Science and
 * Engineering (AI)" stays CS. Family order only breaks exact ties.
 */
export function getBranchFamilyIndex(branch: string): number {
  const normalized = normalizeBranch(branch);
  let best = BRANCH_FAMILIES.length; // "other" bucket sorts after all families
  let bestPos = Infinity;
  BRANCH_FAMILIES.forEach((family, index) => {
    const pos = normalized.search(family.pattern);
    if (pos !== -1 && pos < bestPos) {
      bestPos = pos;
      best = index;
    }
  });
  return best;
}

/**
 * Build one-click "select the whole family" groups from the live branch list
 * (e.g. for MultiSelect quickGroups). Families with no matching branches in
 * the current dataset are omitted.
 */
export function buildBranchFamilyGroups(
  branches: string[],
): { label: string; values: string[] }[] {
  return BRANCH_FAMILIES.map((family, index) => ({
    label: family.label,
    values: branches.filter(b => getBranchFamilyIndex(b) === index),
  })).filter(group => group.values.length > 0);
}

/**
 * Sort branches family-first (CS → ENTC → Mech → Civil → Electrical → rest),
 * alphabetically within each family, with non-letter-leading names (e.g.
 * "5G") pushed to the bottom of their family so a terse/odd value never
 * heads a section.
 */
export function sortBranches(branches: string[]): string[] {
  return [...branches].sort((a, b) => {
    const familyDiff = getBranchFamilyIndex(a) - getBranchFamilyIndex(b);
    if (familyDiff !== 0) return familyDiff;
    const aAlpha = /^[A-Za-z]/.test(a) ? 0 : 1;
    const bAlpha = /^[A-Za-z]/.test(b) ? 0 : 1;
    if (aAlpha !== bAlpha) return aAlpha - bAlpha;
    return a.localeCompare(b);
  });
}
