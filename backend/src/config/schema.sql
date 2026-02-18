-- Database Schema for MHT CET Career Guidance Platform
-- Version: 1.0.0
-- Created: 2026-02-18

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: updates
-- Purpose: Stores official CET notifications and updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_updates_published_date 
ON updates(published_date DESC);

-- Index for edited updates
CREATE INDEX IF NOT EXISTS idx_updates_edited_at 
ON updates(edited_at DESC);

-- ============================================================================
-- TABLE: admin_users
-- Purpose: Stores authorized admin accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for login queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
ON admin_users(email);

-- ============================================================================
-- TABLE: cutoff_data
-- Purpose: Historical cutoff information for predictor and explorer
-- ============================================================================
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
);

-- Indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_cutoff_year 
ON cutoff_data(year);

CREATE INDEX IF NOT EXISTS idx_cutoff_category 
ON cutoff_data(category);

CREATE INDEX IF NOT EXISTS idx_cutoff_branch 
ON cutoff_data(branch);

CREATE INDEX IF NOT EXISTS idx_cutoff_percentile 
ON cutoff_data(percentile);

CREATE INDEX IF NOT EXISTS idx_cutoff_home_university 
ON cutoff_data(home_university);

CREATE INDEX IF NOT EXISTS idx_cutoff_college_name 
ON cutoff_data(college_name);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_cutoff_composite 
ON cutoff_data(year, category, branch);

-- ============================================================================
-- TABLE: guides
-- Purpose: Metadata for downloadable PDF guides
-- ============================================================================
CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for active guides query
CREATE INDEX IF NOT EXISTS idx_guides_is_active 
ON guides(is_active);

-- ============================================================================
-- TABLE: guide_downloads
-- Purpose: Track guide download activity and lead capture
-- ============================================================================
CREATE TABLE IF NOT EXISTS guide_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  percentile DECIMAL(5,2),
  downloaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics and lead tracking
CREATE INDEX IF NOT EXISTS idx_guide_downloads_email 
ON guide_downloads(email);

CREATE INDEX IF NOT EXISTS idx_guide_downloads_guide_id 
ON guide_downloads(guide_id);

-- ============================================================================
-- TABLE: bookings
-- Purpose: Store consultation booking records
-- ============================================================================
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
);

-- Indexes for booking management
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_time 
ON bookings(meeting_time);

CREATE INDEX IF NOT EXISTS idx_bookings_email 
ON bookings(email);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(booking_status);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
