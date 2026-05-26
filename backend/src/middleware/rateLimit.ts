import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createRedisStore } from '../config/redis';

/**
 * Factory: builds a RedisStore when Redis is configured, otherwise falls back
 * to the default MemoryStore.  This ensures that in PM2 cluster mode all
 * worker processes share the same rate-limit counters via Redis, while dev /
 * no-Redis environments continue to work without any configuration change.
 */
function makeStore(): InstanceType<typeof RedisStore> | undefined {
  const redisStoreConfig = createRedisStore();
  if (!redisStoreConfig) return undefined;
  return new RedisStore(redisStoreConfig);
}

export function createPublicPostLimiter(maxRequests: number, windowMs: number) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method !== 'POST',
    store: makeStore(),
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });
}

export function createPublicGetLimiter(maxRequests: number, windowMs: number) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method !== 'GET',
    store: makeStore(),
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down.',
      },
    },
  });
}

export function createAdminLoginLimiter(
  maxRequests = 8,
  windowMs = 15 * 60 * 1000,
) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(),
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please wait before trying again.',
      },
    },
  });
}
