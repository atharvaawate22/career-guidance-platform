// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Global error logging for diagnosis
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
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
import bcrypt from 'bcrypt';
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
import { CITY_NORMALIZED_SQL } from './utils/cityNormalization';
import logger from './utils/logger';

export const app = express();
const trustProxySetting = (() => {
  const configured = (process.env.TRUST_PROXY || '').trim().toLowerCase();
  if (!configured) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }
  if (configured === 'false' || configured === '0' || configured === 'no') {
    return false;
  }
  if (configured === 'true' || configured === 'yes') {
    return true;
  }

  const numeric = Number(configured);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.floor(numeric);
  }

  return configured;
})();
app.set('trust proxy', trustProxySetting);
const CITY_NORMALIZATION_BACKFILL_BATCH_SIZE = 1000;
const publicPredictLimiter = createPublicPostLimiter(60, 15 * 60 * 1000);
const publicBookingLimiter = createPublicPostLimiter(20, 15 * 60 * 1000);
const publicGuideDownloadLimiter = createPublicPostLimiter(30, 15 * 60 * 1000);

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
const shouldSeedSampleData = (() => {
  const configured = (process.env.ENABLE_SAMPLE_SEED || '')
    .trim()
    .toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return process.env.NODE_ENV !== 'production';
})();

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
      const { rows } = await query('SELECT COUNT(*) FROM updates');
      const count = parseInt(rows[0].count, 10);

      if (count === 0) {
        logger.info('Inserting sample updates data');
        await query(
          `INSERT INTO updates (title, content, published_date) VALUES 
          ($1, $2, $3),
          ($4, $5, $6),
          ($7, $8, $9)`,
          [
            'CAP Round 1 Schedule Announced',
            'The first round of Common Admission Process (CAP) for MHT CET 2026 will begin from March 15, 2026. Candidates are advised to complete their registration and document verification before the deadline.',
            '2026-02-10',
            'Important: Document Verification Process',
            'All candidates must upload scanned copies of their documents including 10th and 12th mark sheets, caste certificate (if applicable), and domicile certificate. Ensure all documents are clear and legible.',
            '2026-02-12',
            'Cutoff Trends for 2025 Released',
            'The State CET Cell has released the final cutoff data for the academic year 2025. Students can use this information to make informed decisions during the counseling process.',
            '2026-02-14',
          ],
        );
        logger.info('Sample updates data inserted successfully');
      }

      const { rows: faqRows } = await query('SELECT COUNT(*) FROM faqs');
      const faqCount = parseInt(faqRows[0].count, 10);

      if (faqCount === 0) {
        logger.info('Inserting sample FAQ data');
        await query(
          `INSERT INTO faqs (question, answer, display_order) VALUES
          ($1, $2, $3),
          ($4, $5, $6),
          ($7, $8, $9),
          ($10, $11, $12),
          ($13, $14, $15),
          ($16, $17, $18),
          ($19, $20, $21),
          ($22, $23, $24),
          ($25, $26, $27),
          ($28, $29, $30)`,
          [
            'How does the college predictor work?',
            'The predictor compares your rank or percentile with real 2025 CAP Round 1 cutoff data and groups colleges into Safe, Target, and Dream options. It is a data-driven shortlist, not a guaranteed allotment.',
            1,
            'Are the predictor results guaranteed?',
            'No. Final allotment depends on the official CAP process, seat availability, category rules, choice filling order, and the number of students applying in that round.',
            2,
            'What is the difference between Safe, Target, and Dream colleges?',
            'Safe colleges have cutoffs that are more accessible than your profile, Target colleges are close to your profile, and Dream colleges are more competitive but still worth exploring.',
            3,
            'What data does the predictor and cutoff explorer use?',
            'Both tools are powered by officially published 2025 CAP Round 1 through Round 4 cutoff data — covering over 33,000 records across colleges, branches, categories, and minority quotas in Maharashtra.',
            4,
            'Can I filter by city and branch together?',
            'Yes. Both the predictor and the cutoff explorer support multiple filters simultaneously. You can narrow results by branch, city, category, gender, minority type, and CAP round at the same time.',
            5,
            'How should I use the cutoff explorer?',
            'Start broad with category and gender, then narrow by branch, city, college, and CAP round. This helps you understand how cutoffs move across rounds before you finalise your preference list.',
            6,
            'Why does category or gender change the results?',
            'MHT-CET admissions use different reservation and seat rules. The platform applies these filters so the results match the seat pools you are actually eligible for.',
            7,
            'How do I register for the CAP process?',
            'Registration is done on the official State CET Cell website (cetcell.mahacet.org). You need to fill the online application, upload required documents, pay the fee, and then attend document verification at the designated ARC centre.',
            8,
            'What documents are needed for admission?',
            'Essential documents include your MHT-CET scorecard, 10th and 12th marksheets, domicile certificate, caste/category certificate (if applicable), income certificate (for EWS/TFWS), and Aadhaar card. Keep original and photocopies ready.',
            9,
            'When should I book a guidance session?',
            'Book a session if you want help building your option form, comparing branches, balancing dream versus safe colleges, or planning for multiple CAP rounds. Sessions are free and conducted via Google Meet.',
            10,
          ],
        );
        logger.info('Sample FAQ data inserted successfully');
      }
    } else {
      logger.info('Skipping sample seed data (ENABLE_SAMPLE_SEED=false)');
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const { rows: adminRows } = await query(
        'SELECT COUNT(*) FROM admin_users WHERE email = $1',
        [adminEmail],
      );
      const adminCount = parseInt(adminRows[0].count, 10);

      if (adminCount === 0) {
        logger.info(`Creating admin user: ${adminEmail}`);
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await query(
          'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3)',
          [adminEmail, passwordHash, 'admin'],
        );
        logger.info(`Admin user created successfully: ${adminEmail}`);
      }
    } else {
      logger.info(
        'Skipping admin user creation (ADMIN_EMAIL and ADMIN_PASSWORD not set)',
      );
    }

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
