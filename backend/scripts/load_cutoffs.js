/*
 * Create the normalized cutoffs schema in Supabase and load all 4 CAP rounds
 * from scripts/parsed/round{1..4}/*.json (produced by scripts/parse_cutoffs_v2.py).
 *
 * Idempotent: creates tables IF NOT EXISTS, then TRUNCATEs the three NEW tables
 * and reloads. It NEVER touches the existing tables (cutoff_data, bookings, …).
 *
 * Run from backend/:  node scripts/load_cutoffs.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const YEAR = 2025;
const PARSED_DIR = path.join(__dirname, '..', '..', 'scripts', 'parsed');

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

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS colleges (
  college_code     TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  status           TEXT,
  minority_type    TEXT,
  minority_group   TEXT,
  home_university  TEXT,
  city             TEXT,
  city_normalized  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colleges_city_norm ON colleges(city_normalized);
CREATE INDEX IF NOT EXISTS idx_colleges_minority  ON colleges(minority_type, minority_group);

CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choice_code   TEXT NOT NULL UNIQUE,
  college_code  TEXT NOT NULL REFERENCES colleges(college_code) ON DELETE CASCADE,
  course_name   TEXT NOT NULL,
  branch_group  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_college   ON courses(college_code);
CREATE INDEX IF NOT EXISTS idx_courses_branch    ON courses(branch_group);
CREATE INDEX IF NOT EXISTS idx_courses_name_trgm ON courses USING gin (course_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS cutoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year       SMALLINT NOT NULL,
  cap_round           SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
  allotment_pool      TEXT NOT NULL,
  stage               TEXT NOT NULL,
  category_code       TEXT NOT NULL,
  gender              TEXT,
  category            TEXT,
  subquota            TEXT,
  closing_rank        INTEGER,
  closing_percentile  NUMERIC(10,7),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, academic_year, cap_round, allotment_pool, stage, category_code)
);
CREATE INDEX IF NOT EXISTS idx_cutoffs_predict
  ON cutoffs (academic_year, cap_round, category, gender, closing_rank)
  INCLUDE (closing_percentile);
CREATE INDEX IF NOT EXISTS idx_cutoffs_course ON cutoffs (course_id);

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutoffs  ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='colleges' AND policyname='colleges_public_read')
    THEN CREATE POLICY colleges_public_read ON colleges FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='courses' AND policyname='courses_public_read')
    THEN CREATE POLICY courses_public_read ON courses FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cutoffs' AND policyname='cutoffs_public_read')
    THEN CREATE POLICY cutoffs_public_read ON cutoffs FOR SELECT USING (true); END IF;
END $$;
`;

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
  const client = new Client({ ...parseDbUrl(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected. Creating schema…');
  await client.query(DDL);
  await client.query('TRUNCATE cutoffs, courses, colleges RESTART IDENTITY CASCADE');

  // ── merge dimensions across rounds ──────────────────────────────────────
  const colleges = new Map();
  const courses = new Map();
  const cutoffs = [];
  for (let r = 1; r <= 4; r++) {
    const dir = path.join(PARSED_DIR, `round${r}`);
    if (!fs.existsSync(dir)) { console.log(`(round ${r} missing, skipping)`); continue; }
    const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    for (const c of rd('colleges.json')) {
      const ex = colleges.get(c.college_code);
      if (!ex) colleges.set(c.college_code, c);
      else for (const k of Object.keys(c)) if (!ex[k] && c[k]) ex[k] = c[k];
    }
    for (const c of rd('courses.json')) if (!courses.has(c.choice_code)) courses.set(c.choice_code, c);
    for (const c of rd('cutoffs.json')) cutoffs.push(c);
    console.log(`round ${r}: loaded JSON`);
  }
  console.log(`merged: ${colleges.size} colleges, ${courses.size} courses, ${cutoffs.length} cutoff rows`);

  // ── colleges ────────────────────────────────────────────────────────────
  await batchInsert(client, 'colleges',
    ['college_code', 'name', 'status', 'minority_type', 'minority_group', 'home_university', 'city', 'city_normalized'],
    [...colleges.values()].map((c) => ({
      college_code: c.college_code, name: c.name, status: nz(c.status),
      minority_type: nz(c.minority_type), minority_group: nz(c.minority_group),
      home_university: nz(c.home_university), city: nz(c.city),
      city_normalized: c.city ? c.city.trim().toLowerCase() : null,
    })));

  // ── courses ─────────────────────────────────────────────────────────────
  await batchInsert(client, 'courses',
    ['choice_code', 'college_code', 'course_name', 'branch_group'],
    [...courses.values()].map((c) => ({
      choice_code: c.choice_code, college_code: c.college_code,
      course_name: c.course_name, branch_group: nz(c.branch_group),
    })));

  // ── cutoffs (resolve course_id) ─────────────────────────────────────────
  const idMap = new Map();
  for (const row of (await client.query('SELECT id, choice_code FROM courses')).rows) idMap.set(row.choice_code, row.id);
  let skipped = 0;
  const cutoffRows = cutoffs.map((c) => {
    const course_id = idMap.get(c.choice_code);
    if (!course_id) { skipped++; return null; }
    return {
      course_id, academic_year: YEAR, cap_round: c.cap_round,
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

  // ── verify ──────────────────────────────────────────────────────────────
  console.log('\n=== VERIFY ===');
  for (const t of ['colleges', 'courses', 'cutoffs']) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    console.log(`  ${t}: ${rows[0].n}`);
  }
  const perRound = await client.query('SELECT cap_round, count(*)::int AS n FROM cutoffs GROUP BY cap_round ORDER BY cap_round');
  console.log('  cutoffs by round:', perRound.rows.map((r) => `R${r.cap_round}=${r.n}`).join(' '));
  await client.end();
  console.log('\nDONE.');
})().catch((e) => { console.error('LOAD FAILED:', e.message); process.exit(1); });
