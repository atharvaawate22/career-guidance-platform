/**
 * Shared SQL-condition builders for the normalized cutoffs schema
 * (colleges / courses / cutoffs). Used by both the cutoffs explorer and the
 * predictor so category / gender / minority semantics stay identical.
 *
 * All builders return parameterized fragments ($N placeholders) plus the values
 * and the next free placeholder index, so callers can compose them safely.
 */
import { getMinorityGroupDefinitions } from './minorityStatus';

export interface SqlCondition {
  condition: string;
  values: unknown[];
  nextIndex: number;
}

const SOCIAL_CATEGORIES = new Set([
  'OPEN', 'SC', 'ST', 'VJ', 'NT1', 'NT2', 'NT3', 'OBC', 'SEBC',
]);

/**
 * Maps a requested category token (e.g. 'OPEN', 'EWS', 'TFWS', 'MI',
 * 'PWD_OBC', 'DEF_SC') onto the decoded cutoffs columns (category + subquota).
 *
 * - social categories  → category = X AND subquota IS NULL  (plain seats)
 * - EWS / TFWS / ORPHAN → subquota = X
 * - MI                  → subquota = 'MINORITY'
 * - PWD_X / DEF_X       → subquota = PWD|DEF AND category = X
 *
 * `includeTfws` additionally ORs in TFWS seats alongside the chosen category.
 */
export function buildCategoryCondition(
  category: string | undefined,
  includeTfws: boolean,
  startIndex: number,
  alias = 'co',
): SqlCondition {
  const values: unknown[] = [];
  let i = startIndex;

  const baseFor = (cat: string): string | null => {
    if (SOCIAL_CATEGORIES.has(cat)) {
      const c = `(${alias}.category = $${i} AND ${alias}.subquota IS NULL)`;
      values.push(cat);
      i += 1;
      return c;
    }
    if (cat === 'EWS' || cat === 'TFWS' || cat === 'ORPHAN') {
      const c = `${alias}.subquota = $${i}`;
      values.push(cat);
      i += 1;
      return c;
    }
    if (cat === 'MI') {
      const c = `${alias}.subquota = $${i}`;
      values.push('MINORITY');
      i += 1;
      return c;
    }
    if (cat.startsWith('PWD_') || cat.startsWith('DEF_')) {
      const sub = cat.slice(0, 3); // PWD | DEF
      const social = cat.slice(4);
      const c = `(${alias}.subquota = $${i} AND ${alias}.category = $${i + 1})`;
      values.push(sub, social);
      i += 2;
      return c;
    }
    return null;
  };

  if (!category) return { condition: '', values, nextIndex: i };

  const base = baseFor(category);
  if (!base) return { condition: '', values, nextIndex: i };

  let condition = base;
  if (includeTfws && category !== 'TFWS') {
    condition = `(${base} OR ${alias}.subquota = $${i})`;
    values.push('TFWS');
    i += 1;
  }
  return { condition, values, nextIndex: i };
}

/**
 * Candidate-gender eligibility on decoded `gender` ('G' general, 'L' ladies):
 * - female      → eligible for any seat (no restriction)
 * - male / all  → exclude ladies-only seats
 * - unspecified → no restriction
 * Uses IS DISTINCT FROM so NULL-gender (quota) rows are kept for males.
 */
export function buildGenderCondition(
  gender: string | undefined,
  startIndex: number,
  alias = 'co',
): SqlCondition {
  const g = gender?.trim().toLowerCase();
  if (g === 'male' || g === 'all') {
    return {
      condition: `${alias}.gender IS DISTINCT FROM 'L'`,
      values: [],
      nextIndex: startIndex,
    };
  }
  return { condition: '', values: [], nextIndex: startIndex };
}

/**
 * Minority filter against the colleges dimension (minority_type / minority_group).
 * Matches any selected type OR any selected group (group matched via aliases).
 */
export function buildCollegeMinorityCondition(
  minorityTypes: string[] | undefined,
  minorityGroups: string[] | undefined,
  startIndex: number,
  alias = 'col',
): SqlCondition {
  const defs = getMinorityGroupDefinitions();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = startIndex;

  const types = (minorityTypes ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t === 'linguistic' || t === 'religious');
  if (types.length > 0) {
    conditions.push(`LOWER(${alias}.minority_type) = ANY($${i}::text[])`);
    values.push(types);
    i += 1;
  }

  const resolved = (minorityGroups ?? [])
    .map((g) => defs.find((d) => d.key === g.trim().toLowerCase()))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  for (const def of resolved) {
    const aliasConds = def.aliases.map(() => `LOWER(${alias}.minority_group) LIKE $${i++}`);
    conditions.push(`(${aliasConds.join(' OR ')})`);
    values.push(...def.aliases.map((a) => `%${a.toLowerCase()}%`));
  }

  return {
    condition: conditions.length > 0 ? `(${conditions.join(' OR ')})` : '',
    values,
    nextIndex: i,
  };
}
