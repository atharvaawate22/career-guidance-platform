/*
 * Reconcile course names after a parser fix: update courses.course_name and
 * branch_group from the freshly re-parsed data, matched by choice_code.
 *
 * Touches ONLY rows whose name/branch_group actually changed — no TRUNCATE,
 * no change to the cutoffs table. Safe to run against the live database.
 *
 * Run from backend/:  node scripts/reconcile_course_names.js
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

(async () => {
  const client = new Client({
    ...parseDbUrl(process.env.DATABASE_URL),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const PARSED = path.join(__dirname, '..', '..', 'scripts', 'parsed');
  const merged = new Map();
  for (let r = 1; r <= 4; r++) {
    const f = path.join(PARSED, `round${r}`, 'courses.json');
    if (!fs.existsSync(f)) continue;
    for (const c of JSON.parse(fs.readFileSync(f, 'utf-8'))) {
      if (!merged.has(c.choice_code)) merged.set(c.choice_code, c);
    }
  }
  console.log(`Parsed courses merged across rounds: ${merged.size}`);

  let updated = 0;
  const samples = [];
  for (const c of merged.values()) {
    const res = await client.query(
      `UPDATE courses
       SET course_name = $2, branch_group = $3
       WHERE choice_code = $1
         AND (course_name IS DISTINCT FROM $2 OR branch_group IS DISTINCT FROM $3)
       RETURNING choice_code`,
      [c.choice_code, c.course_name, c.branch_group || null],
    );
    if (res.rowCount > 0) {
      updated += res.rowCount;
      if (samples.length < 15) samples.push(`${c.choice_code} -> ${c.branch_group}`);
    }
  }
  console.log(`Updated ${updated} course row(s).`);
  samples.forEach((s) => console.log('  ', s));

  const sus = await client.query(
    `SELECT branch_group, count(*) n FROM courses
     WHERE branch_group ~ '[0-9]' OR length(branch_group) <= 6
        OR (branch_group LIKE '%(%' AND branch_group NOT LIKE '%)%')
        OR (branch_group LIKE '%)%' AND branch_group NOT LIKE '%(%')
     GROUP BY branch_group ORDER BY branch_group`,
  );
  console.log('\nRemaining flagged branch_groups:', sus.rows);

  await client.end();
  console.log('\nRECONCILE DONE');
})().catch((e) => {
  console.error('RECONCILE FAILED:', e.message);
  process.exit(1);
});
