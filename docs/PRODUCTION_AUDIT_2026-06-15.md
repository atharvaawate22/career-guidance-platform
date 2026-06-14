# Production Readiness & Code Audit
**Date:** 2026-06-15
**Audited by:** Senior engineering review
**Overall status:** NEAR-READY — strong foundations; remaining items are polish/consistency, not blockers.
**Supersedes context from:** [`PRODUCTION_AUDIT.md`](./PRODUCTION_AUDIT.md) (2026-05-20). Many issues in that report have since been fixed (see §6).

---

## Scope & method

Full read of the backend (`backend/src`, ~70 files) including every middleware,
route, controller, service, repository, config, and util; the security/
infrastructure-critical frontend (auth/login, API client, session hook, Next
config, root layout); database schema and migrations; tests; CI; and docs. The
presentation-layer React pages and per-domain `*Tab.tsx` components were sampled
rather than read line-by-line, as they share consistent, low-risk patterns.

Verified live on 2026-06-15:

- Backend `tsc --noEmit` — **passes**
- Frontend `tsc --noEmit` and `next build` — **passes** (22 routes generated)
- Backend tests — **7 files / 45 tests, all passing**
- Working tree clean; no committed secrets; `.gitignore` comprehensive

---

## Summary scorecard

| Area | Status | Notes |
|---|---|---|
| Security | Good | Strong auth/CSRF/headers/validation. One obscurity-not-security item + minor hardening. |
| Database | Good | `TIMESTAMPTZ` throughout, FK cascade, RLS, solid composite/trigram indexes. |
| API design | Mostly good | Response-envelope inconsistency on a few infra/discovery endpoints (cosmetic). |
| Code quality | Strong | Clean layering, no TODO/FIXME debt, near-zero `any`/`@ts-ignore`. |
| Tests | Adequate | Core logic covered; coverage tooling absent; no CORS/rate-limit/e2e-auth tests. |
| Frontend UX robustness | Improved (this session) | `error.tsx` / `global-error.tsx` / route `loading.tsx` added. |
| DevOps | Good | CI gates both apps; PM2 config present; deployment runbook exists. |

---

## 1. Security

### Strengths
- Auth: HttpOnly session cookie + Bearer fallback, bcrypt verification, env-driven
  `JWT_SECRET` with a **production length check that aborts startup** if `< 32`
  chars (`server.ts`), configurable expiry.
- CSRF: double-submit pattern with **`crypto.timingSafeEqual`** (`csrfMiddleware.ts`),
  applied to every mutating admin route.
- All admin routes uniformly protected (`authMiddleware` → `requireAdminRole` →
  `verifyCsrfToken`); contract tests confirm 401 when unauthenticated.
- No SQL injection: every repository uses parameterized queries; dynamic
  `WHERE`/`SET` clauses interpolate only fixed column whitelists and placeholders.
- File upload hardened: extension + MIME whitelist + **magic-byte signature
  verification** + path-traversal rejection + bucket whitelist (`admin.routes.ts`).
- Security headers everywhere (Helmet CSP/HSTS/nosniff/frame-options on API; Next
  headers + `poweredByHeader:false`). CORS is an explicit `FRONTEND_URL` allowlist.
- Log PII redaction (`authorization`/`password`/`email`/`phone`).

### Issues (by severity)
- **Medium — "hidden admin login secret" is obscurity, not security.**
  `admin/login/page.tsx` gates the login *page* on `NEXT_PUBLIC_ADMIN_LOGIN_SECRET`,
  which is compiled into the client bundle and only swaps in a fake 404. The real
  `POST /api/v1/admin/login` endpoint stays reachable. Fine as a scanner deterrent;
  must not be treated as an access boundary. Use a server-side gate / IP allowlist
  if real page-hiding is wanted.
- **Low — login user-enumeration timing side-channel.** `auth.service.ts` returns
  immediately when the email is unknown but runs `bcrypt.compare` (~100ms) when it
  exists. Mitigate with a dummy compare on the not-found path.
- **Low — CSRF cookie uses `SameSite=None` in production** (cross-origin hosting),
  so CSRF protection rests entirely on the double-submit token — done correctly,
  but load-bearing.

---

## 2. Production / deployment readiness

### Strengths
- Graceful shutdown with connection draining + 15s forced-exit fallback (SIGTERM/SIGINT).
- Health (`/health`) vs readiness (`/ready`) split; readiness validates required
  env vars and migration count.
- Degraded-mode startup (serves health checks instead of crash-looping when DB down).
- Defensive, secure-by-default config parsing (`resolveTrustProxy`,
  `resolveSslRejectUnauthorized`, pool tuning, `statement_timeout`).
- Booking transaction design: inserts the DB row *before* creating the calendar
  event (no orphaned events), catches Postgres `23505` as a clean `SLOT_TAKEN`
  race response, degrades gracefully if Calendar/email fail.
- CI gates both apps (lint + typecheck + test/build). PM2 `ecosystem.config.js`
  present; deployment runbook in `docs/deployment.md`.

### Gaps
- **Test coverage tooling missing** (`@vitest/coverage-v8` not installed). Untested:
  CORS rejection, rate-limit thresholds, authenticated end-to-end admin flow.
- **Migration numbering gap** (`008`–`011`; `001`–`007` absent). Legitimate —
  `schema.sql` is the canonical baseline and migrations are deltas — but the
  numbering is confusing; document it in the `migrations/` dir.

---

## 3. Dead / incomplete / duplicate code

Very clean overall — no `TODO`/`FIXME`/`HACK`, no backup/`.old` files, essentially
no commented-out code, near-zero `any`/`@ts-ignore`.

- One remaining `any`: `smtpTransporter` in `email.service.ts` — type as
  `nodemailer.Transporter`.

---

