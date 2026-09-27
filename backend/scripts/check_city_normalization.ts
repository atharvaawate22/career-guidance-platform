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
 * Context: the district mapping itself lives in scripts/lib/cityNormalization.js,
 * shared by all three loaders (load_cutoffs.js, load_cutoffs_incremental.js,
 * load_ai_cutoffs_additive.js). Until 2026-09-27 the loaders wrote a plain
 * `city.trim().toLowerCase()` (so "Warora" became "warora", not "chandrapur"),
 * and the correct district values in production came from a manual data pass
 * that re-running a loader could not reproduce. The resolver now reproduces
 * them: tested against all 390 colleges as if each were new, it places 337
 * correctly, places none wrongly, and leaves 53 NULL (no usable location in
 * the name, or conflicting signals) with a loud warning at load time.
 *
 * Those NULLs are exactly what this guard exists for. It verifies the DATA in
 * the database, not the code: every `city_normalized` must be a district from
 * the same shared list the loaders use, so a load that could not place a new
 * college fails CI here instead of silently degrading the city filter.
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

// The district list is shared with the loaders so the two can never drift
// apart; see scripts/lib/cityNormalization.js for the list and for why
// aurangabad/osmanabad and "navi mumbai" are deliberate.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MAHARASHTRA_DISTRICTS } = require('./lib/cityNormalization') as {
  MAHARASHTRA_DISTRICTS: ReadonlySet<string>;
};

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
        '  - the town added to TOWN_TO_DISTRICT in scripts/lib/cityNormalization.js,\n' +
        '    then a reload (so future loads place it too); or\n' +
        '  - colleges.city_normalized set directly to the district, for a one-off\n' +
        '    (e.g. a college name with no location in it); or\n' +
        '  - the value added to MAHARASHTRA_DISTRICTS in that same file, WITH A\n' +
        '    COMMENT explaining why, only if it is a deliberate grouping exception\n' +
        '    like "navi mumbai".\n',
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
