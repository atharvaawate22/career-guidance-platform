#!/usr/bin/env node
/**
 * Builds the CET Hub admission-guide PDFs from the HTML templates in this
 * folder, using the headless Chromium that Playwright installs for the
 * frontend e2e tests (no extra dependency).
 *
 *   node backend/scripts/guides/build-guides.mjs            # -> backend/scripts/guides/dist/*.pdf
 *
 * Output file names match the objects already in the Supabase "guides"
 * bucket, so upload-guides.mjs can replace them in place and every existing
 * Download link and download count keeps working.
 *
 * Content rule: every dated or numeric fact in a template must come from an
 * official notice (they are mirrored in the `updates` table). Write rules as
 * "in the 2026 cycle ..." plus "check this year's notice", never as timeless.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const requireFromFrontend = createRequire(join(repoRoot, 'frontend', 'package.json'));
const { chromium } = requireFromFrontend('@playwright/test');

import { GUIDES } from './guides-manifest.mjs';

const css = readFileSync(join(here, 'guide.css'), 'utf8');
const logo = readFileSync(join(repoRoot, 'frontend', 'public', 'new-logo.png')).toString('base64');
const logoSrc = `data:image/png;base64,${logo}`;

const footer = (title) => `
  <div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7.5pt;color:#64748b;padding:0 18mm;display:flex;justify-content:space-between;">
    <span>CET Hub · cethub.in</span><span>${title}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
const header = `
  <div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:8pt;color:#0f172a;padding:0 18mm;display:flex;align-items:center;gap:6px;">
    <img src="${logoSrc}" style="width:13px;height:13px;" /><b>CET Hub</b>
  </div>`;

const outDir = join(here, 'dist');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const g of GUIDES) {
    const html = readFileSync(join(here, g.template), 'utf8')
      .replace('/*{{CSS}}*/', css)
      .replaceAll('{{LOGO}}', logoSrc);
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: join(outDir, g.output),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: header,
      footerTemplate: footer(g.title),
    });
    console.log(`built ${g.output}`);
  }
} finally {
  await browser.close();
}
