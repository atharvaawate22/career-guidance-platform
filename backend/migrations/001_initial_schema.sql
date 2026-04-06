-- Migration 001: Initial schema
-- Creates all base tables and core indexes.
-- Uses IF NOT EXISTS so it is safe to run against an existing database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_published_date
  ON updates(published_date DESC);

CREATE INDEX IF NOT EXISTS idx_updates_edited_at
  ON updates(edited_at DESC);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email
  ON admin_users(email);

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
);

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

CREATE INDEX IF NOT EXISTS idx_cutoff_composite
  ON cutoff_data(year, category, branch);

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_is_active
  ON guides(is_active);

CREATE TABLE IF NOT EXISTS guide_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  percentile DECIMAL(5,2),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_downloads_email
  ON guide_downloads(email);

CREATE INDEX IF NOT EXISTS idx_guide_downloads_guide_id
  ON guide_downloads(guide_id);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Others',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_active_category_created_at
  ON resources(is_active, category, created_at DESC);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_active_display_order
  ON faqs(is_active, display_order, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  percentile DECIMAL(5,2) NOT NULL,
  category TEXT NOT NULL,
  branch_preference TEXT NOT NULL,
  meeting_purpose TEXT NOT NULL DEFAULT 'General admission guidance',
  meeting_time TIMESTAMPTZ NOT NULL,
  meet_link TEXT NOT NULL,
  booking_status TEXT DEFAULT 'scheduled',
  email_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_meeting_time
  ON bookings(meeting_time);

CREATE INDEX IF NOT EXISTS idx_bookings_email
  ON bookings(email);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(booking_status);
