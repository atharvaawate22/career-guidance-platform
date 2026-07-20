-- Database Schema for MHT CET Career Guidance Platform
-- Version: 1.2.0
-- Updated: 2026-05-26
-- Purpose: Complete, production-ready schema definitions with high precision and optimized indexes.

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

-- ============================================================================
-- TABLE: admin_users
-- Purpose: Stores authorized admin accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for login queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
ON admin_users(email);

-- ============================================================================
-- CUTOFF SCHEMA (colleges + courses + cutoffs)
-- Defined in migrations/012_cutoffs_redesign.sql. The legacy flat `cutoff_data`
-- table has been superseded; it is kept in the live database only as a revert
-- backup and is intentionally NOT recreated by this baseline.
-- ============================================================================

-- ============================================================================
-- TABLE: resources
-- Purpose: Downloadable documents — seat matrices, circulars, cutoff PDFs
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Others',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active resources listing
CREATE INDEX IF NOT EXISTS idx_resources_created_at
ON resources(created_at DESC);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  percentile DECIMAL(10,7),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics and lead tracking
CREATE INDEX IF NOT EXISTS idx_guide_downloads_guide_id 
ON guide_downloads(guide_id);

-- ============================================================================
-- TABLE: faqs
-- Purpose: Public FAQ content managed from the admin panel
-- ============================================================================
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_display_order
ON faqs(display_order);

-- ============================================================================
-- TABLE: bookings
-- Purpose: Store consultation booking records
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  percentile DECIMAL(10,7) NOT NULL,
  category TEXT NOT NULL,
  branch_preference TEXT NOT NULL,
  meeting_purpose TEXT NOT NULL DEFAULT 'General admission guidance',
  meeting_time TIMESTAMPTZ NOT NULL,
  meet_link TEXT NOT NULL,
  booking_status TEXT DEFAULT 'scheduled',
  email_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for booking management
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_time 
ON bookings(meeting_time);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(booking_status);

-- ============================================================================
-- TABLE: cap_schedule
-- Purpose: Structured CAP round dates for the rule-based chatbot.
-- Defined in migrations/014_cap_schedule.sql.
-- ============================================================================

-- ============================================================================
-- TABLE: document_checklist
-- Purpose: Seeded CAP admission document checklist for the chatbot.
-- Defined in migrations/015_document_checklist.sql.
-- ============================================================================

-- ============================================================================
-- TABLE: unanswered_queries
-- Purpose: Logs chatbot fallback queries — the Phase 2 RAG content backlog.
-- Defined in migrations/016_unanswered_queries.sql.
-- ============================================================================

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Purpose: Protect Supabase Data API exposure while allowing intended public reads
-- ============================================================================
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public read policies for app-facing content
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'faqs' AND policyname = 'faqs_public_read_active'
  ) THEN
    CREATE POLICY faqs_public_read_active ON faqs FOR SELECT USING (is_active = true);
  END IF;
END
$$;

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

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
