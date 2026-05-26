import Redis from 'ioredis';
import type { RedisReply } from 'rate-limit-redis';
import logger from '../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      logger.error('[redis] connection error', { message: err.message });
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600,
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache failure must never break the request.
  }
}

/**
 * Delete all keys matching a glob pattern.
 *
 * Uses SCAN (O(1) per iteration) instead of KEYS (O(N) blocking) so that
 * large keyspaces do not block the Redis event loop in production.
 */
export async function cacheDelete(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    // Cache failure must never break the request.
    logger.warn('[redis] cacheDelete failed for pattern', { pattern, error });
  }
}

/**
 * Returns a sendCommand-compatible store object for rate-limit-redis so that
 * rate limiters across all PM2 cluster workers share a single Redis counter.
 *
 * Returns undefined when Redis is not configured, allowing rate limiters to
 * fall back to the default in-memory store gracefully (dev / no-Redis envs).
 */
export function createRedisStore():
  | { sendCommand: (...args: string[]) => Promise<RedisReply> }
  | undefined {
  const client = getRedis();
  if (!client) return undefined;
  return {
    sendCommand: (...args: string[]) =>
      client.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
  };
}
