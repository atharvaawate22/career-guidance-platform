import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createRedisStore } from '../config/redis';

/** Constant-time string compare for the internal proxy token (length-guarded). */
function safeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

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

export function createPublicGetLimiter(
  maxRequests: number,
  windowMs: number,
  options?: { proxyToken?: string },
) {
  const proxyToken = options?.proxyToken;
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method !== 'GET',
    // Behind our own Vercel edge proxy, cache-miss requests reach the origin
    // from Vercel's shared IP. When the proxy authenticates with the shared
    // INTERNAL_PROXY_TOKEN, key on the real visitor IP it forwards so the
    // per-IP cap stays per-user instead of collapsing onto Vercel's IP. Direct
    // (non-proxy) traffic always keys on the connection IP, so the forwarded
    // header cannot be spoofed to evade the limit. Falls back gracefully to the
    // connection IP when no token is configured.
    keyGenerator: (req) => {
      if (proxyToken) {
        const provided = req.get('x-internal-proxy-token');
        const realIp = req.get('x-real-client-ip');
        if (provided && realIp && safeTokenEqual(provided, proxyToken)) {
          return realIp;
        }
      }
      return req.ip ?? 'unknown';
    },
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

export const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many messages, please slow down.',
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
