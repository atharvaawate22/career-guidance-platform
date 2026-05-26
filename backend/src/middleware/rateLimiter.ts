import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createRedisStore } from '../config/redis';

/**
 * Builds a RedisStore when Redis is configured, otherwise falls back to the
 * default MemoryStore.  Separate instances per limiter so each limiter has an
 * independent counter namespace in Redis.
 */
function makeStore(): InstanceType<typeof RedisStore> | undefined {
  const redisStoreConfig = createRedisStore();
  if (!redisStoreConfig) return undefined;
  return new RedisStore(redisStoreConfig);
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
