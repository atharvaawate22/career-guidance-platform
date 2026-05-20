# Production Readiness Audit
**Date:** 2026-05-20  
**Audited by:** Codex  
**Overall status:** NEEDS WORK

## Summary scorecard

| Area | Status | Critical issues |
|------|--------|----------------|
| Security | NEEDS WORK | Public API shape inconsistencies and untracked local `.env` files need operational cleanup; no hardcoded JWT secret found. |
| Database | NEEDS WORK | Migration numbering starts at `008`; several datetime columns are still plain `TIMESTAMP`; one FK lacks explicit `ON DELETE`. |
| API design | NEEDS WORK | Multiple endpoints do not use the required `{ success, data/error }` envelope; admin bookings list ignores repository pagination params. |
| Code quality | NEEDS WORK | Lint has 0 errors, but `backend/src/modules/admin/admin.routes.ts` is 480 lines and frontend has multiple large files. |
| Test coverage | NOT READY | Requested coverage command fails; fallback coverage also fails because `@vitest/coverage-v8` is missing; normal tests fail in `api.validation.test.ts`. |
| Frontend quality | NEEDS WORK | No Next.js `error.tsx` or `loading.tsx` route boundaries found. |
| DevOps | NEEDS WORK | CI covers both apps, but no repo process-manager config, no local Docker setup, and no explicit staging environment configuration found. |

## Critical issues (must fix before production)

- **Coverage cannot be produced and tests are not fully green.** `backend/package.json:16` maps `npm test` to `vitest run`; the requested coverage command fails with unknown `--coverageReporters`, and the supported fallback fails because `@vitest/coverage-v8` is not installed. Plain `npm test` also fails because `backend/tests/api.validation.test.ts:12` times out in `beforeAll`.
- **Database migration chain is incomplete.** Only `backend/migrations/008_cleanup_unused_indexes.sql`, `009_meeting_time_timestamptz.sql`, and `010_platform_settings.sql` are present; migrations `001` through `007` are not found. The runner applies sorted SQL files from `backend/src/config/migrations.ts:22-27`, so a fresh migration-only database is not reproducible from this directory.
- **Datetime consistency is incomplete.** Plain `TIMESTAMP` remains in sensitive/current schema declarations: `backend/src/config/schema.sql:38`, `backend/src/config/schema.sql:58`, `backend/src/config/schema.sql:95`, `backend/src/config/schema.sql:112`, `backend/src/config/schema.sql:129`, `backend/src/config/schema.sql:168`, and `backend/src/config/schema.sql:172`.
- **Foreign key delete behavior is not explicit.** `guide_downloads.guide_id` references `guides(id)` without `ON DELETE` behavior at `backend/src/config/schema.sql:125`.

## Important improvements (fix soon)

- **API response envelopes are inconsistent.** Examples: root endpoint returns raw metadata at `backend/src/server.ts:101`, health returns raw status at `backend/src/server.ts:119`, ready returns raw status at `backend/src/server.ts:133`, booking slots returns `{ date, booked }` at `backend/src/modules/booking/booking.controller.ts:71`, and logout/delete responses return top-level `message` without `data` at `backend/src/modules/auth/auth.controller.ts:155`, `backend/src/modules/admin/admin.routes.ts:329`, and `backend/src/modules/admin/admin.routes.ts:360`.
- **Public route naming differs from the requested contract.** The app registers predictor at `/api/v1/predict` in `backend/src/server.ts:152` and `backend/src/modules/predictor/predictor.routes.ts:28`; `POST /api/v1/predictor` was not found.
- **Admin bookings endpoint does not expose pagination.** The repository supports `page` and `limit` defaults at `backend/src/modules/booking/booking.repository.ts:57-60`, but the route calls `getAllBookings()` with no query parsing at `backend/src/modules/admin/admin.routes.ts:266`.
- **Release checklist omits DB-specific safety checks.** `README.md:281-296` includes lint/typecheck/test/build/smoke tests but does not include migration dry-run, backup/snapshot verification, readiness check, or city normalization guard documented in `docs/deployment.md:59-85`.
- **No route-level frontend error/loading boundaries.** No `frontend/src/app/**/error.tsx` or `frontend/src/app/**/loading.tsx` files were found.

