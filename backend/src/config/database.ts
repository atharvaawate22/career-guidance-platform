import { Pool, QueryResult, types } from 'pg';
import logger from '../utils/logger';

// node-pg's default DATE (OID 1082) parser builds `new Date(year, month, day)`
// from the local process timezone, then JSON serialization renders it as a
// UTC instant — so a stored '2026-09-15' round-trips as
// "2026-09-14T18:30:00.000Z" on an IST host but stays "2026-09-15T00:00:00.000Z"
// on a UTC host. Every DATE column in this schema (today: cap_schedule, which
// the chatbot renders straight into a reply) is already treated as a plain
// 'YYYY-MM-DD' string throughout the app (types, zod schemas, JSON responses),
// so disable the Date conversion and return the raw string Postgres sends.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

interface QueryOptions {
  /**
   * A human-readable label used ONLY in slow-query and error log output.
   * Do NOT pass this to pg's named prepared-statement feature — dynamic
   * WHERE clauses cannot share a statement plan safely across filter combinations.
   */
  name?: string;
}

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.DB_SLOW_QUERY_MS || '250');

const resolveSslRejectUnauthorized = (): boolean => {
  const configured =
    process.env.DB_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
  if (configured === 'false' || configured === '0' || configured === 'no') {
    return false;
  }

  if (configured === 'true' || configured === '1' || configured === 'yes') {
    return true;
  }

  return true;
};

const compactSql = (text: string): string =>
  text.replace(/\s+/g, ' ').trim().slice(0, 240);

// Default tuned for a single small instance (e.g. Render free, 0.1 CPU) talking
// to a connection-limited managed Postgres (e.g. Supabase free) — ideally via
// its transaction pooler. A large pool here gains nothing on one low-CPU
// process and risks exhausting the database's connection allowance. Override
// with DB_POOL_MAX when running on a bigger instance / dedicated Postgres.
const POOL_MAX = Number(process.env.DB_POOL_MAX || '5');
const POOL_IDLE_TIMEOUT_MS = Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000');
const POOL_CONNECTION_TIMEOUT_MS = Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000');
const STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS || '10000');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: resolveSslRejectUnauthorized() },
      max: POOL_MAX,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
      statement_timeout: STATEMENT_TIMEOUT_MS,
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'career_guidance',
      password: String(process.env.DB_PASSWORD || ''),
      port: 5432,
      max: POOL_MAX,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
      statement_timeout: STATEMENT_TIMEOUT_MS,
    });

export const query = async (
  text: string,
  params?: unknown[],
  options?: QueryOptions,
): Promise<QueryResult> => {
  const start = process.hrtime.bigint();
  try {
    const result = await pool.query(text, params);

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow database query detected', {
        queryName: options?.name || 'unnamed',
        durationMs: Number(durationMs.toFixed(2)),
        rowCount: result.rowCount,
        sql: compactSql(text),
      });
    }

    return result;
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.error('Database query error', {
      queryName: options?.name || 'unnamed',
      durationMs: Number(durationMs.toFixed(2)),
      sql: compactSql(text),
      error,
    });
    throw error;
  }
};

export const testConnection = async (): Promise<void> => {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
};

export default pool;
