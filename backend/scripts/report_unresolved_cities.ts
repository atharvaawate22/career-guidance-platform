import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { CITY_NORMALIZED_SQL } from '../src/utils/cityNormalization';

dotenv.config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'career_guidance',
      password: String(process.env.DB_PASSWORD || ''),
      port: 5432,
    });

function toCsvLine(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => {
      const text = value == null ? '' : String(value);
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

async function run(): Promise<void> {
  const totalResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM cutoff_data
      WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
    `,
  );

  const recomputableResult = await pool.query(
    `
      SELECT COUNT(*)::int AS recomputable
      FROM cutoff_data
      WHERE (city_normalized IS NULL OR TRIM(city_normalized) = '')
        AND NULLIF(TRIM(LOWER(${CITY_NORMALIZED_SQL})), '') IS NOT NULL
    `,
  );

  const unresolvedByHintResult = await pool.query(
    `
      WITH unresolved AS (
        SELECT
          id,
          year,
          college_code,
          college_name,
          branch,
          category,
          stage,
          level,
          TRIM(
            BOTH ' .,'
            FROM REGEXP_REPLACE(college_name, '^.*,\\s*', '')
          ) AS locality_hint
        FROM cutoff_data
        WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
      )
      SELECT
        CASE
          WHEN locality_hint IS NULL OR locality_hint = '' THEN '(empty)'
          ELSE LOWER(locality_hint)
        END AS hint,
        COUNT(*)::int AS rows
      FROM unresolved
      GROUP BY 1
      ORDER BY rows DESC, hint ASC
      LIMIT 80
    `,
  );

  const sampleRowsResult = await pool.query(
    `
      SELECT
        id,
        year,
        college_code,
        college_name,
        branch,
        category,
        stage,
        level,
        TRIM(
          BOTH ' .,'
          FROM REGEXP_REPLACE(college_name, '^.*,\\s*', '')
        ) AS locality_hint,
        LOWER(${CITY_NORMALIZED_SQL}) AS computed_city
      FROM cutoff_data
      WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
      ORDER BY year DESC, college_name ASC, branch ASC
      LIMIT 250
    `,
  );

  const reportDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const summaryPath = path.join(reportDir, 'unresolved_city_summary.json');
  const hintsCsvPath = path.join(reportDir, 'unresolved_city_hints_top.csv');
  const samplesCsvPath = path.join(reportDir, 'unresolved_city_samples.csv');

  const summary = {
    generatedAt: new Date().toISOString(),
    totalUnresolvedRows: totalResult.rows[0]?.total ?? 0,
    recomputableRows: recomputableResult.rows[0]?.recomputable ?? 0,
    nonRecomputableRows:
      (totalResult.rows[0]?.total ?? 0) -
      (recomputableResult.rows[0]?.recomputable ?? 0),
  };

  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const hintsCsvLines = [toCsvLine(['hint', 'rows'])];
  for (const row of unresolvedByHintResult.rows) {
    hintsCsvLines.push(toCsvLine([row.hint, row.rows]));
  }
  fs.writeFileSync(hintsCsvPath, `${hintsCsvLines.join('\n')}\n`, 'utf8');

  const sampleCsvLines = [
    toCsvLine([
      'id',
      'year',
      'college_code',
      'college_name',
      'branch',
      'category',
      'stage',
      'level',
      'locality_hint',
      'computed_city',
    ]),
  ];

  for (const row of sampleRowsResult.rows) {
    sampleCsvLines.push(
      toCsvLine([
        row.id,
        row.year,
        row.college_code,
        row.college_name,
        row.branch,
        row.category,
        row.stage,
        row.level,
        row.locality_hint,
        row.computed_city,
      ]),
    );
  }

  fs.writeFileSync(samplesCsvPath, `${sampleCsvLines.join('\n')}\n`, 'utf8');

  console.log('[unresolved-city-report] summary:', summary);
  console.log('[unresolved-city-report] wrote', summaryPath);
  console.log('[unresolved-city-report] wrote', hintsCsvPath);
  console.log('[unresolved-city-report] wrote', samplesCsvPath);
}

run()
  .catch((error) => {
    console.error('[unresolved-city-report] failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