## Minor improvements (nice to have)

- Split large files: `backend/src/modules/admin/admin.routes.ts` is 480 lines; frontend files over 300 lines are `frontend/src/lib/cutoffStaticMeta.ts` (14387), `frontend/src/app/book/page.tsx` (793), `frontend/src/app/predictor/page.tsx` (417), and `frontend/src/app/cutoffs/page.tsx` (355).
- Replace production `console.log` wrapper output with a structured logger transport or document why this wrapper is acceptable. The direct `console.log` is at `backend/src/utils/logger.ts:53`.
- Add repo-local Docker or dev container setup for environment consistency; no root `Dockerfile` or `docker-compose.yml` was found.

## Section findings

### Section 1 - Security

| Check | Status | Evidence / fix |
|------|--------|----------------|
| JWT secret is read from environment, not hardcoded | PASS | `auth.service.ts` reads `process.env.JWT_SECRET` at `backend/src/modules/auth/auth.service.ts:54`; `authMiddleware.ts` verifies with env secret at `backend/src/middleware/authMiddleware.ts:35`; production startup validates length at `backend/src/server.ts:217`. |
| JWT expiry is configured | PASS | `JWT_EXPIRES_IN` fallback is `24h` at `backend/src/modules/auth/auth.service.ts:68`; cookie max age uses `getSessionCookieMaxAgeMs(process.env.JWT_EXPIRES_IN)` at `backend/src/modules/auth/auth.controller.ts:50`. |
| Passwords are hashed with bcrypt | PASS | Login compares with `bcrypt.compare` at `backend/src/modules/auth/auth.service.ts:47`; admin bootstrap hashes with `bcrypt.hash(..., 10)` at `backend/src/config/seed.ts:108` and `backend/src/config/seed.ts:121`. |
| Admin routes all have auth middleware | PASS | Admin router imports `authMiddleware`/`requireAdminRole` at `backend/src/modules/admin/admin.routes.ts:4-7`; every admin route uses both, e.g. updates create at `backend/src/modules/admin/admin.routes.ts:76-82`, upload at `backend/src/modules/admin/admin.routes.ts:371-376`, analytics at `backend/src/modules/admin/admin.routes.ts:521-525`. |
| CORS is restricted to specific origins | PASS | CORS allowed origins come from comma-separated `FRONTEND_URL` and reject non-matching origins at `backend/src/server.ts:62-78`; no wildcard `*` found. |
| Helmet is installed and applied before routes | PASS | `helmet` dependency exists in `backend/package.json:28`; `app.use(helmet())` is before route registration at `backend/src/server.ts:82`, while routes begin at `backend/src/server.ts:150`. |
| Rate limiting exists on auth, booking, predictor endpoints | PASS | Auth login uses `authLimiter` at `backend/src/modules/auth/auth.routes.ts:28`; booking uses global and route limiters at `backend/src/server.ts:158` and `backend/src/modules/booking/booking.routes.ts:32`; predictor uses global and route limiters at `backend/src/server.ts:152` and `backend/src/modules/predictor/predictor.routes.ts:30`. |
| No `.env` files are committed | PASS | `git ls-files` shows only `.env.production.example` and `backend/.env.example`; actual `backend/.env` and `frontend/.env.local` exist locally but are untracked. |
| No API keys, secrets, or passwords appear in source | PASS | No actual secret value found. Placeholders/examples exist in `.env.production.example:11`, `.env.production.example:17`, `README.md:155-163`, and `docs/deployment.md:24-40`. |
| SQL uses parameterized statements | PASS | Repositories consistently pass values arrays, e.g. auth lookup `backend/src/modules/auth/auth.repository.ts:7-10`, bookings insert `backend/src/modules/booking/booking.repository.ts:15-30`, predictor query `backend/src/modules/predictor/predictor.repository.ts:209`, cutoffs query `backend/src/modules/cutoffs/cutoffs.repository.ts:135`. Dynamic SQL uses generated placeholders rather than raw user concatenation at `backend/src/modules/cutoffs/cutoffs.repository.ts:18-87` and `backend/src/modules/predictor/predictor.repository.ts:58-142`. |
| File uploads validate type and size | PASS | Upload route is protected and uses `express.raw({ type: '*/*', limit: '50mb' })` at `backend/src/modules/admin/admin.routes.ts:371-377`; extension whitelist is at `backend/src/modules/admin/admin.routes.ts:415-427`, MIME whitelist at `backend/src/modules/admin/admin.routes.ts:438-449`, and signature checks at `backend/src/modules/admin/admin.routes.ts:42-59` and `backend/src/modules/admin/admin.routes.ts:451-457`. |
| Zod validation on public POST endpoints | PASS | `POST /api/v1/predict` uses `validateBody(predictorRequestSchema)` at `backend/src/modules/predictor/predictor.routes.ts:28-32`; `POST /api/v1/bookings` uses `validateBody(createBookingSchema)` at `backend/src/modules/booking/booking.routes.ts:29-33`; `POST /api/v1/admin/login` parses `loginSchema` at `backend/src/modules/auth/auth.controller.ts:37`; `POST /api/v1/guides/download` uses `validateBody(guideDownloadSchema)` at `backend/src/modules/guides/guides.routes.ts:10-13`. `POST /api/v1/predictor` was not found. |

