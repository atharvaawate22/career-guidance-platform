/*
 * Additively load a parsed AI-quota (or any incremental) cutoff round into the
 * existing colleges/courses/cutoffs tables WITHOUT truncating anything.
 *
 * - colleges: upsert on college_code, filling only blank fields (never
 *   overwrites existing non-blank data).
 * - courses: insert new choice_codes, ON CONFLICT DO NOTHING (existing
 *   courses already have correct name/branch_group from prior loads).
 * - cutoffs: insert with the given academic_year, resolving course_id via
 *   choice_code, ON CONFLICT DO NOTHING (matches the table's unique
 *   constraint so re-runs are safe/idempotent).
 *
 * Run from backend/:
 *   node scripts/load_ai_cutoffs_additive.js <parsedDir> <academicYear>
 * e.g.
 *   node scripts/load_ai_cutoffs_additive.js ../scripts/parsed/round1_2026_ai 2026
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

function parseDbUrl(url) {
  const noScheme = url.replace(/^postgres(ql)?:\/\//, '');
  const lastAt = noScheme.lastIndexOf('@');
  const userInfo = noScheme.slice(0, lastAt);
  const hostInfo = noScheme.slice(lastAt + 1);
  const ci = userInfo.indexOf(':');
  const user = decodeURIComponent(userInfo.slice(0, ci));
  const password = userInfo.slice(ci + 1);
  const slash = hostInfo.indexOf('/');
  const hostPort = hostInfo.slice(0, slash);
  const database = hostInfo.slice(slash + 1).split('?')[0];
  const colon = hostPort.lastIndexOf(':');
  return { host: hostPort.slice(0, colon), port: Number(hostPort.slice(colon + 1)),
           user, password, database };
}

const nz = (v) => (v === '' || v === undefined ? null : v);

async function batchInsert(client, table, cols, rows, conflict = '') {
  const B = 1000;
  let done = 0;
  for (let i = 0; i < rows.length; i += B) {
    const chunk = rows.slice(i, i + B);
    const params = [];
    const tuples = chunk.map((r, ri) => {
      const ph = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`);
      cols.forEach((c) => params.push(r[c]));
      return `(${ph.join(',')})`;
    });
    await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples.join(',')} ${conflict}`,
      params,
    );
    done += chunk.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  if (rows.length) process.stdout.write('\n');
}

(async () => {
  const parsedDir = process.argv[2];
  const year = Number(process.argv[3]);
  if (!parsedDir || !year) {
    console.error('Usage: node scripts/load_ai_cutoffs_additive.js <parsedDir> <academicYear>');
    process.exit(1);
  }
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(parsedDir, f), 'utf-8'));
  const colleges = rd('colleges.json');
  const courses = rd('courses.json');
  const cutoffs = rd('cutoffs.json');
  console.log(`loaded from disk: ${colleges.length} colleges, ${courses.length} courses, ${cutoffs.length} cutoff rows (year=${year})`);

  const client = new Client({ ...parseDbUrl(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected.');

  const { rows: beforeCounts } = await client.query(
    "SELECT (SELECT count(*)::int FROM colleges) AS colleges, (SELECT count(*)::int FROM courses) AS courses, (SELECT count(*)::int FROM cutoffs) AS cutoffs"
  );
  console.log('before:', beforeCounts[0]);

  // ── colleges: upsert, filling only blanks ─────────────────────────────
  await batchInsert(client, 'colleges',
    ['college_code', 'name', 'status', 'minority_type', 'minority_group', 'home_university', 'city', 'city_normalized'],
    colleges.map((c) => ({
      college_code: c.college_code, name: c.name, status: nz(c.status),
      minority_type: nz(c.minority_type), minority_group: nz(c.minority_group),
      home_university: nz(c.home_university), city: nz(c.city),
      city_normalized: c.city ? c.city.trim().toLowerCase() : null,
    })),
    `ON CONFLICT (college_code) DO UPDATE SET
       name             = COALESCE(colleges.name, EXCLUDED.name),
       status           = COALESCE(colleges.status, EXCLUDED.status),
       minority_type    = COALESCE(colleges.minority_type, EXCLUDED.minority_type),
       minority_group   = COALESCE(colleges.minority_group, EXCLUDED.minority_group),
       home_university  = COALESCE(colleges.home_university, EXCLUDED.home_university),
       city             = COALESCE(colleges.city, EXCLUDED.city),
       city_normalized  = COALESCE(colleges.city_normalized, EXCLUDED.city_normalized)`);

  // ── courses: insert new, skip existing ─────────────────────────────────
  await batchInsert(client, 'courses',
    ['choice_code', 'college_code', 'course_name', 'branch_group'],
    courses.map((c) => ({
      choice_code: c.choice_code, college_code: c.college_code,
      course_name: c.course_name, branch_group: nz(c.branch_group),
    })),
    'ON CONFLICT (choice_code) DO NOTHING');

  // ── cutoffs: resolve course_id, insert new rows for this year ──────────
  const idMap = new Map();
  for (const row of (await client.query('SELECT id, choice_code FROM courses')).rows) idMap.set(row.choice_code, row.id);
  let skipped = 0;
  const cutoffRows = cutoffs.map((c) => {
    const course_id = idMap.get(c.choice_code);
    if (!course_id) { skipped++; return null; }
    return {
      course_id, academic_year: year, cap_round: c.cap_round,
      allotment_pool: c.allotment_pool, stage: c.stage, category_code: c.category_code,
      gender: nz(c.gender), category: nz(c.category), subquota: nz(c.subquota),
      closing_rank: c.closing_rank, closing_percentile: nz(c.closing_percentile),
    };
  }).filter(Boolean);
  if (skipped) console.log(`WARN: ${skipped} cutoff rows had no matching course (skipped)`);
  await batchInsert(client, 'cutoffs',
    ['course_id', 'academic_year', 'cap_round', 'allotment_pool', 'stage', 'category_code',
     'gender', 'category', 'subquota', 'closing_rank', 'closing_percentile'],
    cutoffRows, 'ON CONFLICT DO NOTHING');

  console.log('\n=== VERIFY ===');
  for (const t of ['colleges', 'courses', 'cutoffs']) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    console.log(`  ${t}: ${rows[0].n}`);
  }
  const perYearRound = await client.query('SELECT academic_year, cap_round, count(*)::int AS n FROM cutoffs GROUP BY academic_year, cap_round ORDER BY academic_year, cap_round');
  console.log('  cutoffs by year/round:', perYearRound.rows.map((r) => `${r.academic_year}R${r.cap_round}=${r.n}`).join(' '));
  await client.end();
  console.log('\nDONE.');
})().catch((e) => { console.error('LOAD FAILED:', e.message); process.exit(1); });
