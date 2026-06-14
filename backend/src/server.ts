import { initSentry, Sentry } from './config/sentry';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { createPublicPostLimiter, createPublicGetLimiter } from './middleware/rateLimit';
import { publicCache } from './middleware/cacheControl';
import updatesRoutes from './modules/updates/updates.routes';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import cutoffsRoutes from './modules/cutoffs/cutoffs.routes';
import predictorRoutes from './modules/predictor/predictor.routes';
import guidesRoutes from './modules/guides/guides.routes';
import resourcesRoutes from './modules/resources/resources.routes';
import faqsRoutes from './modules/faqs/faqs.routes';
import bookingRoutes from './modules/booking/booking.routes';
import settingsRoutes from './modules/settings/settings.routes';
import db, { testConnection, query } from './config/database';
import { getRedis } from './config/redis';
import { runMigrations } from './config/migrations';
import { runSampleSeed, bootstrapAdmin } from './config/seed';
import { CITY_NORMALIZED_SQL } from './utils/cityNormalization';
import logger, { pinoLogger } from './utils/logger';

// Global error logging for diagnosis — registered after logger is imported
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

export const app = express();

function resolveTrustProxy(): boolean | number | string {
  const configured = (process.env.TRUST_PROXY || '').trim().toLowerCase();
  if (!configured) return process.env.NODE_ENV === 'production' ? 1 : false;
  if (configured === 'false' || configured === '0' || configured === 'no') return false;
  if (configured === 'true' || configured === 'yes') return true;
  const numeric = Number(configured);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
  return configured;
}

app.set('trust proxy', resolveTrustProxy());
const CITY_NORMALIZATION_BACKFILL_BATCH_SIZE = 1000;
// Per-route public limiters. Predict and booking carry their own dedicated
// limiters inside their route modules (predictorLimiter / bookingLimiter), so
// they are intentionally not double-wrapped here.
const publicBookingSlotsGetLimiter = createPublicGetLimiter(120, 15 * 60 * 1000);
const publicGuideDownloadLimiter = createPublicPostLimiter(30, 15 * 60 * 1000);

// Public read caching. These endpoints return identical data for every visitor
// (no auth / cookies / per-user content), so browsers and any shared CDN can
// serve repeat reads without waking the small backend instance behind them.
// The server-side Redis cache (6h for cutoffs) remains the source of truth;
// these headers just keep that data closer to the user. See cacheControl.ts.
const referenceCache = publicCache({
  // Reference data that changes a few times a year (cutoffs, FAQs).
  browserMaxAge: 300,
  sharedMaxAge: 21600,
  staleWhileRevalidate: 86400,
});
const contentCache = publicCache({
  // Editorial / settings content that can change during the day.
  browserMaxAge: 120,
  sharedMaxAge: 3600,
  staleWhileRevalidate: 86400,
});
const availabilityCache = publicCache({
  // Booking slot availability shifts as people book — keep it short.
  browserMaxAge: 15,
  sharedMaxAge: 30,
  staleWhileRevalidate: 60,
});

app.use(
  // Allow large JSON bodies for the admin bulk-cutoff import endpoint only.
  // The global 50 kb parser below would reject a full-year import (~6–7 MB) with 413.
  // body-parser sets req._body = true after parsing, so the global parser below
  // skips re-parsing for requests already handled here.
  '/api/v1/admin/cutoffs',
  express.json({ limit: '20mb' }),
);
app.use(express.json({ limit: '50kb' }));
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = (process.env.FRONTEND_URL ?? '')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);

      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    maxAge: 86400, // Cache preflight responses for 24 hours
  }),
);
app.use(helmet());
app.use(pinoHttp({ logger: pinoLogger }));
app.use(cookieParser());
app.use(requestLogger);

const PORT = process.env.PORT || 5000;
const seedConfigured = (process.env.ENABLE_SAMPLE_SEED || '').trim().toLowerCase();
const shouldSeedSampleData =
  seedConfigured === 'true' ? true
  : seedConfigured === 'false' ? false
  : process.env.NODE_ENV !== 'production';

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'MHT CET Admission Guidance Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      updates: '/api/v1/updates',
      cutoffs: '/api/v1/cutoffs',
      predict: '/api/v1/predict',
      guides: '/api/v1/guides',
      faqs: '/api/v1/faqs',
      bookings: '/api/v1/bookings',
      adminLogin: '/api/v1/admin/login',
    },
  });
});

app.get('/api/v1/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    const redisClient = getRedis();
    if (redisClient) {
      await redisClient.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'not configured';
    }
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every(
    (value) => value === 'ok' || value === 'not configured',
  );

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  });
});

