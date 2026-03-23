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
const VERCEL_HOST_SUFFIX = '.vercel.app';
const DEFAULT_VERCEL_PROJECT_SLUG = 'career-guidance-platform';
const frontendOrigins = (
  process.env.FRONTEND_URL || 'https://career-guidance-platform-gilt.vercel.app'
)
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set(['http://localhost:3000', 'http://127.0.0.1:3000', ...frontendOrigins]),
);
const vercelProjectSlugs = Array.from(
  new Set(
    [
      DEFAULT_VERCEL_PROJECT_SLUG,
      ...(process.env.VERCEL_PROJECT_SLUGS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
      ...frontendOrigins
      .map((origin) => {
        try {
          const hostname = new URL(origin).hostname.toLowerCase();
          if (!hostname.endsWith(VERCEL_HOST_SUFFIX)) {
            return [];
          }

          const subdomain = hostname.slice(0, -VERCEL_HOST_SUFFIX.length);
          const segments = subdomain.split('-').filter(Boolean);
          return segments
            .slice(0, Math.max(segments.length - 1, 1))
            .map((_, index) => segments.slice(0, index + 1).join('-'))
            .filter((slug) => slug.includes('-'));
        } catch {
          return [];
        }
      })
      .flat(),
    ].filter(Boolean),
  ),
);

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'https:' || !hostname.endsWith(VERCEL_HOST_SUFFIX)) {
      return false;
    }

    const subdomain = hostname.slice(0, -VERCEL_HOST_SUFFIX.length);
    return vercelProjectSlugs.some(
      (slug) =>
        subdomain === slug || subdomain.startsWith(`${slug}-`),
    );
  } catch {
    return false;
  }
};
import bcrypt from 'bcrypt';
import errorHandler from './middleware/errorHandler';
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
import { CITY_NORMALIZED_SQL } from './utils/cityNormalization';
import logger from './utils/logger';

const app = express();
const CITY_NORMALIZATION_BACKFILL_BATCH_SIZE = 1000;

async function getExistingColumns(tableName: string): Promise<Set<string>> {
  const result = await query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => String(row.column_name)));
}

async function getExistingIndexes(tableName: string): Promise<Set<string>> {
  const result = await query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => String(row.indexname)));
}

