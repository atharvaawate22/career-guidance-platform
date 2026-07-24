## Deployment Runbook

This document provides a production-focused deployment flow for the current architecture:

- Frontend: Next.js app hosted on Vercel
- Backend: Express API hosted on a VPS or managed Node runtime
- Database: Managed PostgreSQL

The goal is reproducibility and safe releases, not platform complexity.

## 1. Prerequisites

- Node.js 20 LTS on build machines
- npm 10+
- Managed PostgreSQL instance
- Domain/subdomain for backend API (for example, api.yourdomain.com)
- TLS enabled for backend endpoint

## 2. Environment Variables

### Backend required

- PORT
- DATABASE_URL
- JWT_SECRET

### Backend hardening controls

- DB_SSL_REJECT_UNAUTHORIZED (non-production override only; production enforces TLS cert validation)
- ENABLE_SAMPLE_SEED (set to false in production)

### Backend optional (feature integrations)

- ADMIN_EMAIL
- ADMIN_PASSWORD
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GOOGLE_REFRESH_TOKEN
- GOOGLE_CALENDAR_ID
- EMAIL_PROVIDER
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- ALLOW_MOCK_MEET_LINKS

### Frontend required

- NEXT_PUBLIC_API_BASE_URL

### Frontend optional diagnostics

- NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL

## 3. Pre-Deployment Quality Gate

Run these checks before any production release:

### Backend

```bash
cd backend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Note: an earlier draft of this checklist included a `npm run
check:city-normalization` gate; that script does not exist in
`backend/package.json` and there is no equivalent CI step — running it as
written fails with `npm error Missing script`. Either add the script back
if the guard is still wanted, or treat city-normalization data integrity as
covered by the loader/validation steps in
[`CUTOFFS_DB_REDESIGN.md`](CUTOFFS_DB_REDESIGN.md) instead.

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

If any command fails, stop release and fix before deploy.

## 4. Backend Deployment (VPS / Node Host)

1. Provision runtime

- Install Node.js 20 LTS
- Configure process manager (PM2 or systemd)

2. Configure environment

- Add backend environment variables securely
- Ensure DATABASE_URL points to production DB with SSL

3. Deploy code

```bash
cd backend
npm ci
npm run build
npm start
```

For process manager example with PM2:

```bash
pm2 start ecosystem.config.js --env production
pm2 restart cethub-api
pm2 logs cethub-api
pm2 status
pm2 save
pm2 startup
```

PM2 runs `dist/server.js` in cluster mode using `backend/ecosystem.config.js`.
On first deploy, run `pm2 start ecosystem.config.js --env production` from the
`backend` directory after `npm run build`. For routine operations use
`pm2 restart cethub-api`, `pm2 logs cethub-api`, and `pm2 status`. Run
`pm2 save` after the process is healthy, then follow the command printed by
`pm2 startup` so the API restarts after server reboot.

4. Verify health

- Check GET /api/health (or /api/v1/health) returns 200 (liveness)
- Check GET /api/v1/ready returns 200 (readiness with DB check) — there is
  no unversioned /api/ready route
- Check one public endpoint, for example GET /api/v1/updates

## 5. Frontend Deployment (Vercel)

1. Connect repository to Vercel project
2. Set environment variable:

- NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

3. Trigger deployment (push to branch or manual promote)
4. Verify frontend pages load and API calls succeed

## 6. Post-Deployment Smoke Test Checklist

- Frontend home page loads
- Predictor request works (valid payload)
- Booking form accepts valid input
- Admin login works
- One protected admin action succeeds with valid token
- Backend logs show no startup errors

## 7. Rollback Plan

If production issues appear:

1. Revert to previous backend release artifact/commit
2. Redeploy previous frontend Vercel deployment
3. Validate /api/v1/health and critical user flows
4. Open incident note with:

- Issue summary
- Start/end time
- Impacted routes/pages
- Fix and prevention action

## 8. Database Safety

- Take automated daily backups on managed PostgreSQL
- Before schema-affecting changes, create manual snapshot
- Test schema changes in staging/local DB first

## 9. Recommended Branch Release Flow

1. Open PR
2. CI must pass (backend + frontend)
3. Merge to main
4. Deploy backend
5. Promote frontend release
6. Run smoke checks

## 10. Minimal Observability Baseline

- Monitor GET /api/v1/health with an external uptime checker
- Monitor GET /api/v1/ready for dependency readiness alerts
- Keep error logs retained for at least 7 days
- Track deployment timestamps and commit hashes in release notes
- Run `npm run profile:endpoints` (backend, local/manual — not currently
  wired into CI) to check backend latency trends
- Track service objectives and paging thresholds (see
  [`ARCHITECTURE.md`](ARCHITECTURE.md) §13.2 — `docs/PERFORMANCE_BASELINE.md`
  and `docs/SLO_ALERTS.md` don't exist; that content was consolidated into
  ARCHITECTURE.md)