### Section 2 - Database

**Tables and primary keys**

| Table | Primary key type | Evidence |
|------|------------------|----------|
| `updates` | UUID | `backend/src/config/schema.sql:12-13` |
| `admin_users` | UUID | `backend/src/config/schema.sql:33-34` |
| `cutoff_data` | UUID | `backend/src/config/schema.sql:49-50` |
| `resources` | UUID | `backend/src/config/schema.sql:88-89` |
| `guides` | UUID | `backend/src/config/schema.sql:106-107` |
| `guide_downloads` | UUID | `backend/src/config/schema.sql:123-124` |
| `faqs` | UUID | `backend/src/config/schema.sql:143-144` |
| `bookings` | UUID | `backend/src/config/schema.sql:159-160` |
| `schema_migrations` | integer serial | `backend/src/config/migrations.ts:13-16` |
| `platform_settings` | text | `backend/migrations/010_platform_settings.sql:5-8` |

**Foreign keys**

- `guide_downloads.guide_id UUID NOT NULL REFERENCES guides(id)` is declared at `backend/src/config/schema.sql:125` and is missing explicit `ON DELETE` behavior. No other `REFERENCES` declaration found.

**Indexes and query coverage**

- Existing/created indexes found: `idx_updates_published_date` at `backend/src/config/schema.sql:22`; `idx_admin_users_email` at `backend/src/config/schema.sql:42`; `idx_cutoff_composite` at `backend/src/config/schema.sql:81`; `idx_resources_created_at` at `backend/src/config/schema.sql:99` and `backend/migrations/008_cleanup_unused_indexes.sql:75`; `idx_guides_is_active` at `backend/src/config/schema.sql:116`; `idx_guide_downloads_guide_id` at `backend/src/config/schema.sql:136`; `idx_bookings_meeting_time` at `backend/src/config/schema.sql:176`; `idx_bookings_status` at `backend/src/config/schema.sql:182`; `idx_cutoff_branch_trgm` and `idx_cutoff_college_name_trgm` at `backend/migrations/008_cleanup_unused_indexes.sql:18-22`; `idx_faqs_display_order` at `backend/migrations/008_cleanup_unused_indexes.sql:65`; `idx_bookings_email_active_future` at `backend/migrations/009_meeting_time_timestamptz.sql:14-16`.
- Predictor filter coverage is partial. Query filters include `year`, `stage`, `category`, `level`, `cutoff_rank`, branches, and city at `backend/src/modules/predictor/predictor.repository.ts:58-142`; only `idx_cutoff_composite(year, category, branch)` is declared at `backend/src/config/schema.sql:81`, and comments mention but do not define `idx_cutoff_predictor_filters` at `backend/migrations/008_cleanup_unused_indexes.sql:31-33`.
- Booking lookup coverage is mostly covered: time and status indexes exist at `backend/src/config/schema.sql:176-183`, and duplicate email/future lookup has partial index at `backend/migrations/009_meeting_time_timestamptz.sql:14-16`.
- Cutoff search coverage is partial: cutoff search filters include year, branch, category, home university, college, stage, level, and city at `backend/src/modules/cutoffs/cutoffs.repository.ts:18-87`; single-column indexes for year/category/branch/home university/college/percentile are dropped in `backend/migrations/008_cleanup_unused_indexes.sql:38-52`, leaving composite/trigram coverage but no declared city/home-university composite in the repository.

