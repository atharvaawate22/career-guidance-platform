import { Pool, QueryResult } from 'pg';
import logger from '../utils/logger';

interface QueryOptions {
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

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: resolveSslRejectUnauthorized() },
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'career_guidance',
      password: String(process.env.DB_PASSWORD || ''),
      port: 5432,
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
