# Free-tier performance & capacity guide

**Date:** 2026-06-15
**Stack:** Vercel (frontend) · Render (backend + Redis) · Supabase (Postgres) — all **free** plans.

This document explains where the platform breaks on the current free hosting,
what was changed in the codebase to fit those constraints, and the **dashboard
steps you still need to do** (which cannot live in the repo).

---

## 1. Where it actually breaks on free tier

The capacity ceiling here is **nothing like a normal server**. The real limits:

| Break point | Reality |
|---|---|
| **Cold start (the #1 issue)** | Render free sleeps after ~15 min idle. The next visitor waits **30-60s** for a cold boot. At sporadic traffic this is your "site is broken" experience, at *any* traffic level. |
| **Concurrent uncached queries** | Render free is **0.1 CPU / 512 MB**. Realistically **~10-30 simultaneous** uncached cutoffs/predictor queries before timeouts — not hundreds. |
| **Concurrent cached reads** | A Redis hit skips Postgres entirely, so cache hit rate is everything. With the cache warm the single small process can still push a few hundred cached responses in bursts. |
| **Supabase** | ~**5 GB egress/month**, ~**500 MB** DB, and it **pauses after 7 days** of zero activity. Slow-burn limits, not spikes. |
| **Render Redis** | ~**25 MB**. Fine for cached JSON with TTLs; do not treat it as durable storage. |

**Bottom line:** 10k users/day spread out is fine. The thing that makes it *feel*
broken is cold starts; the thing that caps a traffic *spike* is the 0.1-CPU
backend plus uncached DB queries. Both are addressed below.

> Vercel Hobby is for **non-commercial** use per its ToS. `cethub.in` as a real
> product may need the Pro plan eventually — a billing/compliance note, not a
> performance one.

---

## 2. What was changed in the codebase (already done)

| # | Change | File | Why |
|---|---|---|---|
| 1 | **Public-read CDN/browser caching** — `Cache-Control` headers on all public GET endpoints (cutoffs, faqs, guides, resources, updates, settings, booking slots). | `backend/src/middleware/cacheControl.ts`, `backend/src/server.ts` | Lets browsers and any CDN serve repeat reads without waking/loading the small Render instance. Biggest lever for both latency and capacity. Only 2xx GETs are cached; mutations and errors never are. |
| 2 | **PM2 cluster mode removed** — `instances: 'max'` → `1`, `cluster` → `fork`, memory cap `500M` → `450M`. | `backend/ecosystem.config.js` | On a 512 MB box, `max` forks one Node process per detected host core and OOM-loops. One process is correct for 0.1 CPU. |
| 3 | **DB pool default lowered** — `DB_POOL_MAX` default `20` → `5`. | `backend/src/config/database.ts` | A big pool gains nothing on one low-CPU process and risks exhausting Supabase's connection allowance. Still overridable via env. |
| 4 | **Keep-warm** — Supabase `pg_cron` (primary) pings Render `/health`; GitHub Action pings `/api/v1/health` every ~10 min as a secondary backup. | Supabase `pg_cron` job, `.github/workflows/keepalive.yml` | Reduces cold starts without depending solely on GitHub Actions' best-effort scheduling. |

Cutoffs were **already** Redis-cached server-side (6h TTL) — that stays the
source of truth; the new headers just push that data closer to the user.

---

## 3. What you must do in the dashboards (not in the repo)

### A. Confirm the Render start command
Render → your service → **Settings → Start Command** should be:
```
node dist/server.js
```
Do **not** use the PM2 `start:prod` script on Render — PM2 is only for a
self-managed VPS. (The build command stays `npm install && npm run build`.)

### B. Use the Supabase **connection pooler** (not the direct connection)
Supabase → **Project Settings → Database → Connection string → "Transaction"
pooler** (port `6543`). Set Render's `DATABASE_URL` env var to that string.

- The transaction pooler multiplexes many app connections over a few real
  Postgres ones — exactly what a connection-limited free DB needs.
- This codebase is already compatible: it deliberately avoids named prepared
  statements (see the comment in `cutoffs.repository.ts`), which is the one
  thing the transaction pooler does not support.

### C. Set the backend env vars (Render → Environment)
| Var | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | *Supabase transaction-pooler URL* | from step B |
| `REDIS_URL` | *Render Redis internal URL* | enables the cache + cross-safe rate limiting |
| `JWT_SECRET` | *32+ char random string* | startup aborts if shorter in production |
| `FRONTEND_URL` | `https://cethub.in` (+ any other origins, comma-separated) | CORS allowlist |
| `DB_POOL_MAX` | leave unset (uses `5`) | only raise if you upgrade the instance |
| `TRUST_PROXY` | `1` | Render terminates TLS at a proxy |

### D. Prevent cold starts
The **primary** keep-warm mechanism is a Supabase `pg_cron` job that pings
the Render `/health` endpoint on a schedule during active hours — it lives
in Supabase, not in this repo, so it keeps running independent of GitHub
Actions availability/quotas. `.github/workflows/keepalive.yml` (pings
`/api/v1/health` every ~10 min) is a **secondary backup**, not the primary
mechanism — its own header comment documents this. UptimeRobot remains an
option if you want a third, fully external monitor, but isn't required
since pg_cron already covers it:
1. **Supabase `pg_cron`** (primary, already configured): pings Render's
   `/health` endpoint on a schedule, windowed to active hours.
2. **The bundled GitHub Action** (secondary backup, zero-setup): set a
   repository variable `BACKEND_HEALTH_URL` to
   `https://<your-app>.onrender.com/api/v1/health` (repo → Settings →
   Secrets and variables → Actions → Variables). Note GitHub cron is
   best-effort and may lag.
3. **UptimeRobot** (optional third layer): a free HTTP(s) monitor on the
   same health URL at a 5-minute interval.

> Keeping the instance awake 24/7 uses ~720 of Render's 750 free hours/month —
> fine for **one** web service only.

### E. Stop Supabase from auto-pausing
Supabase free pauses after 7 days of no activity. The keep-warm pings touch
the DB (`SELECT 1`), so as long as **D** is running, the DB stays active
too. If you ever disable all pingers, add a daily query instead.

---

## 4. Optional next step (bigger win, not yet done)

**Move public reads onto Vercel's edge.** Today the browser calls Render
directly. If you instead proxy public GETs through Next.js route handlers with
`export const revalidate = <seconds>` (or add `s-maxage` and let Vercel cache),
most read traffic is served from Vercel's CDN and **never touches Render at
all** — cold starts stop mattering for reads entirely.

This was intentionally **not** done automatically because it changes the
frontend's data-fetching layer and needs testing against each page. It is the
recommended next investment if read traffic grows. The `Cache-Control` headers
added in §2 already make the responses cache-ready for whenever you do it.

---

## 5. Realistic expectation after these changes

- **Cold starts:** largely eliminated during active hours (via D).
- **Repeat reads:** served from browser/CDN cache, near-instant, zero backend load.
- **Cutoffs/FAQs spikes:** absorbed by Redis + HTTP caching; the DB sees a
  trickle.
- **Hard ceiling unchanged:** a burst of *uncached, unique* queries is still
  capped by the 0.1-CPU backend (~10-30 concurrent). The fix for that is a paid
  instance, not config — but caching means you reach it far less often.