**RLS**

- RLS is enabled for sensitive tables: `admin_users` at `backend/src/config/schema.sql:194`, `guide_downloads` at `backend/src/config/schema.sql:195`, and `bookings` at `backend/src/config/schema.sql:196`.

**Migrations**

- Runner found at `backend/src/config/migrations.ts:9-47`; it creates `schema_migrations`, reads `backend/migrations`, sorts `.sql` files, and records applied filenames.
- Migration files are not sequential from the beginning: found `008`, `009`, `010`; `001-007` not found.
- Destructive migrations: `backend/migrations/008_cleanup_unused_indexes.sql:38-52`, `64`, `74`, `83`, `90`, and `97` drop indexes; `backend/src/config/migrate_updates_timestamps.sql:20` drops `published_date`, but that SQL file is outside the active `backend/migrations` runner directory and no rollback strategy was found.
- TIMESTAMPTZ is not consistent; see critical issue above.

### Section 3 - API design

**Public/API boundary endpoints found**

| Method | Path | Evidence |
|------|------|----------|
| GET | `/` | `backend/src/server.ts:100` |
| GET | `/api/v1/health` | `backend/src/server.ts:118` |
| GET | `/api/health` | `backend/src/server.ts:126` |
| GET | `/api/v1/ready` | `backend/src/server.ts:130` |
| GET | `/api/v1/updates` | `backend/src/modules/updates/updates.routes.ts:7` |
| GET | `/api/v1/cutoffs/meta` | `backend/src/modules/cutoffs/cutoffs.routes.ts:8` |
| GET | `/api/v1/cutoffs` | `backend/src/modules/cutoffs/cutoffs.routes.ts:9` |
| GET | `/api/v1/predict` | `backend/src/modules/predictor/predictor.routes.ts:10` |
| POST | `/api/v1/predict` | `backend/src/modules/predictor/predictor.routes.ts:28` |
| GET | `/api/v1/guides` | `backend/src/modules/guides/guides.routes.ts:9` |
| POST | `/api/v1/guides/download` | `backend/src/modules/guides/guides.routes.ts:10` |
| GET | `/api/v1/resources` | `backend/src/modules/resources/resources.routes.ts:7` |
| GET | `/api/v1/faqs` | `backend/src/modules/faqs/faqs.routes.ts:6` |
| GET | `/api/v1/bookings` | `backend/src/modules/booking/booking.routes.ts:9` |
| POST | `/api/v1/bookings` | `backend/src/modules/booking/booking.routes.ts:29` |
| GET | `/api/v1/bookings/slots` | `backend/src/modules/booking/booking.routes.ts:37` |
| GET | `/api/v1/settings/booking-slots` | `backend/src/modules/settings/settings.routes.ts:7` |
| GET | `/api/v1/settings/announcement` | `backend/src/modules/settings/settings.routes.ts:8` |
| GET | `/api/v1/admin/login` | `backend/src/modules/auth/auth.routes.ts:12` |
| POST | `/api/v1/admin/login` | `backend/src/modules/auth/auth.routes.ts:28` |

**Response shape deviations**

- Root `/`, health, ready, login discovery, predictor discovery, booking discovery, and booking slots deviate from the required success envelope: `backend/src/server.ts:101`, `backend/src/server.ts:119`, `backend/src/server.ts:133`, `backend/src/modules/auth/auth.routes.ts:13`, `backend/src/modules/predictor/predictor.routes.ts:11`, `backend/src/modules/booking/booking.routes.ts:10`, `backend/src/modules/booking/booking.controller.ts:71`.
- Several successful mutations return `{ success: true, message }` without `data`: logout at `backend/src/modules/auth/auth.controller.ts:155`, admin booking status at `backend/src/modules/admin/admin.routes.ts:329`, admin booking delete at `backend/src/modules/admin/admin.routes.ts:360`, guide delete at `backend/src/modules/guides/guides.controller.ts:113`, FAQ delete at `backend/src/modules/faqs/faqs.controller.ts:130`, and resource delete at `backend/src/modules/resources/resources.controller.ts:79`.
- Several errors omit `error.code`: upload errors at `backend/src/modules/admin/admin.routes.ts:386`, `394`, `414`, `426`, `438`, `448`, `462`, and `487`.

