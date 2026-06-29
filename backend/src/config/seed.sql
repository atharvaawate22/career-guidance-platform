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
-- created_at is staggered (now() - N minutes) so the newer 2025 documents sort
-- above the 2024 ones (the Resources page orders by created_at DESC).
INSERT INTO resources (title, description, file_url, category, created_at) VALUES
-- ===== 2025 =====
(
  'Information Brochure 2025-26 — FE Engineering Admissions',
  'Official Information Brochure for First Year UG/PG technical course (Engineering & Technology) admissions, A.Y. 2025-26 — eligibility, CAP process, reservations and documents.',
  'https://fe2025.mahacet.org/PublicPages/Information_Brochure_UG_PG_2025_26_Final_02_07_2025.pdf',
  'Exam Guidelines',
  now() - interval '1 minute'
),
(
  'CAP 2025-26 Admission Schedule Notice (B.E./B.Tech)',
  'Official admission notice and CAP schedule for B.E./B.Tech (4 Years) & Integrated M.E./M.Tech (5 Years) for A.Y. 2025-26, up to the merit list stage.',
  'https://cetcell.mahacet.org/wp-content/uploads/2023/12/BE-BTECH-CAP-AY-25-26-Schedule-Notice-Upto-Merit-List.pdf',
  'Government Circulars',
  now() - interval '2 minutes'
),
(
  'MHT-CET 2025 — Final Exam Schedule',
  'Official final time-table / schedule notice for the MHT-CET 2025 examination issued by the State CET Cell.',
  'https://cetcell.mahacet.org/wp-content/uploads/2023/12/CET-2025-Final-Schedule-.pdf',
  'Government Circulars',
  now() - interval '3 minutes'
),
(
  'CAP 2025-26 — Notices & Circulars Hub',
  'Official hub page for the 2025-26 Engineering CAP process, where all round-wise notices, circulars and schedules are published by the State CET Cell.',
  'https://cetcell.mahacet.org/cap-_2025-26/',
  'Government Circulars',
  now() - interval '4 minutes'
),
(
  'Seat Matrix & Round-wise Vacancy 2025-26 (Official Portal)',
  'Official FE 2025 portal where the provisional category-wise seat matrix and round-wise vacancy position (CAP Rounds I–IV) for Engineering admissions are published.',
  'https://fe2025.mahacet.org/',
  'Seat Matrix',
  now() - interval '5 minutes'
),
(
  'MHT-CET 2025 Engineering — CAP Round I Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round I, First Year Engineering admissions 2025-26.',
  'https://fe2025.mahacet.org/2025/2025ENGG_CAP1_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '6 minutes'
),
(
  'MHT-CET 2025 Engineering — CAP Round II Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round II, First Year Engineering admissions 2025-26.',
  'https://fe2025.mahacet.org/2025/2025ENGG_CAP2_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '7 minutes'
),
(
  'MHT-CET 2025 Engineering — CAP Round III Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round III, First Year Engineering admissions 2025-26.',
  'https://fe2025.mahacet.org/2025/2025ENGG_CAP3_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '8 minutes'
),
(
  'MHT-CET 2025 Engineering — CAP Round IV Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round IV, First Year Engineering admissions 2025-26.',
  'https://fe2025.mahacet.org/2025/2025ENGG_CAP4_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '9 minutes'
),
-- ===== 2024 (cutoffs + seat matrix only) =====
(
  'MHT-CET 2024 Engineering — CAP Round I Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round I, First Year Engineering admissions 2024-25.',
  'https://fe2025.mahacet.org/2024/2024ENGG_CAP1_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '10 minutes'
),
(
  'MHT-CET 2024 Engineering — CAP Round II Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round II, First Year Engineering admissions 2024-25.',
  'https://fe2025.mahacet.org/2024/2024ENGG_CAP2_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '11 minutes'
),
(
  'MHT-CET 2024 Engineering — CAP Round III Cutoff (MH & Minority)',
  'Official cutoff list for Maharashtra & Minority seats, CAP Round III, First Year Engineering admissions 2024-25.',
  'https://fe2025.mahacet.org/2024/2024ENGG_CAP3_CutOff.pdf',
  'Previous Year Cutoffs',
  now() - interval '12 minutes'
),
(
  'Seat Matrix & Round-wise Vacancy 2024-25 (Official Portal)',
  'Official FE 2024 portal where the category-wise seat matrix and round-wise vacancy position for Engineering admissions 2024-25 are published.',
  'https://fe2024.mahacet.org/',
  'Seat Matrix',
  now() - interval '13 minutes'
)
ON CONFLICT DO NOTHING;
