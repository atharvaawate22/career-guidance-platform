## SLO and Alert Thresholds

This project uses pragmatic service-level goals suitable for student-project production deployment.

## 1. Availability SLOs

- API liveness (`GET /api/health`): 99.9% monthly availability target.
- API readiness (`GET /api/ready`): 99.5% monthly availability target.

Alert thresholds:
- Critical: 3 consecutive readiness failures (2-minute interval).
- Warning: readiness error rate > 5% over 15 minutes.

## 2. Latency SLOs

Measured from backend profile artifacts and runtime monitoring.

Targets (p95):
- `GET /api/cutoffs`: <= 700ms
- `POST /api/predict`: <= 900ms
- `GET /api/cutoffs/meta`: <= 500ms

Alert thresholds:
- Warning: p95 exceeds target for 3 consecutive measurement windows.
- Critical: p95 exceeds 1.5x target for any 2 consecutive windows.

## 3. Error Rate SLOs

- Public API 5xx rate: < 1% over 15-minute rolling window.
- Admin API 5xx rate: < 1% over 15-minute rolling window.

Alert thresholds:
- Warning: 5xx >= 1% over 15 minutes.
- Critical: 5xx >= 3% over 10 minutes.

## 4. Booking Flow SLOs

- Successful booking creation (`POST /api/bookings`): >= 98% success (excluding validation failures).

Alert thresholds:
- Warning: success rate < 98% over 30 minutes.
- Critical: success rate < 95% over 15 minutes.

## 5. Incident Routing Hook Points

Use optional webhook environment variables to forward errors to your incident tool:

Backend:
- `ERROR_WEBHOOK_URL`
- `DISABLE_ERROR_WEBHOOK`

Frontend:
- `NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL`

These hooks are intentionally minimal and non-blocking to avoid request-path impact.