**Status codes**

- Correct examples: POST booking returns `201` at `backend/src/modules/booking/booking.controller.ts:47`; POST cutoff bulk insert returns `201` at `backend/src/modules/cutoffs/cutoffs.controller.ts:276`; unauthenticated/unauthorized middleware returns `401`/`403` at `backend/src/middleware/authMiddleware.ts:24`, `85`, `96`.
- Potentially wrong/inconsistent: `guides.downloadGuide` returns `400` for any `!result.success` at `backend/src/modules/guides/guides.controller.ts:38`, even if the service result may represent not-found; exact service error mapping should be formalized.

**Pagination and limits**

- Cutoff explorer has a hard `LIMIT 500` at `backend/src/modules/cutoffs/cutoffs.repository.ts:123-127` and returns `total` at `backend/src/modules/cutoffs/cutoffs.controller.ts:244`; it does not expose page/limit query params.
- Admin bookings repository supports `page=1`, `limit=50` at `backend/src/modules/booking/booking.repository.ts:57-60`, but route does not parse or pass pagination at `backend/src/modules/admin/admin.routes.ts:266`.
- Updates list has no pagination found; route is `backend/src/modules/updates/updates.routes.ts:7`, response is produced at `backend/src/modules/updates/updates.controller.ts:43`.
- Predictor maximum result limit exists: SQL `LIMIT 800` at `backend/src/modules/predictor/predictor.repository.ts:183-184`.

### Section 4 - Code quality

- Lint command: `cd backend && npm run lint -- --format json` completed with **0 errors**. First 20 errors: none.
- Backend files over 300 lines: `backend/src/modules/admin/admin.routes.ts` has 480 lines.
- Frontend files over 300 lines: `frontend/src/lib/cutoffStaticMeta.ts` 14387, `frontend/src/app/book/page.tsx` 793, `frontend/src/app/predictor/page.tsx` 417, `frontend/src/app/cutoffs/page.tsx` 355.
- TODO/FIXME/HACK/XXX findings: none found in `backend/src` or `frontend/src`.
- `console.log` findings: `backend/src/utils/logger.ts:53`.

### Section 5 - Test coverage

- Requested command `cd backend && npm test -- --coverage --coverageReporters=text` failed. Vitest reported `Unknown option --coverageReporters`.
- Fallback `npm test -- --coverage --coverage.reporter=text` also failed: `Cannot find dependency '@vitest/coverage-v8'`.
- Coverage summary table: not available because coverage did not run.
- Modules with zero test coverage: not found because coverage report could not be generated.
- Plain `npm test` failed: 6 test files passed, 1 failed, 42 tests passed, 3 skipped; failure is `tests/api.validation.test.ts` timing out in `beforeAll` at `backend/tests/api.validation.test.ts:12`.

**Critical path test status**

- Predictor classification boundary cases: TESTED. Evidence: `backend/tests/predictor.service.test.ts:151`, `160`, plus rank extremes at `116` and `130`.
- Booking slot uniqueness enforcement: TESTED at service level. Evidence: unique slot collision tests at `backend/tests/booking.service.test.ts:90` and `109`.
- Admin authentication flow: PARTIALLY TESTED. Login service tests at `backend/tests/auth.service.test.ts:24-85`; API smoke login at `backend/tests/api.smoke.test.ts:38-64`; unauthenticated admin route tests at `backend/tests/api.contract.test.ts:71-95`. Missing authenticated end-to-end role and cookie expiry/invalid JWT coverage.
- CORS rejection of invalid origins: NOT TESTED. No `CORS` rejection test found in `backend/tests`; CORS logic is at `backend/src/server.ts:62-78`. Should verify a request with an Origin not in `FRONTEND_URL` is rejected and an allowed Origin passes with credentials headers.
- Rate limiter behavior: NOT TESTED. Limiters are defined at `backend/src/middleware/rateLimiter.ts:3-42` and `backend/src/middleware/rateLimit.ts:3-46`. Should verify repeated login, booking, and predictor requests exceed configured thresholds and return `{ success:false, error.code:'RATE_LIMITED' }` with rate-limit headers.

