# Changelog

## [Unreleased]

## [1.0.0] - 2026-05-20

### Added
- College predictor with Safe / Target / Dream classification
- Historical cutoff explorer (2022-2025, all CAP rounds)
- Consultation booking with Google Meet integration
- Automated email confirmation on booking
- CET updates section with admin management
- Downloadable admission guides with lead capture
- Role-protected admin dashboard
- Database migrations 001-007
- Zod input validation on predictor and booking endpoints
- Rate limiting on predictor, booking, and auth routes
- Security headers via helmet
- Request logging via morgan
- /api/v1/ versioning prefix on all routes
- /api/v1/health smoke test endpoint
- GitHub Actions CI for backend and frontend
- Local font hosting (Inter, Playfair Display)

### Fixed
- Double-booking race condition via unique partial index on bookings.meeting_time (migration 007)
- Booking timezone ambiguity - meeting_time now stored as TIMESTAMPTZ (migration 004)
- Admin password rotation now re-hashes when env password changes

### Security
- CORS locked to FRONTEND_URL environment variable
- helmet security headers on all responses
- Rate limiting prevents brute force on auth and booking spam
