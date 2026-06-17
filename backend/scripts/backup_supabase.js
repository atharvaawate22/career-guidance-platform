/*
 * One-off logical backup of the current Supabase `public` schema (DATA ONLY).
 *
 * Schema DDL is already version-controlled in backend/src/config/schema.sql and
 * backend/migrations/. This script captures the live row data so we have a
 * restore point before rebuilding the cutoffs tables.
 *
 * SECURITY: the output contains PII (bookings: names/emails/phones) and
 * password hashes (admin_users). It is written under repo `backups/`, which is
 * gitignored. Do not commit it or move it into a tracked path.
 *
 * Run from the backend/ directory:  node scripts/backup_supabase.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

// Parse DATABASE_URL by splitting on the LAST '@' so a literal '@' in the
// password (as in this project's password) does not corrupt host parsing.
function parseDbUrl(url) {
  const noScheme = url.replace(/^postgres(ql)?:\/\//, '');
  const lastAt = noScheme.lastIndexOf('@');
  const userInfo = noScheme.slice(0, lastAt);
  const hostInfo = noScheme.slice(lastAt + 1);
  const ci = userInfo.indexOf(':');
  const user = decodeURIComponent(userInfo.slice(0, ci));
  const password = userInfo.slice(ci + 1); // keep literal; may contain @ : etc.
  const slash = hostInfo.indexOf('/');
  const hostPort = hostInfo.slice(0, slash);
  const database = hostInfo.slice(slash + 1).split('?')[0];
  const colon = hostPort.lastIndexOf(':');
  const host = hostPort.slice(0, colon);
  const port = Number(hostPort.slice(colon + 1));
  return { host, port, user, password, database };
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in backend/.env');
    process.exit(1);
  }
  const cfg = parseDbUrl(process.env.DATABASE_URL);
  const client = new Client({ ...cfg, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log(`Connected to ${cfg.host} / ${cfg.database}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '..', '..', 'backups', `supabase-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const tables = (
    await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    )
  ).rows.map((r) => r.tablename);

  const manifest = {
    createdAt: new Date().toISOString(),
    host: cfg.host,
    database: cfg.database,
    note: 'Data-only backup. Schema lives in backend/src/config/schema.sql + migrations/.',
    tables: {},
  };

  console.log('\nDumping tables:');
  for (const t of tables) {
    const res = await client.query(`SELECT * FROM "${t}"`);
    fs.writeFileSync(
      path.join(outDir, `${t}.json`),
      JSON.stringify(res.rows, null, 2),
    );
    manifest.tables[t] = res.rowCount;
    console.log(`  ${t.padEnd(22)} ${res.rowCount} rows`);
  }

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  await client.end();
  console.log(`\nBackup complete → ${outDir}`);
})().catch((e) => {
  console.error('BACKUP FAILED:', e.message);
  process.exit(1);
});
