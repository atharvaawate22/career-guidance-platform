import { describe, expect, it } from 'vitest';
import {
  buildCategoryCondition,
  buildGenderCondition,
  buildCollegeMinorityCondition,
} from '../src/utils/cutoffFilters';

/**
 * The shared SQL-condition builders. Pure functions, zero mocks — and until
 * now, zero tests, despite being the single piece of logic the cutoff explorer,
 * the predictor and the chatbot all depend on for correct category semantics.
 *
 * These encode real admission rules. `category = 'OPEN' AND subquota IS NULL`
 * versus `subquota = 'EWS'` is the difference between showing a student the
 * general-merit closing rank and the EWS one; getting it wrong is not a
 * cosmetic bug, it is telling someone they can get into a college they cannot.
 *
 * A table test over these would also have caught the 500s fixed in
 * cutoffs.schemas: both builders assume a string and throw on an array.
 */

describe('buildCategoryCondition', () => {
  it('maps a social category to category + NULL subquota (plain seats)', () => {
    const { condition, values, nextIndex } = buildCategoryCondition('OPEN', false, 1);

    expect(condition).toBe('(co.category = $1 AND co.subquota IS NULL)');
    expect(values).toEqual(['OPEN']);
    expect(nextIndex).toBe(2);
  });

  it.each(['SC', 'ST', 'VJ', 'NT1', 'NT2', 'NT3', 'OBC', 'SEBC'])(
    'treats %s as a social category',
    (category) => {
      const { condition, values } = buildCategoryCondition(category, false, 1);
      expect(condition).toContain('subquota IS NULL');
      expect(values).toEqual([category]);
    },
  );

  it.each(['EWS', 'TFWS', 'ORPHAN'])(
    'maps %s onto subquota, with no category predicate',
    (category) => {
      const { condition, values, nextIndex } = buildCategoryCondition(category, false, 1);
      expect(condition).toBe('co.subquota = $1');
      expect(values).toEqual([category]);
      expect(nextIndex).toBe(2);
    },
  );

  // 'MI' is the UI token; the column stores the word in full.
  it('translates MI to the MINORITY subquota', () => {
    const { condition, values } = buildCategoryCondition('MI', false, 1);
    expect(condition).toBe('co.subquota = $1');
    expect(values).toEqual(['MINORITY']);
  });

  it.each([
    ['PWD_OBC', 'PWD', 'OBC'],
    ['DEF_SC', 'DEF', 'SC'],
    ['PWD_NT3', 'PWD', 'NT3'],
    ['DEF_OPEN', 'DEF', 'OPEN'],
  ])('splits %s into subquota + social category', (token, sub, social) => {
    const { condition, values, nextIndex } = buildCategoryCondition(token, false, 1);

    expect(condition).toBe('(co.subquota = $1 AND co.category = $2)');
    expect(values).toEqual([sub, social]);
    expect(nextIndex).toBe(3);
  });

  it('ORs TFWS alongside the chosen category when include_tfws is set', () => {
    const { condition, values, nextIndex } = buildCategoryCondition('OPEN', true, 1);

    expect(condition).toBe('((co.category = $1 AND co.subquota IS NULL) OR co.subquota = $2)');
    expect(values).toEqual(['OPEN', 'TFWS']);
    expect(nextIndex).toBe(3);
  });

  // Otherwise the clause would be `subquota = 'TFWS' OR subquota = 'TFWS'`.
  it('does not OR TFWS onto itself', () => {
    const { condition, values } = buildCategoryCondition('TFWS', true, 1);
    expect(condition).toBe('co.subquota = $1');
    expect(values).toEqual(['TFWS']);
  });

  it('returns an empty condition for no category or an unknown token', () => {
    expect(buildCategoryCondition(undefined, false, 1).condition).toBe('');
    expect(buildCategoryCondition('NOT_A_CATEGORY', false, 1).condition).toBe('');
  });

  it('honours the starting placeholder index so callers can compose', () => {
    const { condition, nextIndex } = buildCategoryCondition('PWD_SC', false, 7);
    expect(condition).toBe('(co.subquota = $7 AND co.category = $8)');
    expect(nextIndex).toBe(9);
  });

  it('respects a custom table alias', () => {
    expect(buildCategoryCondition('OPEN', false, 1, 'x').condition).toBe(
      '(x.category = $1 AND x.subquota IS NULL)',
    );
  });
});

