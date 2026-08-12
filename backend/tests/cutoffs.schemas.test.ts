import { describe, expect, it } from 'vitest';
import {
  cutoffsQuerySchema,
  cutoffsMetaQuerySchema,
} from '../src/modules/cutoffs/cutoffs.schemas';

/**
 * Pure schema tests — no server, no DB, no mocks.
 *
 * These pin the contract that used to be absent entirely: GET params were cast
 * (`req.query.category as string | undefined`) rather than validated, so a
 * repeated key produced an array and threw a TypeError deep inside the SQL
 * builders. Every case below is a shape Express can actually produce from a
 * real query string.
 */
describe('cutoffsQuerySchema', () => {
  describe('repeated keys on single-valued params', () => {
    // `?category=OPEN&category=SC` — used to reach buildCategoryCondition as an
    // array and throw "cat.startsWith is not a function" => HTTP 500.
    it('rejects a repeated category by name instead of throwing', () => {
      const result = cutoffsQuerySchema.safeParse({ category: ['OPEN', 'SC'] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(
          /category may only be specified once/i,
        );
      }
    });

    // `?gender=male&gender=female` — used to throw "gender?.trim is not a
    // function" in buildGenderCondition => HTTP 500.
    it('rejects a repeated gender', () => {
      expect(
        cutoffsQuerySchema.safeParse({ gender: ['male', 'female'] }).success,
      ).toBe(false);
    });

    // These two never threw — they silently built a malformed predicate
    // (`ILIKE '%a,b%'`, or an array bound to a scalar `=` comparison) and
    // returned confidently wrong cutoffs, which is the worse failure mode.
    it('rejects a repeated college_name rather than searching for "a,b"', () => {
      expect(
        cutoffsQuerySchema.safeParse({ college_name: ['coep', 'vjti'] }).success,
      ).toBe(false);
    });

    it('rejects a repeated college_code', () => {
      expect(
        cutoffsQuerySchema.safeParse({ college_code: ['03012', '16006'] })
          .success,
      ).toBe(false);
    });
  });

  describe('repeatable filters', () => {
    it('accepts both the single and repeated forms', () => {
      expect(cutoffsQuerySchema.parse({ branch: ['CE', 'IT'] }).branch).toEqual([
        'CE',
        'IT',
      ]);
      expect(cutoffsQuerySchema.parse({ branch: 'CE' }).branch).toEqual(['CE']);
    });

    // undefined, not [] — every repository builder tests
    // `filters.xs && filters.xs.length > 0`, and an empty array would add a
    // no-op `= ANY('{}')` that matches nothing.
    it('yields undefined rather than an empty array when absent', () => {
      const parsed = cutoffsQuerySchema.parse({});
      expect(parsed.branch).toBeUndefined();
      expect(parsed.city).toBeUndefined();
      expect(parsed.minority_type).toBeUndefined();
    });

    it('rejects more values than MAX_FILTER_ARRAY_LENGTH', () => {
      const tooMany = Array.from({ length: 200 }, (_, i) => `b${i}`);
      expect(cutoffsQuerySchema.safeParse({ branch: tooMany }).success).toBe(
        false,
      );
    });

    it('rejects an unknown minority_type or minority_group', () => {
      expect(
        cutoffsQuerySchema.safeParse({ minority_type: ['linguistic'] }).success,
      ).toBe(true);
      expect(
        cutoffsQuerySchema.safeParse({ minority_type: ['bogus'] }).success,
      ).toBe(false);
      expect(
        cutoffsQuerySchema.safeParse({ minority_group: ['roman_catholics'] })
          .success,
      ).toBe(true);
      expect(
        cutoffsQuerySchema.safeParse({ minority_group: ['klingon'] }).success,
      ).toBe(false);
    });
  });

  describe('normalization', () => {
    // The dropdown sends "Male"; buildGenderCondition lowercases before
    // comparing. Normalizing here keeps those two ends agreed.
    it('lower-cases gender so the dropdown values keep working', () => {
      expect(cutoffsQuerySchema.parse({ gender: 'Male' }).gender).toBe('male');
      expect(cutoffsQuerySchema.parse({ gender: 'Female' }).gender).toBe(
        'female',
      );
    });

    // Bounds the Redis cache key built by stableStringify() and collapses
    // casing variants onto one entry. ILIKE makes it a no-op for results.
    it('lower-cases college_name so VJTI and vjti share a cache key', () => {
      expect(cutoffsQuerySchema.parse({ college_name: 'VJTI' }).college_name).toBe(
        'vjti',
      );
    });

    it('rejects an over-long college_name', () => {
      expect(
        cutoffsQuerySchema.safeParse({ college_name: 'x'.repeat(500) }).success,
      ).toBe(false);
    });

    it('coerces round and rejects junk or out-of-range values', () => {
      expect(cutoffsQuerySchema.parse({ round: '3' }).round).toBe(3);
      expect(cutoffsQuerySchema.safeParse({ round: 'abc' }).success).toBe(false);
      expect(cutoffsQuerySchema.safeParse({ round: '9' }).success).toBe(false);
    });

    // Deliberately permissive, matching the previous
    // `=== 'true' || === '1'` check exactly, so no existing link can break.
    it('treats include_tfws exactly as the old inline check did', () => {
      expect(cutoffsQuerySchema.parse({ include_tfws: 'true' }).include_tfws).toBe(true);
      expect(cutoffsQuerySchema.parse({ include_tfws: '1' }).include_tfws).toBe(true);
      expect(cutoffsQuerySchema.parse({ include_tfws: 'yes' }).include_tfws).toBe(false);
      expect(cutoffsQuerySchema.parse({}).include_tfws).toBe(false);
    });
  });

  describe('category enum', () => {
    it('accepts every code the frontend dropdown can send', () => {
      for (const category of ['OPEN', 'SC', 'EWS', 'TFWS', 'PWD_OBC', 'DEF_NT3']) {
        expect(cutoffsQuerySchema.safeParse({ category }).success).toBe(true);
      }
    });

    // Previously an unrecognised token made buildCategoryCondition return an
    // empty condition, so the request silently returned UNFILTERED results.
    it('rejects an unknown category instead of returning unfiltered rows', () => {
      expect(
        cutoffsQuerySchema.safeParse({ category: 'NOT_A_CATEGORY' }).success,
      ).toBe(false);
    });
  });

  // Not .strict() on purpose: utm_*, cache-busters and anything a future
  // edge-proxy hop appends must be stripped, never rejected.
  it('strips unknown params rather than rejecting them', () => {
    const result = cutoffsQuerySchema.safeParse({
      utm_source: 'x',
      _cb: '12345',
    });
    expect(result.success).toBe(true);
    expect(result.success && 'utm_source' in result.data).toBe(false);
  });
});

describe('cutoffsMetaQuerySchema', () => {
  it('trims and drops empty city values', () => {
    expect(cutoffsMetaQuerySchema.parse({ city: ['  Pune  '] }).city).toEqual([
      'Pune',
    ]);
    expect(cutoffsMetaQuerySchema.safeParse({ city: ['  '] }).success).toBe(false);
  });

  it('rejects a malformed college_code', () => {
    expect(cutoffsMetaQuerySchema.parse({ college_code: '03012' }).college_code).toBe(
      '03012',
    );
    expect(
      cutoffsMetaQuerySchema.safeParse({ college_code: '../../etc/passwd' })
        .success,
    ).toBe(false);
  });
});
