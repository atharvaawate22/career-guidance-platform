import dotenv from 'dotenv';
import { Pool } from 'pg';

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

async function run(): Promise<void> {
  const unresolvedResult = await pool.query(
    `
      SELECT COUNT(*)::int AS unresolved
      FROM cutoff_data
      WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
    `,
  );

  const unresolved = unresolvedResult.rows[0]?.unresolved ?? 0;

  if (unresolved === 0) {
    console.log('[city-normalization-check] pass: unresolved=0');
    return;
  }

  const topOffenders = await pool.query(
    `
      SELECT
        COALESCE(college_code, '(null)') AS college_code,
        college_name,
        COUNT(*)::int AS rows
      FROM cutoff_data
      WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
      GROUP BY 1, 2
      ORDER BY rows DESC, college_name ASC
      LIMIT 10
    `,
  );

  console.error(
    `[city-normalization-check] fail: unresolved city_normalized rows = ${unresolved}`,
  );
  console.error('[city-normalization-check] top unresolved institutions:');
  for (const row of topOffenders.rows) {
    console.error(
      `  - code=${row.college_code} | rows=${row.rows} | ${row.college_name}`,
    );
  }

  process.exitCode = 1;
}

run()
  .catch((error) => {
    console.error('[city-normalization-check] failed to run', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
