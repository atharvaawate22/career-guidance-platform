// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Global error logging for diagnosis — uses logger once the module is fully loaded
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
const allowedOrigins = Array.from(
  new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(
      process.env.FRONTEND_URL ||
      'https://career-guidance-platform-gilt.vercel.app'
    )
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean),
  ]),
);

const isAllowedOrigin = (origin: string): boolean =>
  allowedOrigins.includes(origin);
import errorHandler from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { createPublicPostLimiter } from './middleware/rateLimit';
import updatesRoutes from './modules/updates/updates.routes';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import cutoffsRoutes from './modules/cutoffs/cutoffs.routes';
import predictorRoutes from './modules/predictor/predictor.routes';
import guidesRoutes from './modules/guides/guides.routes';
import resourcesRoutes from './modules/resources/resources.routes';
import faqsRoutes from './modules/faqs/faqs.routes';
import bookingRoutes from './modules/booking/booking.routes';
import { testConnection, query } from './config/database';
import { runMigrations } from './config/migrations';
import { runSampleSeed, bootstrapAdmin } from './config/seed';
import { CITY_NORMALIZED_SQL } from './utils/cityNormalization';
import logger from './utils/logger';

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
const publicPredictLimiter = createPublicPostLimiter(60, 15 * 60 * 1000);
const publicBookingLimiter = createPublicPostLimiter(20, 15 * 60 * 1000);
const publicGuideDownloadLimiter = createPublicPostLimiter(30, 15 * 60 * 1000);

app.use(
  // Allow large JSON bodies for the admin bulk-cutoff import endpoint only.
  // The global 50 kb parser below would reject a full-year import (~6–7 MB) with 413.
  // body-parser sets req._body = true after parsing, so the global parser below
  // skips re-parsing for requests already handled here.
  '/api/admin/cutoffs',
  express.json({ limit: '20mb' }),
);
app.use(express.json({ limit: '50kb' }));
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      const requestOrigin = normalizeOrigin(origin);
      if (isAllowedOrigin(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${requestOrigin}' is not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());
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
      health: '/api/health',
      updates: '/api/updates',
      cutoffs: '/api/cutoffs',
      predict: '/api/predict',
      guides: '/api/guides',
      faqs: '/api/faqs',
      bookings: '/api/bookings',
      adminLogin: '/api/admin/login',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await testConnection();
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database is not ready',
      },
    });
  }
});

// Register module routes
app.use('/api/updates', updatesRoutes);
app.use('/api/cutoffs', cutoffsRoutes);
app.use('/api/predict', publicPredictLimiter, predictorRoutes);
app.use('/api/guides/download', publicGuideDownloadLimiter);
app.use('/api/guides', guidesRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/bookings', publicBookingLimiter, bookingRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);

// Register error handler after all routes
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
  try {
    await runMigrations();
  } catch (migrationError) {
    logger.error('Migration failed, aborting startup', migrationError);
    process.exit(1);
  }

  const dbReady = await initializeDatabase();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    if (!dbReady) {
      logger.info('Server started in degraded mode: database is not ready');
    }
  });
};


if (process.env.NODE_ENV !== 'test') {
  void startServer();
}