## 4. Errors / bugs

- (Resolved this session) Predictor service threw plain `Error`s caught by brittle
  `error.message.includes(...)` string-matching in the controller. Now typed
  `HttpError`s mapped centrally; estimation failure returns 422.
- (Transient, already reverted) A `res.status(401).json({s` typo was sitting
  unstaged in `authMiddleware.ts` at session start. It would have broken the build;
  CI would catch it on push, but nothing caught it at local commit time — addressed
  by the new pre-commit hook (§7 / this session).

---

## 5. Code quality / professionalism

Predominantly senior-level: consistent module layering (routes → controller →
service → repository → types), comments that explain *why*, secure-by-default
config, race-condition-aware booking flow, strict TS passing, no debt markers.

Rough edges (consistency, not fundamentals):
- (Resolved this session) Two overlapping rate-limit modules with duplicated
  `makeStore()` and accidental double-limiting on `/predict` and `/bookings`.
- `admin.routes.ts` (~565 lines) mixes controller-delegation with large inline
  handlers; split it (e.g. `admin.upload.routes.ts`, `admin.bookings.routes.ts`).
- API response envelope inconsistent on `/`, `/health`, `/ready`, discovery
  endpoints, and some `{success,message}`-without-`data` mutations; some upload
  errors omit `error.code`.

---

## 6. Fixed since the 2026-05-20 audit (verified)

- All tests now pass (the previously-failing `api.validation.test.ts` is green).
- Schema uses `TIMESTAMPTZ` consistently.
- `guide_downloads.guide_id` FK now has `ON DELETE CASCADE`.
- Predictor index `idx_cutoff_predictor_filters` now defined.
- Logger is proper `pino` (no `console.log` wrapper).
- The 14k-line generated `cutoffStaticMeta.ts` removed.
- `ecosystem.config.js` present; migration `011` added.

---

## 7. Changes applied in this session (2026-06-15)

1. **Frontend error/loading boundaries** — added `app/error.tsx`,
   `app/global-error.tsx` (both Sentry-reporting), a shared
   `components/ui/PageLoading.tsx`, and `loading.tsx` for `/predictor`, `/cutoffs`,
   `/book`.
2. **Rate-limiter consolidation** — merged `rateLimiter.ts` into `rateLimit.ts`
   (single module), removed the dead `createAdminLoginLimiter`, and removed the
   double-limiting on `/predict` and `/bookings` (each now has exactly one
   dedicated limiter).
3. **Typed predictor errors** — new `utils/httpError.ts` (`HttpError`); the
   predictor service throws typed errors (validation → 400, rank-estimation
   failure → 422) and the controller now delegates to the central error handler
   instead of string-matching messages. Error handler now logs 4xx at `warn`,
   5xx at `error`.
4. **Pre-commit hook** — dependency-free `.githooks/pre-commit` that runs
   lint + typecheck for whichever app has staged changes (husky/lint-staged
   intentionally avoided because the repo keeps `node_modules` out of the root).
   Enable per clone with `git config core.hooksPath .githooks`.

---

5. **Lint warnings cleared** — removed 4 unused-var/import warnings
   (`next.config.ts`, `Navbar.tsx`, `Sidebar.tsx`, `admin/updates/page.tsx`).
   Also fixed a pre-existing lint **error** in `admin/login/page.tsx`
   (`<a href="/">` → `next/link`) that was failing the frontend CI job. Frontend
   lint is now 0 errors / 0 warnings.
6. **SMTP transporter typed** — `email.service.ts` `any` → `nodemailer.Transporter`
   (removed the `eslint-disable`).
7. **Login user-enumeration hardening** — `auth.service.ts` now runs a constant
   dummy bcrypt compare on the unknown-email path so timing matches the
   wrong-password path.
8. **Login-gate documented** — clarified in `admin/login/page.tsx` and a new
   `frontend/SECURITY.md` section that `NEXT_PUBLIC_ADMIN_LOGIN_SECRET` is
   obfuscation, not access control, and where the real boundary lives.
9. **API error envelope** — all upload error responses now carry `error.code`
   (the only error bodies in the codebase that lacked one).
10. **`admin.routes.ts` split** — extracted `admin.bookings.routes.ts` and
    `admin.upload.routes.ts`; the main file dropped from ~565 to ~265 lines.
11. **`GET /admin/bookings` paginated** — accepts `?page=`/`?limit=` (limit
    capped at 200) and returns `{ data, meta: { page, limit, total } }`
    (frontend already tolerates the array shape).
12. **`migrations/README.md`** — documents the baseline (`schema.sql`) + deltas
    model and why numbering starts at `008`.
13. **`docker-compose.yml`** — Postgres + Redis for local dev, matching the
    backend's dev defaults.
14. **Test coverage** — installed `@vitest/coverage-v8`, added a `coverage`
    config block and `npm run test:coverage`, and added
    `tests/security.boundary.test.ts` covering CORS allow/deny, the login
    rate-limiter (429 `RATE_LIMITED`), and the authenticated-admin boundary
    (valid token, expired token, malformed token, non-admin role, missing CSRF).
    Suite is now **8 files / 53 tests, all passing**.

---

## 8. Remaining items (no code change required)

- **CSRF `SameSite=None` in production** — inherent to cross-origin hosting;
  protection rests on the double-submit token (implemented correctly). Awareness
  item only; revisit if the apps are ever served same-origin.
- **Frontend dev-dependency `ajv` advisories** — tracked in `frontend/SECURITY.md`
  (dev-only, not exploitable in production).
- **Optional future work** — app Dockerfiles to extend `docker-compose` to the
  full stack; broader test coverage targets once `npm run test:coverage` output
  is reviewed; standardizing success-envelope `data` keys on the few
  `{success,message}` mutation responses (cosmetic).
