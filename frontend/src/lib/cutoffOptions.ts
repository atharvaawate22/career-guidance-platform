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

/**
 * Sort branch names alphabetically, but push any that don't start with a letter
 * (e.g. "5G") to the bottom so a terse/odd value never heads the dropdown.
 */
export function sortBranches(branches: string[]): string[] {
  return [...branches].sort((a, b) => {
    const aAlpha = /^[A-Za-z]/.test(a) ? 0 : 1;
    const bAlpha = /^[A-Za-z]/.test(b) ? 0 : 1;
    if (aAlpha !== bAlpha) return aAlpha - bAlpha;
    return a.localeCompare(b);
  });
}
