import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createRedisStore } from '../config/redis';

/**
 * Single source of truth for rate limiting.
 *
 * Factory helpers build per-route limiters for public GET/POST endpoints, and
 * the named instances below are applied directly in their route modules. Each
 * limiter gets its own RedisStore so PM2 cluster workers share counters via
 * Redis; when Redis is not configured the limiters fall back to the default
 * in-memory store, so dev / no-Redis environments work without any config.
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

export const predictorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again in a minute.',
    },
  },
});

export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many booking attempts, please try again later.',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts, please try again later.',
    },
  },
});
