# Changelog

## [Unreleased]

### Added
- Cutoffs database redesign: normalized `colleges` / `courses` / `cutoffs`
  schema replacing the flat `cutoff_data` table (migration 012); legacy table
  RLS-locked and kept only as a revert backup, not dropped (migration 013)
- CAP schedule table for registration/choice-filling/allotment dates (migration 014)
- Document checklist content (migration 015)
- Chatbot: rule-based FAQ matching + confidence-scored fallback, `unanswered_queries`
  logging and admin review endpoint (migrations 016, 018, 019)
- Chatbot Phase 2: RAG retrieval + generation via Gemini, `pgvector` embeddings,
  `rag_chunks` table, Supabase `embed` edge function (migration 020)
- WhatsApp chatbot channel via Meta Cloud API, with per-`wa_id` webhook rate
  limiting and `msg.id` dedup (Redis `SET NX`, 7-day TTL)
- Redis caching layer (content/reference/availability caches) and Vercel edge
  proxy for `/cutoffs`
- Supabase `pg_cron` keep-warm ping (primary), GitHub Actions keep-warm workflow (backup)
- `platform_settings` table for admin-editable config (migration 010)

## [1.0.0] - 2026-05-20

### Added
- College predictor with Safe / Target / Dream classification
- Historical cutoff explorer (2022-2025, all CAP rounds)
- Consultation booking with Google Meet integration
- Automated email confirmation on booking
- CET updates section with admin management
- Downloadable admission guides with lead capture
- Role-protected admin dashboard
- Baseline database schema (`src/config/schema.sql`)
- Zod input validation on predictor and booking endpoints
- Rate limiting on predictor, booking, and auth routes
- Security headers via helmet
- Request logging via morgan
- /api/v1/ versioning prefix on all routes
- /api/v1/health smoke test endpoint
- GitHub Actions CI for backend and frontend
- Local font hosting (Inter, Playfair Display)

### Fixed
- Double-booking race condition via unique partial index on bookings.meeting_time (migration 011)
- Booking timezone ambiguity - meeting_time now stored as TIMESTAMPTZ (migration 004)
- Admin password rotation now re-hashes when env password changes

### Security
- CORS locked to FRONTEND_URL environment variable
- helmet security headers on all responses
- Rate limiting prevents brute force on auth and booking spam
