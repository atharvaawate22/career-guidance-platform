// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Global error logging for diagnosis
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection:', reason);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
const frontendOrigins = (
  process.env.FRONTEND_URL || 'https://career-guidance-platform-gilt.vercel.app'
)
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set(['http://localhost:3000', ...frontendOrigins]),
);
import bcrypt from 'bcrypt';
import errorHandler from './middleware/errorHandler';
import updatesRoutes from './modules/updates/updates.routes';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import cutoffsRoutes from './modules/cutoffs/cutoffs.routes';
import predictorRoutes from './modules/predictor/predictor.routes';
import guidesRoutes from './modules/guides/guides.routes';
import resourcesRoutes from './modules/resources/resources.routes';
import bookingRoutes from './modules/booking/booking.routes';
import { testConnection, query } from './config/database';
import { CITY_NORMALIZED_SQL } from './utils/cityNormalization';
import logger from './utils/logger';

const app = express();

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
      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${requestOrigin}' is not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());

const PORT = process.env.PORT || 5000;

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
      bookings: '/api/bookings',
      adminLogin: '/api/admin/login',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Register module routes
app.use('/api/updates', updatesRoutes);
app.use('/api/cutoffs', cutoffsRoutes);
app.use('/api/predict', predictorRoutes);
app.use('/api/guides', guidesRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);

// Register error handler after all routes
app.use(errorHandler);

const initializeDatabase = async (): Promise<boolean> => {
  try {
    // Test database connection
    await testConnection();

    // Create updates table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add edited_at column if it doesn't exist (for existing tables)
    await query(`
      ALTER TABLE updates ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ
    `);

    // Alter published_date to TIMESTAMPTZ if it was DATE before
    await query(`
      ALTER TABLE updates ALTER COLUMN published_date TYPE TIMESTAMPTZ USING published_date::TIMESTAMPTZ
    `).catch(() => {}); // ignore if already correct type

    // Create index on published_date
    await query(`
      CREATE INDEX IF NOT EXISTS idx_updates_published_date 
      ON updates(published_date)
    `);

    // Create admin_users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create cutoff_data table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS cutoff_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        year INTEGER NOT NULL,
        college_code TEXT,
        college_name TEXT NOT NULL,
        branch_code TEXT,
        branch TEXT NOT NULL,
        category TEXT NOT NULL,
        gender TEXT,
        home_university TEXT NOT NULL DEFAULT 'All',
        college_status TEXT,
        stage TEXT,
        level TEXT,
        percentile DECIMAL(6,4) NOT NULL,
        cutoff_rank INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migrate existing tables — add new columns if missing
    await query(
      `ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS college_code TEXT`,
    );
    await query(
      `ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS branch_code TEXT`,
    );
    await query(
      `ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS college_status TEXT`,
    );
    await query(`ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS stage TEXT`);
    await query(`ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS level TEXT`);
    await query(
      `ALTER TABLE cutoff_data ADD COLUMN IF NOT EXISTS cutoff_rank INTEGER`,
    );
    // Make home_university nullable for rows where data is unknown
    await query(
      `ALTER TABLE cutoff_data ALTER COLUMN home_university SET DEFAULT 'All'`,
    ).catch(() => {});

    // Create indexes for cutoff_data
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_year ON cutoff_data(year)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_category ON cutoff_data(category)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_branch ON cutoff_data(branch)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_percentile ON cutoff_data(percentile)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_home_university ON cutoff_data(home_university)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_college_code ON cutoff_data(college_code)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_branch ON cutoff_data(year, branch)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_college_code_name
      ON cutoff_data(year, college_code, college_name)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_city_normalized
      ON cutoff_data(year, (${CITY_NORMALIZED_SQL}))
    `).catch((error) => {
      logger.warn('Skipping cutoff city metadata index creation', error);
    });

    // Create guides table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS guides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        file_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create guide_downloads table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS guide_downloads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guide_id UUID NOT NULL REFERENCES guides(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        percentile DECIMAL(5,2),
        downloaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for guide_downloads
    await query(`
      CREATE INDEX IF NOT EXISTS idx_guide_downloads_email ON guide_downloads(email)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_guide_downloads_guide_id ON guide_downloads(guide_id)
    `);

    // Create resources table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        file_url TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Others',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create index on resources category for filter queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category)
    `);

    // Create bookings table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        percentile DECIMAL(5,2) NOT NULL,
        category TEXT NOT NULL,
        branch_preference TEXT NOT NULL,
        meeting_time TIMESTAMP NOT NULL,
        meet_link TEXT NOT NULL,
        booking_status TEXT DEFAULT 'scheduled',
        email_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for bookings
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_meeting_time ON bookings(meeting_time)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email)
    `);

    // ---------------------------------------------------------------------
    // Supabase Security hardening: enable RLS on public tables.
    // Public read is allowed only where the app intentionally exposes data.
    // Sensitive tables keep RLS enabled with no public policies.
    // ---------------------------------------------------------------------
    await query(`ALTER TABLE updates ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE resources ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE guides ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE cutoff_data ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE guide_downloads ENABLE ROW LEVEL SECURITY`);
    await query(`ALTER TABLE bookings ENABLE ROW LEVEL SECURITY`);

    // Public read policies for data that is intentionally visible in the app.
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'updates' AND policyname = 'updates_public_read'
        ) THEN
          CREATE POLICY updates_public_read ON updates FOR SELECT USING (true);
        END IF;
      END
      $$;
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'cutoff_data' AND policyname = 'cutoff_data_public_read'
        ) THEN
          CREATE POLICY cutoff_data_public_read ON cutoff_data FOR SELECT USING (true);
        END IF;
      END
      $$;
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'guides' AND policyname = 'guides_public_read_active'
        ) THEN
          CREATE POLICY guides_public_read_active ON guides FOR SELECT USING (is_active = true);
        END IF;
      END
      $$;
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'resources' AND policyname = 'resources_public_read_active'
        ) THEN
          CREATE POLICY resources_public_read_active ON resources FOR SELECT USING (is_active = true);
        END IF;
      END
      $$;
    `);

    logger.info('Database tables initialized successfully');

    // Insert sample data if table is empty (for testing)
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

    // Insert admin user if environment variables are set
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
    return true;
  } catch (error) {
    logger.error('Database initialization failed', error);
    logger.error(
      'Continuing startup without database initialization. Set DATABASE_URL (or local DB settings) to enable DB-backed routes.',
    );
    return false;
  }
};

const startServer = async () => {
  const dbReady = await initializeDatabase();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    if (!dbReady) {
      logger.info('Server started in degraded mode: database is not ready');
    }
  });
};

startServer();
