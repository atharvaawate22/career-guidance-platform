import { z } from 'zod';
import { MAX_FILTER_ARRAY_LENGTH } from '../../config/constants';
import {
  VALID_PREDICTOR_CATEGORIES,
  VALID_PREDICTOR_GENDERS,
} from '../predictor/predictor.schemas';
import { getMinorityGroupDefinitions } from '../../utils/minorityStatus';

/**
 * Query schemas for the public cutoffs endpoints.
 *
 * These exist because GET params used to be cast straight through
 * (`req.query.category as string | undefined`) while every POST body was
 * validated with Zod. Express yields a string[] when a key repeats, so
 * `?category=OPEN&category=SC` reached buildCategoryCondition as an array and
 * threw `cat.startsWith is not a function` — a 500 on the busiest public
 * endpoint. The quieter half was worse: `?college_name=a&college_name=b`
 * didn't throw, it built `ILIKE '%a,b%'` and confidently returned the wrong
 * cutoffs.
 *
 * Express 5's default query parser is "simple" (node's querystring.parse), so
 * bracket syntax (`?k[]=v`) is NOT parsed into an array — only repeated keys
 * are. Every param below therefore declares which of string / string[] it
 * tolerates.
 *
 * Value sets are imported, never redeclared — the predictor's category and
 * gender enums and the minority definitions are already the single source of
 * truth and are what the frontend dropdowns are built from.
 */

/**
 * A param the API treats as single-valued. Repeating it is rejected by name
 * rather than silently taking the first or last occurrence, because either
 * choice would answer a question the caller didn't ask.
 */
const singleValued = (label: string) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .refine((value) => !Array.isArray(value), {
      message: `${label} may only be specified once.`,
    })
    .transform((value) =>
      typeof value === 'string' ? value.trim() || undefined : undefined,
    );

/**
 * A repeated-key filter: accepts both `?k=a` and `?k=a&k=b`, always yields an
 * array. Returns `undefined` rather than `[]` when empty, because every
 * repository builder tests `filters.xs && filters.xs.length > 0` and an empty
 * array would add a no-op `= ANY('{}')` condition that matches nothing.
 */
const repeatable = (label: string, maxItemLength: number) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      value === undefined ? [] : Array.isArray(value) ? value : [value],
    )
    .pipe(
      z
        .array(
          z
            .string()
            .trim()
            .min(1, `A ${label} value cannot be empty.`)
            .max(maxItemLength, `A ${label} value is too long.`),
        )
        .max(
          MAX_FILTER_ARRAY_LENGTH,
          `At most ${MAX_FILTER_ARRAY_LENGTH} ${label} values are allowed.`,
        ),
    )
    .transform((value) => (value.length > 0 ? value : undefined));

const collegeCodeParam = (label: string) =>
  singleValued(label).pipe(
    z
      .string()
      .regex(/^[A-Za-z0-9]{1,10}$/, 'Invalid college code.')
      .optional(),
  );

/**
 * Accepted for URL back-compat only. The explorer, predictor and booking page
 * all append `year=`, but every handler answers for ACTIVE_CUTOFF_YEAR
 * regardless. Declared so the contract is visible rather than silently
 * stripped.
 */
const yearParam = singleValued('year').pipe(
  z.coerce.number().int().min(2000).max(2100).optional(),
);

/**
 * Derived from VALID_PREDICTOR_GENDERS rather than redeclared: the dropdown
 * sends 'Male'/'Female', and buildGenderCondition lowercases before comparing,
 * so accepting case-insensitively and normalizing here matches both ends
 * without a second copy of the list drifting from the first.
 */
const GENDER_VALUES = VALID_PREDICTOR_GENDERS.map((gender) =>
  gender.toLowerCase(),
) as [string, ...string[]];

const MINORITY_GROUP_KEYS = getMinorityGroupDefinitions().map(
  (definition) => definition.key,
) as [string, ...string[]];

const MINORITY_TYPES = ['linguistic', 'religious'] as const;

export const cutoffsQuerySchema = z.object({
  year: yearParam,

  round: singleValued('round').pipe(
    z.coerce
      .number()
      .int('round must be a whole number.')
      .min(1, 'round must be between 1 and 4.')
      .max(4, 'round must be between 1 and 4.')
      .optional(),
  ),

  category: singleValued('category').pipe(
    z
      .enum(VALID_PREDICTOR_CATEGORIES, {
        errorMap: () => ({
          message: 'Please select a valid admission category.',
        }),
      })
      .optional(),
  ),

  gender: singleValued('gender')
    .transform((value) => value?.toLowerCase())
    .pipe(
      z
        .enum(GENDER_VALUES, {
          errorMap: () => ({
            message: `gender must be one of: ${VALID_PREDICTOR_GENDERS.join(', ')}.`,
          }),
        })
        .optional(),
    ),

  /**
   * Deliberately permissive, matching the previous
   * `=== 'true' || === '1'` check exactly — anything else is false rather than
   * a 400, so no existing link can break on this.
   */
  include_tfws: singleValued('include_tfws').transform(
    (value) => value === 'true' || value === '1',
  ),

  college_code: collegeCodeParam('college_code'),

  /**
   * Bounded and lower-cased for two reasons. It reaches
   * `col.name ILIKE '%' || $n || '%'`, where casing is already irrelevant; and
   * it lands verbatim in the Redis key built by stableStringify() in
   * cutoffs.service.ts, so unbounded free text meant unbounded cache keys with
   * a 6h TTL — a cheap way to evict every legitimate hot entry. Lower-casing
   * additionally collapses VJTI/vjti/Vjti onto one entry.
   * 120 chars clears the longest real DTE college name with room to spare.
   */
  college_name: singleValued('college_name')
    .transform((value) => value?.toLowerCase())
    .pipe(z.string().max(120, 'college_name is too long.').optional()),

  branch: repeatable('branch', 150),
  city: repeatable('city', 100),

  minority_type: repeatable('minority_type', 50).pipe(
    z
      .array(
        z.enum(MINORITY_TYPES, {
          errorMap: () => ({
            message: `minority_type must be one of: ${MINORITY_TYPES.join(', ')}.`,
          }),
        }),
      )
      .optional(),
  ),

  minority_group: repeatable('minority_group', 50).pipe(
    z
      .array(
        z.enum(MINORITY_GROUP_KEYS, {
          errorMap: () => ({ message: 'Unknown minority group.' }),
        }),
      )
      .optional(),
  ),
});
// Deliberately NOT .strict(): unknown params (utm_*, cache-busters, anything a
// future edge-proxy hop appends) must be stripped silently, never 400.

export type CutoffsQuery = z.infer<typeof cutoffsQuerySchema>;

export const cutoffsMetaQuerySchema = z.object({
  year: yearParam,
  college_code: collegeCodeParam('college_code'),
  city: repeatable('city', 100),
});

export type CutoffsMetaQuery = z.infer<typeof cutoffsMetaQuerySchema>;