async function getExistingPolicies(tableName: string): Promise<Set<string>> {
  const result = await query(
    `
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => String(row.policyname)));
}

async function isRowLevelSecurityEnabled(tableName: string): Promise<boolean> {
  const result = await query(
    `
      SELECT relrowsecurity
      FROM pg_class
      WHERE oid = $1::regclass
    `,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.relrowsecurity);
}

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
      faqs: '/api/faqs',
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
app.use('/api/faqs', faqsRoutes);
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
        city_normalized TEXT,
        percentile DECIMAL(6,4) NOT NULL,
        cutoff_rank INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migrate existing tables ? add new columns only when actually missing.
    const cutoffColumns = await getExistingColumns('cutoff_data');

    if (!cutoffColumns.has('college_code')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN college_code TEXT`);
    }
    if (!cutoffColumns.has('branch_code')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN branch_code TEXT`);
    }
    if (!cutoffColumns.has('college_status')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN college_status TEXT`);
    }
    if (!cutoffColumns.has('stage')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN stage TEXT`);
    }
    if (!cutoffColumns.has('level')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN level TEXT`);
    }
    if (!cutoffColumns.has('city_normalized')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN city_normalized TEXT`);
    }
    if (!cutoffColumns.has('cutoff_rank')) {
      await query(`ALTER TABLE cutoff_data ADD COLUMN cutoff_rank INTEGER`);
    }
    // Make home_university nullable for rows where data is unknown
    await query(
      `ALTER TABLE cutoff_data ALTER COLUMN home_university SET DEFAULT 'All'`,
    ).catch(() => {});

    const cutoffIndexes = await getExistingIndexes('cutoff_data');

    // Create indexes for cutoff_data only when missing.
    if (!cutoffIndexes.has('idx_cutoff_year')) {
      await query(`CREATE INDEX idx_cutoff_year ON cutoff_data(year)`);
    }
    if (!cutoffIndexes.has('idx_cutoff_category')) {
      await query(`CREATE INDEX idx_cutoff_category ON cutoff_data(category)`);
    }
    if (!cutoffIndexes.has('idx_cutoff_home_university')) {
      await query(
        `CREATE INDEX idx_cutoff_home_university ON cutoff_data(home_university)`,
      );
    }
    if (!cutoffIndexes.has('idx_cutoff_college_code')) {
      await query(
        `CREATE INDEX idx_cutoff_college_code ON cutoff_data(college_code)`,
      );
    }
    if (!cutoffIndexes.has('idx_cutoff_meta_year_branch')) {
      await query(
        `CREATE INDEX idx_cutoff_meta_year_branch ON cutoff_data(year, branch)`,
      );
    }
    if (!cutoffIndexes.has('idx_cutoff_meta_year_college_code_name')) {
      await query(`
        CREATE INDEX idx_cutoff_meta_year_college_code_name
        ON cutoff_data(year, college_code, college_name)
      `);
    }

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

    // Index to support active resources listing with optional category filter.
    await query(`
      CREATE INDEX IF NOT EXISTS idx_resources_active_category_created_at
      ON resources(is_active, category, created_at DESC)
    `);

    // Create FAQs table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_faqs_active_display_order
      ON faqs(is_active, display_order, created_at)
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
        meeting_purpose TEXT NOT NULL DEFAULT 'General admission guidance',
        meeting_time TIMESTAMP NOT NULL,
        meet_link TEXT NOT NULL,
        booking_status TEXT DEFAULT 'scheduled',
        email_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const bookingColumns = await getExistingColumns('bookings');
    if (!bookingColumns.has('meeting_purpose')) {
      await query(
        `ALTER TABLE bookings ADD COLUMN meeting_purpose TEXT NOT NULL DEFAULT 'General admission guidance'`,
      );
    }

    // Create indexes for bookings
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_meeting_time ON bookings(meeting_time)
    `);

    // ---------------------------------------------------------------------
    // Supabase Security hardening: enable RLS on public tables.
    // Public read is allowed only where the app intentionally exposes data.
    // Sensitive tables keep RLS enabled with no public policies.
    // ---------------------------------------------------------------------
    const rlsTargets = [
      'updates',
      'resources',
      'faqs',
      'guides',
      'cutoff_data',
      'admin_users',
      'guide_downloads',
      'bookings',
    ] as const;

    for (const tableName of rlsTargets) {
      if (!(await isRowLevelSecurityEnabled(tableName))) {
        await query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
      }
    }

    const updatesPolicies = await getExistingPolicies('updates');
    if (!updatesPolicies.has('updates_public_read')) {
      await query(
        `CREATE POLICY updates_public_read ON updates FOR SELECT USING (true)`,
      );
    }

    const faqPolicies = await getExistingPolicies('faqs');
    if (!faqPolicies.has('faqs_public_read_active')) {
      await query(
        `CREATE POLICY faqs_public_read_active ON faqs FOR SELECT USING (is_active = true)`,
      );
    }

    // Explicitly deny direct API access to private tables while keeping RLS enabled.
    // This resolves "RLS enabled but no policy" advisor warnings without exposing data.
    const adminPolicies = await getExistingPolicies('admin_users');
    if (!adminPolicies.has('admin_users_no_access')) {
      await query(
        `CREATE POLICY admin_users_no_access ON admin_users FOR ALL USING (false) WITH CHECK (false)`,
      );
    }

    const bookingPolicies = await getExistingPolicies('bookings');
    if (!bookingPolicies.has('bookings_no_access')) {
      await query(
        `CREATE POLICY bookings_no_access ON bookings FOR ALL USING (false) WITH CHECK (false)`,
      );
    }

    const guideDownloadPolicies = await getExistingPolicies('guide_downloads');
    if (!guideDownloadPolicies.has('guide_downloads_no_access')) {
      await query(
        `CREATE POLICY guide_downloads_no_access ON guide_downloads FOR ALL USING (false) WITH CHECK (false)`,
      );
    }

    const cutoffPolicies = await getExistingPolicies('cutoff_data');
    if (!cutoffPolicies.has('cutoff_data_public_read')) {
      await query(
        `CREATE POLICY cutoff_data_public_read ON cutoff_data FOR SELECT USING (true)`,
      );
    }

    const guidePolicies = await getExistingPolicies('guides');
    if (!guidePolicies.has('guides_public_read_active')) {
      await query(
        `CREATE POLICY guides_public_read_active ON guides FOR SELECT USING (is_active = true)`,
      );
    }

    const resourcePolicies = await getExistingPolicies('resources');
    if (!resourcePolicies.has('resources_public_read_active')) {
      await query(
        `CREATE POLICY resources_public_read_active ON resources FOR SELECT USING (is_active = true)`,
      );
    }

    if (!cutoffIndexes.has('idx_cutoff_meta_year_city_normalized_col')) {
      await query(`
        CREATE INDEX idx_cutoff_meta_year_city_normalized_col
        ON cutoff_data(year, city_normalized)
      `);
    }

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
