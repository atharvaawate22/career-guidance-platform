import * as fs from 'fs';
import * as path from 'path';
import { query } from './database';
import logger from '../utils/logger';

/**
 * Runs all pending SQL migration files from the migrations/ directory in
 * alphabetical order. Each applied migration is recorded in the
 * schema_migrations table so it is never run twice.
 */
export async function runMigrations(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.info('No migrations directory found, skipping migrations');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await query(
      'SELECT id FROM schema_migrations WHERE filename = $1',
      [file],
    );

    if (rows.length > 0) {
      continue;
    }

    logger.info(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await query(sql);
    await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    logger.info(`Migration ${file} applied successfully`);
  }
}