app.get('/api/health', (_req, res) => {
  res.redirect(301, '/api/v1/health');
});

app.get('/api/v1/ready', async (_req, res) => {
  const issues: string[] = [];
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];

  required.forEach((key) => {
    if (!process.env[key]) issues.push(`Missing env: ${key}`);
  });

  try {
    await query('SELECT 1');
  } catch {
    issues.push('Database unreachable');
  }

  try {
    const result = await query('SELECT COUNT(*) FROM schema_migrations');
    const count = parseInt(String(result.rows[0].count), 10);
    if (count < 10) {
      issues.push(`Only ${count}/10 migrations applied`);
    }
  } catch {
    issues.push('Cannot verify migration state');
  }

  if (issues.length > 0) {
    res.status(503).json({ ready: false, issues });
    return;
  }

  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.use(/^\/api\/(?!v1(?:\/|$)).+/, (req, res) => {
  res.redirect(301, req.originalUrl.replace('/api/', '/api/v1/'));
});

// Register module routes
app.use('/api/v1/updates', contentCache, updatesRoutes);
app.use('/api/v1/cutoffs', referenceCache, cutoffsRoutes);
app.use('/api/v1/predict', predictorRoutes); // POST — not CDN-cacheable; cached server-side in Redis
app.use('/api/v1/guides/download', publicGuideDownloadLimiter);
app.use('/api/v1/guides', contentCache, guidesRoutes);
app.use('/api/v1/resources', contentCache, resourcesRoutes);
app.use('/api/v1/faqs', referenceCache, faqsRoutes);
app.use('/api/v1/bookings/slots', availabilityCache, publicBookingSlotsGetLimiter);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/settings', contentCache, settingsRoutes);
app.use('/api/v1/admin', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// Register error handler after all routes
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

const initializeDatabase = async (): Promise<boolean> => {
  try {
    await testConnection();

    if (shouldSeedSampleData) {
      await runSampleSeed();
    } else {
      logger.info('Skipping sample seed data (ENABLE_SAMPLE_SEED=false)');
    }

    await bootstrapAdmin();

    try {
      const cityBackfillResult = await query(`
        WITH city_backfill_batch AS (
          SELECT ctid
          FROM cutoff_data
          WHERE city_normalized IS NULL
             OR TRIM(city_normalized) = ''
          LIMIT ${CITY_NORMALIZATION_BACKFILL_BATCH_SIZE}
        )
        UPDATE cutoff_data AS cutoff
        SET city_normalized = LOWER(TRIM(${CITY_NORMALIZED_SQL}))
        FROM city_backfill_batch
        WHERE cutoff.ctid = city_backfill_batch.ctid
      `);

      if ((cityBackfillResult.rowCount ?? 0) > 0) {
        logger.info(
          `Backfilled city_normalized for ${cityBackfillResult.rowCount} cutoff rows during startup`,
        );
      }
    } catch (backfillError) {
      logger.warn(
        'Skipping cutoff city_normalized backfill for this boot; startup can continue without it',
        backfillError,
      );
    }

    return true;
  } catch (error) {
    logger.error('Database initialization failed', error);
    logger.error(
      'Continuing startup without database initialization. Set DATABASE_URL (or local DB settings) to enable DB-backed routes.',
    );
    return false;
  }
};

export const startServer = async () => {
  // Validate JWT_SECRET is configured and strong enough
  const jwtSecret = process.env.JWT_SECRET || '';
  if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
    logger.error(
      'JWT_SECRET must be at least 32 characters in production. Aborting startup.',
    );
    process.exit(1);
  }

  let migrationsReady = true;
  try {
    await runMigrations();
  } catch (migrationError) {
    migrationsReady = false;
    logger.error(
      'Migration failed. Starting in degraded mode without DB initialization.',
      migrationError,
    );
  }

  const dbReady = migrationsReady ? await initializeDatabase() : false;

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    if (!dbReady) {
      logger.info('Server started in degraded mode: database is not ready');
    }
  });

  const shutdown = async (signal: string) => {
    logger.info(`[shutdown] received ${signal}, draining connections`);
    server.close(async () => {
      try {
        await db.end();
        const redisClient = getRedis();
        if (redisClient) await redisClient.quit();
        logger.info('[shutdown] clean exit');
        process.exit(0);
      } catch (err) {
        logger.error('[shutdown] error during cleanup', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('[shutdown] forced exit after timeout');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};


if (process.env.NODE_ENV !== 'test') {
  void startServer();
}
