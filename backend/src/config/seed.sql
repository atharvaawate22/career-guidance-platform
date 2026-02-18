-- Sample Data for MHT CET Career Guidance Platform
-- Version: 1.0.0
-- Created: 2026-02-18
-- Purpose: Insert sample data for development and testing

-- ============================================================================
-- SAMPLE UPDATES
-- ============================================================================
INSERT INTO updates (title, content, published_date) VALUES 
(
  'CAP Round 1 Schedule Announced',
  'The first round of Common Admission Process (CAP) for MHT CET 2026 will begin from March 15, 2026. Candidates are advised to complete their registration and document verification before the deadline.',
  '2026-02-10'
),
(
  'Important: Document Verification Process',
  'All candidates must upload scanned copies of their documents including 10th and 12th mark sheets, caste certificate (if applicable), and domicile certificate. Ensure all documents are clear and legible.',
  '2026-02-12'
),
(
  'Cutoff Trends for 2025 Released',
  'The State CET Cell has released the final cutoff data for the academic year 2025. Students can use this information to make informed decisions during the counseling process.',
  '2026-02-14'
)
ON CONFLICT DO NOTHING;
