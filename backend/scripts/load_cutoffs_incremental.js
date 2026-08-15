/*
 * Additive loader for a single extra CAP round/year of cutoff data (e.g. the
 * first "live" round of a new admission cycle, published one round at a time
 * rather than as a complete 4-round archive).
 *
 * Unlike load_cutoffs.js, this NEVER truncates. It upserts into the shared
 * colleges/courses dimension tables (ON CONFLICT DO NOTHING — college_code
 * and choice_code are stable across years, so an existing row just gets
 * reused) and inserts into cutoffs tagged with the given --year, which the
 * table's UNIQUE (course_id, academic_year, cap_round, allotment_pool,
 * stage, category_code) constraint keeps fully separate from any other
 * year/round already loaded.
 *
 * Usage (from backend/):
 *   node scripts/load_cutoffs_incremental.js --dir ../scripts/parsed/round1_2026 --year 2026
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { bustCutoffsCache } = require('./lib/bustCutoffsCache');
const { isValidCutoffRow } = require('./lib/validateCutoffRow');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    out[key] = argv[i + 1];
  }
  return out;
}

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
  const { dir, year, round } = parseArgs(process.argv.slice(2));
  if (!dir || !year) {
    console.error('Usage: node scripts/load_cutoffs_incremental.js --dir <parsed-dir> --year <YYYY> [--round <N>]');
    process.exit(1);
  }
  const YEAR = Number(year);
  const ROUND = round ? Number(round) : null;
  const resolvedDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${dir} (resolved: ${resolvedDir})`);
    process.exit(1);
  }

  const colleges = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'colleges.json'), 'utf-8'));
  const courses = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'courses.json'), 'utf-8'));
  let cutoffs = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'cutoffs.json'), 'utf-8'));
  if (ROUND) cutoffs = cutoffs.filter((c) => c.cap_round === ROUND);

  console.log(`Loading academic_year=${YEAR} from ${resolvedDir}`);
  console.log(`colleges=${colleges.length} courses=${courses.length} cutoff_rows=${cutoffs.length}`);

  const client = new Client({ ...parseDbUrl(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected.');

  const before = {};
  for (const t of ['colleges', 'courses', 'cutoffs']) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    before[t] = rows[0].n;
  }
  const beforeYear = await client.query(
    'SELECT academic_year, count(*)::int AS n FROM cutoffs GROUP BY academic_year ORDER BY academic_year',
  );
  console.log('BEFORE — total rows:', before, '| cutoffs by year:',
    beforeYear.rows.map((r) => `${r.academic_year}=${r.n}`).join(' ') || '(none)');

  // ── colleges: reuse existing college_code rows, insert genuinely new ones ──
  await batchInsert(client, 'colleges',
    ['college_code', 'name', 'status', 'minority_type', 'minority_group', 'home_university', 'city', 'city_normalized'],
    colleges.map((c) => ({
      college_code: c.college_code, name: c.name, status: nz(c.status),
      minority_type: nz(c.minority_type), minority_group: nz(c.minority_group),
      home_university: nz(c.home_university), city: nz(c.city),
      city_normalized: c.city ? c.city.trim().toLowerCase() : null,
    })),
    'ON CONFLICT (college_code) DO NOTHING');

  // ── courses: reuse existing choice_code rows, insert genuinely new ones ──
  await batchInsert(client, 'courses',
    ['choice_code', 'college_code', 'course_name', 'branch_group'],
    courses.map((c) => ({
      choice_code: c.choice_code, college_code: c.college_code,
      course_name: c.course_name, branch_group: nz(c.branch_group),
    })),
    'ON CONFLICT (choice_code) DO NOTHING');

  // ── cutoffs (resolve course_id) — tagged with the given academic_year ──
  const idMap = new Map();
  for (const row of (await client.query('SELECT id, choice_code FROM courses')).rows) idMap.set(row.choice_code, row.id);
  let skipped = 0;
  let invalid = 0;
  const cutoffRows = cutoffs.map((c) => {
    const course_id = idMap.get(c.choice_code);
    if (!course_id) { skipped++; return null; }
    const row = {
      course_id, academic_year: YEAR, cap_round: c.cap_round,
      allotment_pool: c.allotment_pool, stage: c.stage, category_code: c.category_code,
      gender: nz(c.gender), category: nz(c.category), subquota: nz(c.subquota),
      closing_rank: c.closing_rank, closing_percentile: nz(c.closing_percentile),
    };
    if (!isValidCutoffRow(row)) { invalid++; return null; }
    return row;
  }).filter(Boolean);
  if (skipped) console.log(`WARN: ${skipped} cutoff rows had no matching course (skipped)`);
  if (invalid) console.log(`WARN: ${invalid} cutoff rows failed rank/percentile sanity checks (skipped)`);
  await batchInsert(client, 'cutoffs',
    ['course_id', 'academic_year', 'cap_round', 'allotment_pool', 'stage', 'category_code',
     'gender', 'category', 'subquota', 'closing_rank', 'closing_percentile'],
    cutoffRows, 'ON CONFLICT DO NOTHING');

  console.log('\n=== VERIFY ===');
  const after = {};
  for (const t of ['colleges', 'courses', 'cutoffs']) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    after[t] = rows[0].n;
    console.log(`  ${t}: ${before[t]} -> ${rows[0].n}`);
  }
  const afterYear = await client.query(
    'SELECT academic_year, cap_round, count(*)::int AS n FROM cutoffs GROUP BY academic_year, cap_round ORDER BY academic_year, cap_round',
  );
  console.log('  cutoffs by year/round:', afterYear.rows.map((r) => `${r.academic_year}R${r.cap_round}=${r.n}`).join(' '));
  await client.end();
  await bustCutoffsCache();
  console.log('\nDONE.');
})().catch((e) => { console.error('LOAD FAILED:', e.message); process.exit(1); });