describe('buildGenderCondition', () => {
  // Ladies-only seats are gender 'L'; NULL-gender rows are quota seats that a
  // male candidate is still eligible for, hence IS DISTINCT FROM rather than <>.
  it.each(['male', 'Male', 'MALE', 'all'])(
    'excludes ladies-only seats for %s',
    (gender) => {
      const { condition, values, nextIndex } = buildGenderCondition(gender, 5);
      expect(condition).toBe("co.gender IS DISTINCT FROM 'L'");
      expect(values).toEqual([]);
      // Consumes no placeholder — a caller that assumed otherwise would
      // desynchronise every parameter after it.
      expect(nextIndex).toBe(5);
    },
  );

  it.each(['female', 'Female', undefined])(
    'applies no restriction for %s',
    (gender) => {
      expect(buildGenderCondition(gender, 1).condition).toBe('');
    },
  );
});

describe('buildCollegeMinorityCondition', () => {
  it('matches on minority type', () => {
    const { condition, values, nextIndex } = buildCollegeMinorityCondition(
      ['linguistic'],
      undefined,
      1,
    );

    expect(condition).toBe('(LOWER(col.minority_type) = ANY($1::text[]))');
    expect(values).toEqual([['linguistic']]);
    expect(nextIndex).toBe(2);
  });

  it('drops unknown minority types rather than querying for them', () => {
    expect(
      buildCollegeMinorityCondition(['klingon'], undefined, 1).condition,
    ).toBe('');
  });

  // The stored value is free text ("Religious Minority - Roman Catholic"), so a
  // group is matched through its aliases with LIKE.
  it('expands a group into one LIKE per alias', () => {
    const { condition, values } = buildCollegeMinorityCondition(
      undefined,
      ['roman_catholics'],
      1,
    );

    // Doubly wrapped: the group's own alias-OR, inside the clause-level OR.
    expect(condition).toBe(
      '((LOWER(col.minority_group) LIKE $1 OR LOWER(col.minority_group) LIKE $2))',
    );
    expect(values).toEqual(['%roman catholics%', '%roman catholic%']);
  });

  it('ORs types and groups together, and keeps placeholders sequential', () => {
    const { condition, values, nextIndex } = buildCollegeMinorityCondition(
      ['religious'],
      ['jain'],
      1,
    );

    expect(condition).toBe(
      '(LOWER(col.minority_type) = ANY($1::text[]) OR (LOWER(col.minority_group) LIKE $2))',
    );
    expect(values).toHaveLength(2);
    expect(nextIndex).toBe(3);
  });

  it('returns an empty condition when nothing is selected', () => {
    expect(buildCollegeMinorityCondition(undefined, undefined, 1).condition).toBe('');
    expect(buildCollegeMinorityCondition([], [], 1).condition).toBe('');
  });
});

/**
 * The invariant every caller relies on: the number of placeholders a builder
 * emits must equal the number of values it pushes, and nextIndex must advance
 * by exactly that many. A mismatch shifts every subsequent parameter in the
 * query — which is silent until it produces wrong rows.
 */
describe('placeholder/value invariant', () => {
  const cases: Array<[string, () => { condition: string; values: unknown[]; nextIndex: number }]> = [
    ['social category', () => buildCategoryCondition('OBC', false, 1)],
    ['social + tfws', () => buildCategoryCondition('OBC', true, 1)],
    ['subquota category', () => buildCategoryCondition('EWS', false, 1)],
    ['pwd category', () => buildCategoryCondition('PWD_ST', false, 1)],
    ['pwd + tfws', () => buildCategoryCondition('PWD_ST', true, 1)],
    ['gender male', () => buildGenderCondition('male', 1)],
    ['minority type', () => buildCollegeMinorityCondition(['religious'], undefined, 1)],
    ['minority group', () => buildCollegeMinorityCondition(undefined, ['roman_catholics'], 1)],
    ['both minority', () => buildCollegeMinorityCondition(['religious'], ['muslim'], 1)],
  ];

  it.each(cases)('%s emits one placeholder per value', (_name, build) => {
    const { condition, values, nextIndex } = build();
    const placeholders = [...condition.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    const unique = new Set(placeholders);

    expect(unique.size).toBe(values.length);
    expect(nextIndex).toBe(1 + values.length);
    // Sequential from the start index, no gaps.
    for (let i = 1; i <= values.length; i += 1) {
      expect(unique.has(i)).toBe(true);
    }
  });
});
