import * as fs from 'fs';
import * as path from 'path';
import pool from './database';
import logger from '../utils/logger';

/**
 * Arbitrary but fixed key for the advisory lock guarding a migration run.
 * Any value works as long as nothing else in the database uses the same one;
 * it is derived from this file's purpose (migrations) plus the year, purely so
 * it is recognisable in pg_locks when debugging.
 */
const MIGRATION_LOCK_KEY = 4012025;

/**
 * Runs all pending SQL migration files from the migrations/ directory in
 * alphabetical order. Each applied migration is recorded in the
 * schema_migrations table so it is never run twice.
 *
 * Two properties matter here, both of which the previous implementation
 * lacked:
 *
 *  1. MUTUAL EXCLUSION. Migrations run inside startServer(), so an overlapping
 *     deploy or a second instance would previously run them concurrently
 *     against the same database. A session-level advisory lock serialises the
 *     whole run; the second process simply waits, then finds every migration
 *     already recorded and does nothing.
 *
 *  2. ATOMICITY WITH THE BOOKKEEPING. Applying a file and recording it were
 *     two separate statements, so a crash in between (OOM, deploy timeout,
 *     SIGTERM) re-ran the migration on the next boot. That was survivable only
 *     because every file happens to be written idempotently — a convention,
 *     not a guarantee, and one that breaks the first time someone writes a
 *     plain `ALTER TABLE ... ADD COLUMN`. Each file's DDL and its
 *     schema_migrations insert now commit together or not at all.
 *
 * Both require every statement to run on ONE connection, so this takes a
 * dedicated client from the pool rather than using the shared query() helper.
 * That also means the connection must be in session mode — true for a direct
 * connection and for Supabase's pooler on :5432. A transaction-mode pooler
 * (:6543) can reassign the connection between statements and would break the
 * session-level lock; migrations should use a direct connection there, which
 * is Supabase's own guidance for schema changes.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.info('No migrations directory found, skipping migrations');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    // Lock FIRST, then create the bookkeeping table. Creating it outside the
    // lock left the one statement that runs on every boot unprotected, which
    // defeats the point: `CREATE TABLE IF NOT EXISTS` is not race-safe in
    // Postgres, and two instances executing it concurrently can fail with
    // `duplicate key value violates unique constraint
    // "pg_type_typname_nsp_index"`. That throws out of runMigrations() and
    // drops the server into degraded mode — precisely the overlapping-deploy
    // scenario this lock exists to make safe.
    //
    // The lock is a plain advisory integer and needs no table to exist first.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename TEXT UNIQUE NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      for (const file of files) {
        const { rows } = await client.query(
          'SELECT id FROM schema_migrations WHERE filename = $1',
          [file],
        );
        if (rows.length > 0) {
          continue;
        }

        logger.info(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file],
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {
            // A failed ROLLBACK means the connection is already unusable;
            // surface the original migration error, not this one.
          });
          throw error;
        }

        logger.info(`Migration ${file} applied successfully`);
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [
        MIGRATION_LOCK_KEY,
      ]).catch((error) => {
        // Releasing is best-effort: the lock is session-scoped, so it is
        // dropped anyway when this client's session ends.
        logger.warn('[migrations] advisory unlock failed', error);
      });
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      logger.info('All migrations completed successfully');
    })
    .catch(async (error) => {
      logger.error('Migration run failed', error);
      await pool.end();
      process.exit(1);
    });
}
