import dotenv from 'dotenv';
import { Pool } from 'pg';
import { CITY_NORMALIZED_SQL } from '../src/utils/cityNormalization';

dotenv.config();

const BATCH_SIZE = Number(process.env.CITY_BACKFILL_BATCH_SIZE || '5000');
const sslRejectUnauthorized =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: sslRejectUnauthorized },
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'career_guidance',
      password: String(process.env.DB_PASSWORD || ''),
      port: 5432,
    });

async function run(): Promise<void> {
  let totalUpdated = 0;
  let loops = 0;

  while (true) {
    loops += 1;
    const result = await pool.query(`
      WITH city_backfill_batch AS (
        SELECT
          ctid,
          LOWER(TRIM(${CITY_NORMALIZED_SQL})) AS computed_city
        FROM cutoff_data
        WHERE city_normalized IS NULL
           OR TRIM(city_normalized) = ''
        LIMIT ${BATCH_SIZE}
      )
      UPDATE cutoff_data AS cutoff
      SET city_normalized = city_backfill_batch.computed_city
      FROM city_backfill_batch
      WHERE cutoff.ctid = city_backfill_batch.ctid
        AND COALESCE(NULLIF(TRIM(cutoff.city_normalized), ''), '__missing__')
          IS DISTINCT FROM COALESCE(NULLIF(TRIM(city_backfill_batch.computed_city), ''), '__missing__')
    `);

    const updated = result.rowCount ?? 0;
    totalUpdated += updated;
    console.log(`[city-backfill] batch ${loops}: updated ${updated}`);

    if (updated === 0) break;
  }

  const remaining = await pool.query(`
    SELECT COUNT(*)::int AS missing
    FROM cutoff_data
    WHERE city_normalized IS NULL OR TRIM(city_normalized) = ''
  `);

  console.log(
    `[city-backfill] done: totalUpdated=${totalUpdated}, remaining=${remaining.rows[0]?.missing ?? 0}`,
  );
}

run().catch((error) => {
  console.error('[city-backfill] failed', error);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
