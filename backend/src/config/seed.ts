import bcrypt from 'bcrypt';
import { query } from './database';
import logger from '../utils/logger';

/**
 * Seeds sample updates and FAQs when the tables are empty.
 * Only runs when shouldSeed is true (controlled by ENABLE_SAMPLE_SEED env).
 */
export async function runSampleSeed(): Promise<void> {
  const { rows } = await query('SELECT COUNT(*) FROM updates');
  if (parseInt(rows[0].count, 10) === 0) {
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
  if (parseInt(faqRows[0].count, 10) === 0) {
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

  const { rows: resourceRows } = await query('SELECT COUNT(*) FROM resources');
  if (parseInt(resourceRows[0].count, 10) === 0) {
    logger.info('Inserting official CET resources data');
    // Official State CET Cell (mahacet.org) documents for MHT-CET first year
    // engineering admissions. Portal subdomains are rotated each cycle
    // (fe2025 -> fe2026, ...), so these links should be refreshed every
    // admission season — admins can manage them from the Resources panel.
    // created_at is staggered (now() - N minutes) so the newer 2025 documents
    // sort above the 2024 ones (the Resources page orders by created_at DESC).
    await query(
      `INSERT INTO resources (title, description, file_url, category, created_at) VALUES
        ($1, $2, $3, $4, now() - interval '1 minute'),
        ($5, $6, $7, $8, now() - interval '2 minutes'),
        ($9, $10, $11, $12, now() - interval '3 minutes'),
        ($13, $14, $15, $16, now() - interval '4 minutes'),
        ($17, $18, $19, $20, now() - interval '5 minutes'),
        ($21, $22, $23, $24, now() - interval '6 minutes'),
        ($25, $26, $27, $28, now() - interval '7 minutes'),
        ($29, $30, $31, $32, now() - interval '8 minutes'),
        ($33, $34, $35, $36, now() - interval '9 minutes'),
        ($37, $38, $39, $40, now() - interval '10 minutes'),
        ($41, $42, $43, $44, now() - interval '11 minutes'),
        ($45, $46, $47, $48, now() - interval '12 minutes'),
        ($49, $50, $51, $52, now() - interval '13 minutes')`,
      [
        // ===== 2025 =====
        'Information Brochure 2025-26 — FE Engineering Admissions',
        'Official Information Brochure for First Year UG/PG technical course (Engineering & Technology) admissions, A.Y. 2025-26 — eligibility, CAP process, reservations and documents.',
        'https://fe2025.mahacet.org/PublicPages/Information_Brochure_UG_PG_2025_26_Final_02_07_2025.pdf',
        'Exam Guidelines',

        'CAP 2025-26 Admission Schedule Notice (B.E./B.Tech)',
        'Official admission notice and CAP schedule for B.E./B.Tech (4 Years) & Integrated M.E./M.Tech (5 Years) for A.Y. 2025-26, up to the merit list stage.',
        'https://cetcell.mahacet.org/wp-content/uploads/2023/12/BE-BTECH-CAP-AY-25-26-Schedule-Notice-Upto-Merit-List.pdf',
        'Government Circulars',

        'MHT-CET 2025 — Final Exam Schedule',
        'Official final time-table / schedule notice for the MHT-CET 2025 examination issued by the State CET Cell.',
        'https://cetcell.mahacet.org/wp-content/uploads/2023/12/CET-2025-Final-Schedule-.pdf',
        'Government Circulars',

        'CAP 2025-26 — Notices & Circulars Hub',
        'Official hub page for the 2025-26 Engineering CAP process, where all round-wise notices, circulars and schedules are published by the State CET Cell.',
        'https://cetcell.mahacet.org/cap-_2025-26/',
        'Government Circulars',

        'Seat Matrix & Round-wise Vacancy 2025-26 (Official Portal)',
        'Official FE 2025 portal where the provisional category-wise seat matrix and round-wise vacancy position (CAP Rounds I–IV) for Engineering admissions are published.',
        'https://fe2025.mahacet.org/',
        'Seat Matrix',

        'MHT-CET 2025 Engineering — CAP Round I Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round I, First Year Engineering admissions 2025-26.',
        'https://fe2025.mahacet.org/2025/2025ENGG_CAP1_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2025 Engineering — CAP Round II Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round II, First Year Engineering admissions 2025-26.',
        'https://fe2025.mahacet.org/2025/2025ENGG_CAP2_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2025 Engineering — CAP Round III Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round III, First Year Engineering admissions 2025-26.',
        'https://fe2025.mahacet.org/2025/2025ENGG_CAP3_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2025 Engineering — CAP Round IV Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round IV, First Year Engineering admissions 2025-26.',
        'https://fe2025.mahacet.org/2025/2025ENGG_CAP4_CutOff.pdf',
        'Previous Year Cutoffs',

        // ===== 2024 (cutoffs + seat matrix only) =====
        'MHT-CET 2024 Engineering — CAP Round I Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round I, First Year Engineering admissions 2024-25.',
        'https://fe2025.mahacet.org/2024/2024ENGG_CAP1_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2024 Engineering — CAP Round II Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round II, First Year Engineering admissions 2024-25.',
        'https://fe2025.mahacet.org/2024/2024ENGG_CAP2_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2024 Engineering — CAP Round III Cutoff (MH & Minority)',
        'Official cutoff list for Maharashtra & Minority seats, CAP Round III, First Year Engineering admissions 2024-25.',
        'https://fe2025.mahacet.org/2024/2024ENGG_CAP3_CutOff.pdf',
        'Previous Year Cutoffs',

        'Seat Matrix & Round-wise Vacancy 2024-25 (Official Portal)',
        'Official FE 2024 portal where the category-wise seat matrix and round-wise vacancy position for Engineering admissions 2024-25 are published.',
        'https://fe2024.mahacet.org/',
        'Seat Matrix',
      ],
    );
    logger.info('Official CET resources data inserted successfully');
  }
}

/**
 * Creates or updates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 * Re-hashes the password when the env value has changed so password rotation
 * works without manual DB intervention.
 */
export async function bootstrapAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.info(
      'Skipping admin user bootstrap (ADMIN_EMAIL and ADMIN_PASSWORD not set)',
    );
    return;
  }

  const { rows } = await query(
    'SELECT id, password_hash FROM admin_users WHERE email = $1',
    [adminEmail],
  );

  if (rows.length === 0) {
    logger.info(`Creating admin user: ${adminEmail}`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await query(
      'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3)',
      [adminEmail, passwordHash, 'admin'],
    );
    logger.info(`Admin user created: ${adminEmail}`);
  } else {
    // Re-hash and update if the env password has changed.
    const isMatch = await bcrypt.compare(
      adminPassword,
      rows[0].password_hash,
    );
    if (!isMatch) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
        [passwordHash, rows[0].id],
      );
      logger.info(`Admin password updated: ${adminEmail}`);
    }
  }
}
