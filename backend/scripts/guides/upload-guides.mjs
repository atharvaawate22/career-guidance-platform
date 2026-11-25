#!/usr/bin/env node
/**
 * Uploads the built guide PDFs (dist/) over the existing objects in the
 * Supabase "guides" storage bucket. Same object names, so every Download
 * button and the guides table's file_url keep working, and download counts
 * (guide_downloads) are untouched.
 *
 *   node backend/scripts/guides/build-guides.mjs
 *   node backend/scripts/guides/upload-guides.mjs
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from backend/.env (never
 * printed). The previous versions are kept in ./archive for rollback: upload
 * an archived file under the same object name to restore it.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { GUIDES_OUTPUTS } from './guides-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
const base = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in backend/.env');
  process.exit(1);
}

for (const name of GUIDES_OUTPUTS) {
  const body = readFileSync(join(here, 'dist', name));
  const res = await fetch(`${base.replace(/\/$/, '')}/storage/v1/object/guides/${name}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      'content-type': 'application/pdf',
      'x-upsert': 'true',
      // Short browser/CDN cache so a corrected guide reaches students quickly.
      'cache-control': 'max-age=300',
    },
    body,
  });
  const text = await res.text();
  console.log(`${res.ok ? 'uploaded' : 'FAILED  '} ${name} (${body.length} bytes) -> HTTP ${res.status}${res.ok ? '' : ` ${text.slice(0, 200)}`}`);
  if (!res.ok) process.exitCode = 1;
}
