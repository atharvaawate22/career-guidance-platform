/**
 * City-normalization data-integrity guard.
 *
 * `colleges.city_normalized` is meant to be the DISTRICT a college sits in
 * (used for the city/district filter and for grouping in the explorer and
 * predictor), while `colleges.city` is the raw display town — see
 * docs/DATABASE_SCHEMA.md and docs/CUTOFFS_DB_REDESIGN.md. This script is the
 * guard that was documented as "Completed"/wired into CI in
 * docs/EXECUTION_CLOSURE_REPORT_2026-03-30.md but never actually existed —
 * see the stale-claim notes at the top of that file and in
 * docs/PRODUCTION_AUDIT.md and docs/deployment.md. This closes that gap.
 *
 * IMPORTANT CONTEXT this script's existence should not paper over: nothing in
 * this repository currently computes a real town->district mapping.
 * backend/scripts/load_cutoffs.js, load_cutoffs_incremental.js and
 * load_ai_cutoffs_additive.js all set `city_normalized` as a plain
 * `city.trim().toLowerCase()` -- e.g. "Warora" becomes "warora", not
 * "chandrapur", the district Warora actually sits in. The correct
 * district-level values seen in production today were arrived at OUTSIDE this
 * repo (a manual data pass, at some point, against the live database) and are
 * not reproducible by re-running the loaders. So this script cannot verify
 * "did the code normalize correctly" -- there is no such code. What it CAN do,
 * and does, is verify that the DATA IN PRODUCTION today still resolves to a
 * real district, so a future load (a new admission cycle, an additive
 * incremental load) that reverts to the loaders' plain lower-case behaviour is
 * caught immediately instead of silently degrading the city filter one row at
 * a time.
 *
 * Read-only. Never mutates colleges or any other table.
 *
 * Run from backend/:  npm run check:city-normalization
 * CI: .github/workflows/ci.yml, gated on the DATABASE_URL secret being
 *     configured -- this checks the live database, not a fixture, so it can
 *     only run where that secret exists.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Pool } from 'pg';

/**
 * Maharashtra's 36 official revenue districts (post the 2014 Thane/Palghar
 * split), lower-cased to match how `city_normalized` is stored, PLUS one
 * deliberate grouping exception.
 *
 * Two things a future maintainer should NOT "fix":
 *
 * 1. Aurangabad and Osmanabad were officially renamed to Chhatrapati
 *    Sambhajinagar and Dharashiv in 2023. The data in this database still
 *    uses the pre-rename names throughout (city, city_normalized, and the
 *    frontend's city dropdown all say "Aurangabad"/"Osmanabad"), so the old
 *    names are the canonical values HERE -- renaming them in this list alone
 *    would make every Aurangabad/Osmanabad college fail this check without
 *    changing a single row of actual data.
 *
 * 2. "navi mumbai" is not an official revenue district -- administratively
 *    Navi Mumbai spans parts of Thane and Raigad. It is listed here anyway
 *    because the loaders' city_normalized already buckets it separately (13
 *    colleges as of writing), and collapsing it into "thane"/"raigad" would
 *    be a real, visible change to the city filter, not a data-integrity fix.
 *    If Navi Mumbai colleges should file under Thane/Raigad instead, that is
 *    a product decision to make deliberately, not a side effect of this
 *    guard.
 */
const MAHARASHTRA_DISTRICTS: ReadonlySet<string> = new Set([
  'ahmednagar',
  'akola',
  'amravati',
  'aurangabad', // official: Chhatrapati Sambhajinagar — see note above
  'beed',
  'bhandara',
  'buldhana',
  'chandrapur',
  'dhule',
  'gadchiroli',
  'gondia',
  'hingoli',
  'jalgaon',
  'jalna',
  'kolhapur',
  'latur',
  'mumbai',
  'nagpur',
  'nanded',
  'nandurbar',
  'nashik',
  'osmanabad', // official: Dharashiv — see note above
  'palghar',
  'parbhani',
  'pune',
  'raigad',
  'ratnagiri',
  'sangli',
  'satara',
  'sindhudurg',
  'solapur',
  'thane',
  'wardha',
  'washim',
  'yavatmal',
  // Deliberate grouping exception, not an official district — see note above.
  'navi mumbai',
]);

interface CityGroupRow {
  city_normalized: string | null;
  city: string | null;
  colleges: number;
  college_codes: string[];
}

function formatValue(value: string | null): string {
  return value === null ? 'NULL' : JSON.stringify(value);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL must be set (backend/.env, or the environment) to run this check.',
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query<CityGroupRow>(`
      SELECT
        city_normalized,
        city,
        count(*)::int AS colleges,
        array_agg(college_code ORDER BY college_code) AS college_codes
      FROM colleges
      GROUP BY city_normalized, city
      ORDER BY city_normalized NULLS FIRST, city NULLS FIRST
    `);

    const totalColleges = rows.reduce((sum, r) => sum + r.colleges, 0);
    const unresolved = rows.filter(
      (r) => r.city_normalized === null || !MAHARASHTRA_DISTRICTS.has(r.city_normalized),
    );

    console.log(
      `Checked ${totalColleges} college(s) across ${rows.length} distinct (city_normalized, city) pair(s).`,
    );

    if (unresolved.length === 0) {
      console.log('PASS: unresolved city rows = 0.');
      return;
    }

    const unresolvedColleges = unresolved.reduce((sum, r) => sum + r.colleges, 0);
    console.error(
      `\nFAIL: ${unresolvedColleges} college(s) across ${unresolved.length} ` +
        `(city_normalized, city) pair(s) do not resolve to a known Maharashtra district.\n`,
    );

    for (const r of unresolved) {
      const codes = r.college_codes.slice(0, 5).join(', ');
      const overflow = r.college_codes.length > 5 ? `, … (+${r.college_codes.length - 5} more)` : '';
      console.error(
        `  city_normalized=${formatValue(r.city_normalized)}  city=${formatValue(r.city)}  ` +
          `colleges=${r.colleges}  college_code(s)=${codes}${overflow}`,
      );
    }

    console.error(
      '\nEach row above needs one of:\n' +
        '  - a corrected `city` value at the source (e.g. a college name leaked\n' +
        '    into the city column during parsing), then a reload; or\n' +
        '  - a corrected `city_normalized` value, if the town genuinely maps to a\n' +
        '    real district that is missing from MAHARASHTRA_DISTRICTS in this\n' +
        '    script (unlikely — the list covers all 36); or\n' +
        '  - adding the value to MAHARASHTRA_DISTRICTS here, WITH A COMMENT\n' +
        '    explaining why, if it is a deliberate grouping exception like\n' +
        '    "navi mumbai" above.\n',
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    'CITY NORMALIZATION GUARD FAILED TO RUN:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
