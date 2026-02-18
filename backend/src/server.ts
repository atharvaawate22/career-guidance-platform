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
import bcrypt from 'bcrypt';
import errorHandler from './middleware/errorHandler';
import updatesRoutes from './modules/updates/updates.routes';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import cutoffsRoutes from './modules/cutoffs/cutoffs.routes';
import predictorRoutes from './modules/predictor/predictor.routes';
import guidesRoutes from './modules/guides/guides.routes';
import bookingRoutes from './modules/booking/booking.routes';
import { testConnection, query } from './config/database';
import logger from './utils/logger';

const app = express();

app.use(express.json());
app.use(cors());
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
  res.json({
    success: true,
    message: 'Server is running',
  });
});

// Register module routes
app.use('/api/updates', updatesRoutes);
app.use('/api/cutoffs', cutoffsRoutes);
app.use('/api/predict', predictorRoutes);
app.use('/api/guides', guidesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);

// Register error handler after all routes
app.use(errorHandler);

const initializeDatabase = async () => {
  try {
    // Test database connection
    await testConnection();

    // Create updates table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

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
        college_name TEXT NOT NULL,
        branch TEXT NOT NULL,
        category TEXT NOT NULL,
        gender TEXT,
        home_university TEXT NOT NULL,
        percentile DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

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
  } catch (error) {
    logger.error('Database initialization failed', error);
    process.exit(1);
  }
};

const startServer = async () => {
  await initializeDatabase();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();
