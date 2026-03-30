## Performance Baseline

This project keeps a lightweight backend API latency baseline in CI for trend visibility.

### What runs in CI

When `DATABASE_URL` is configured in CI secrets:

1. Backend app is built and started.
2. Endpoint profiler runs against:

- `GET /api/cutoffs` (filtered)
- `POST /api/predict`
- `GET /api/cutoffs/meta`

3. Summary with avg/p50/p95/min/max is captured.
4. Artifact is uploaded as `backend-profile-baseline`.

### Where to find results

In GitHub Actions run artifacts:

- `profile-endpoints.txt`
- `profile-server.log`

### How to use it

- Compare p95 values release-to-release.
- Investigate sudden p95 jumps before merge.
- Use data to validate optimization work, not as a hard gate yet.

### Local run

From project root:

```bash
npm --prefix backend run profile:endpoints
```

Optional environment overrides:

- `PROFILE_BASE_URL` (default `http://localhost:5000`)
- `PROFILE_RUNS` (default `12`)
- `PROFILE_WARMUP_RUNS` (default `2`)