### Section 6 - Frontend quality

- Error boundaries: no `frontend/src/app/**/error.tsx` files found. Routes without boundaries: `/`, `/admin`, `/book`, `/cutoffs`, `/guides`, `/predictor`, `/resources`, `/updates`.
- Loading states: no `frontend/src/app/**/loading.tsx` files found. Routes without loading files: `/`, `/admin`, `/book`, `/cutoffs`, `/guides`, `/predictor`, `/resources`, `/updates`.
- Predictor form client-side validation exists but is incomplete. It validates missing percentile/rank, category, and gender at `frontend/src/app/predictor/page.tsx:96-113`; numeric bounds rely mostly on input attributes at `frontend/src/app/predictor/page.tsx:225-226`.
- Booking form client-side validation exists. Required category, purpose, date, working day, and slot checks are at `frontend/src/app/book/page.tsx:236-243`; phone/name/branch/percentile sanitization and range checks are at `frontend/src/app/book/page.tsx:333-358`.
- Fetch network-error handling: no obvious unhandled `await fetch` in page flows found. Examples use `try/catch` around awaited fetches, e.g. predictor at `frontend/src/app/predictor/page.tsx:117-129` and booking at `frontend/src/app/book/page.tsx:259-305`; promise-chain fetches include `.catch`, e.g. booking slots at `frontend/src/app/book/page.tsx:223-226` and announcement banner at `frontend/src/components/AnnouncementBanner.tsx:17-24`.
- API base URL consistency: all app API calls found use `API_BASE_URL`, which is defined from `NEXT_PUBLIC_API_BASE_URL` or legacy `NEXT_PUBLIC_API_URL` at `frontend/src/lib/apiBaseUrl.ts:1-7`. No hardcoded backend API URL found in `frontend/src` besides the development fallback `http://localhost:5000` at `frontend/src/lib/apiBaseUrl.ts:4-5`.

### Section 7 - DevOps and deployment

- CI covers both backend and frontend. Backend job runs `npm ci`, lint, typecheck, and tests at `.github/workflows/ci.yml:14-22`; frontend job runs `npm ci`, lint, typecheck, and build at `.github/workflows/ci.yml:31-39`.
- Staging environment: not found as a concrete deployment target. Docs mention testing schema changes in `staging/local DB` at `docs/deployment.md:158`, but no staging workflow or env file was found.
- Vercel environment variables: documented. `NEXT_PUBLIC_API_BASE_URL` is listed at `docs/deployment.md:44-46` and Vercel setup at `docs/deployment.md:121-129`.
- Backend process manager config: no repo `ecosystem.config.js` or equivalent found. PM2 commands are documented at `docs/deployment.md:92-117`.
- Docker setup: no root/backend/frontend `Dockerfile` or `docker-compose.yml` found; only a dependency Dockerfile under `backend/node_modules/bcrypt`, which is not project config.
- README release checklist is useful but incomplete. It lists lint/typecheck/test/build and smoke tests at `README.md:281-296`, but omits DB migration dry-run, backup/snapshot, `npm run check:city-normalization`, readiness endpoint, and rollback checks that are present in `docs/deployment.md:59-85` and `docs/deployment.md:142-164`.

## What is already good

- Security basics are present: env-based JWT secret, bcrypt password verification, Helmet, restricted CORS, CSRF protection for admin mutating routes, and route-level auth/role checks.
- Public POST validation is strong: predictor, booking, admin login, and guide download all use Zod either through middleware or controller parsing.
- SQL access is generally parameterized, including dynamically constructed filter SQL using placeholders and values arrays.
- RLS is enabled on all core tables, including sensitive `bookings`, `admin_users`, and `guide_downloads`.
- CI covers backend and frontend quality gates, and the deployment runbook is practical and fairly complete.
- Predictor and booking service tests cover important business logic, including classification boundaries and slot collision behavior.
