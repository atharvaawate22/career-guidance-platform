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
    await query(
      `INSERT INTO resources (title, description, file_url, category) VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12),
        ($13, $14, $15, $16),
        ($17, $18, $19, $20),
        ($21, $22, $23, $24),
        ($25, $26, $27, $28)`,
      [
        'FE Engineering CAP — Official Seat Matrix Portal',
        'Official State CET Cell portal where the provisional and final category-wise seat matrix is published for every CAP round of First Year Engineering admissions.',
        'https://fe2025.mahacet.org/',
        'Seat Matrix',

        'MHT-CET 2024 Engineering — CAP Round I Cutoff List',
        'Official cutoff list (Maharashtra & Minority seats) for CAP Round I of First Year Engineering admissions, 2024-25, published by the State CET Cell.',
        'https://fe2025.mahacet.org/2024/2024ENGG_CAP1_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2024 Engineering — CAP Round III Cutoff List',
        'Official cutoff list (Maharashtra & Minority seats) for CAP Round III of First Year Engineering admissions, 2024-25, published by the State CET Cell.',
        'https://fe2025.mahacet.org/2024/2024ENGG_CAP3_CutOff.pdf',
        'Previous Year Cutoffs',

        'MHT-CET 2023 Engineering — CAP Round I Cutoff List',
        'Official cutoff list (Maharashtra & Minority seats) for CAP Round I of First Year Engineering admissions, 2023-24, useful for comparing year-on-year trends.',
        'https://fe2025.mahacet.org/2023/2023ENGG_CAP1_CutOff.pdf',
        'Previous Year Cutoffs',

        'FE Engineering Admissions 2025-26 — Information Brochure',
        'The official Information Brochure for admission to First Year Under Graduate and Post Graduate technical courses (Engineering & Technology) for A.Y. 2025-26, covering eligibility, the CAP process, reservations and document requirements.',
        'https://fe2025.mahacet.org/PublicPages/Information_Brochure_UG_PG_2025_26_Final_02_07_2025.pdf',
        'Exam Guidelines',

        'State CET Cell — Notices & Circulars (2024-2025)',
        'Government circulars, notices and schedules issued by the State CET Cell for the 2024-2025 admission cycle.',
        'https://cetcell.mahacet.org/2024-2025/',
        'Government Circulars',

        'State CET Cell — Official Website',
        'Home of the State Common Entrance Test Cell, Government of Maharashtra — the authoritative source for all MHT-CET exam and admission announcements.',
        'https://cetcell.mahacet.org/',
        'Others',
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
