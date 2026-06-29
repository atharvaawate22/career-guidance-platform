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

-- ============================================================================
-- OFFICIAL CET RESOURCES
-- Official State CET Cell (mahacet.org) documents for MHT-CET first year
-- engineering admissions. Portal subdomains rotate each cycle
-- (fe2025 -> fe2026, ...), so refresh these links every admission season.
-- ============================================================================
INSERT INTO resources (title, description, file_url, category) VALUES
(
  'FE Engineering CAP — Official Seat Matrix Portal',
  'Official State CET Cell portal where the provisional and final category-wise seat matrix is published for every CAP round of First Year Engineering admissions.',
  'https://fe2025.mahacet.org/',
  'Seat Matrix'
),
(
  'MHT-CET 2024 Engineering — CAP Round I Cutoff List',
  'Official cutoff list (Maharashtra & Minority seats) for CAP Round I of First Year Engineering admissions, 2024-25, published by the State CET Cell.',
  'https://fe2025.mahacet.org/2024/2024ENGG_CAP1_CutOff.pdf',
  'Previous Year Cutoffs'
),
(
  'MHT-CET 2024 Engineering — CAP Round III Cutoff List',
  'Official cutoff list (Maharashtra & Minority seats) for CAP Round III of First Year Engineering admissions, 2024-25, published by the State CET Cell.',
  'https://fe2025.mahacet.org/2024/2024ENGG_CAP3_CutOff.pdf',
  'Previous Year Cutoffs'
),
(
  'MHT-CET 2023 Engineering — CAP Round I Cutoff List',
  'Official cutoff list (Maharashtra & Minority seats) for CAP Round I of First Year Engineering admissions, 2023-24, useful for comparing year-on-year trends.',
  'https://fe2025.mahacet.org/2023/2023ENGG_CAP1_CutOff.pdf',
  'Previous Year Cutoffs'
),
(
  'FE Engineering Admissions 2025-26 — Information Brochure',
  'The official Information Brochure for admission to First Year Under Graduate and Post Graduate technical courses (Engineering & Technology) for A.Y. 2025-26, covering eligibility, the CAP process, reservations and document requirements.',
  'https://fe2025.mahacet.org/PublicPages/Information_Brochure_UG_PG_2025_26_Final_02_07_2025.pdf',
  'Exam Guidelines'
),
(
  'State CET Cell — Notices & Circulars (2024-2025)',
  'Government circulars, notices and schedules issued by the State CET Cell for the 2024-2025 admission cycle.',
  'https://cetcell.mahacet.org/2024-2025/',
  'Government Circulars'
),
(
  'State CET Cell — Official Website',
  'Home of the State Common Entrance Test Cell, Government of Maharashtra — the authoritative source for all MHT-CET exam and admission announcements.',
  'https://cetcell.mahacet.org/',
  'Others'
)
ON CONFLICT DO NOTHING;
