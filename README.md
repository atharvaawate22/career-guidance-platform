# CET Hub — MHT-CET Admission Guidance Platform

**Live:** [cethub.in](https://cethub.in) &nbsp;|&nbsp; 
**Built by:** [Atharva Awate](https://github.com/atharvaawate22)

A full-stack web platform helping Maharashtra engineering students navigate 
MHT-CET CAP admissions. Features a percentile-based college predictor, 
historical cutoff explorer, consultation booking with Google Meet, 
CET update tracking, an FAQ + RAG-backed chatbot (web widget and WhatsApp), 
and a role-protected admin dashboard.

**Stack:** Next.js · TypeScript · Node.js · Express · PostgreSQL (Supabase, 
pgvector) · Redis · Zod · Vercel · Render

**Key engineering decisions documented in [`/docs`](/docs).**

> ⚠️ This project is under a source-available license. Viewing and evaluation 
> are welcome. Redistribution or redeployment is not permitted.

---

# MHT CET Admission Guidance Platform

A modular and scalable web platform focused on MHT CET engineering admissions. The system provides structured admission guidance, CET updates tracking, cutoff exploration, a college predictor engine, downloadable guides, and automated consultation booking.

The application is built using a modular monolith architecture to ensure feature isolation, maintainability, and future extensibility.

---

## Overview

This platform is designed to:

- Provide structured and reliable information about the MHT CET CAP admission process
- Offer data-driven insights using historical cutoff datasets
- Enable percentile-based college prediction with categorized results
- Publish verified and structured CET updates
- Support personalized admission consultation booking

The system separates content delivery, prediction logic, booking automation, and data management into independent modules to prevent cascading failures and allow scalable growth.

---

## Core Features

### Public Modules

- CAP Process Guides and Documentation
- CET Updates Section (chronological, official-sourced notifications)
- FAQs
- College Cutoff Explorer (college / course / category / CAP round filters)
- College Predictor Tool
- Downloadable Admission Guides and Resources (PDF)
- Consultation Booking with Google Meet Integration
- Automated Email Confirmation System
- Chatbot (rule-based FAQ matching + RAG generation via Gemini) — available as
  a web widget and over WhatsApp (Meta Cloud API)

### Admin Modules

- CET Update Management
- Cutoff Dataset Upload & Management
- Booking Management Dashboard
- Resource / Guide Upload
- Unanswered Chatbot Query Review
- Role-Protected Admin Access

---

## Architecture Summary

The system follows a modular monolith architecture with strict separation of concerns.

**Application Flow**

Client → API Layer → Service Layer → Data Layer

**External Integrations**

- Email Service (SMTP)
- Google Calendar API (for meeting creation)
- Gemini API (RAG generation for the chatbot)
- WhatsApp Cloud API (Meta) — chatbot channel
- Redis — caching, rate limiting, WhatsApp dedup (optional; degrades gracefully if unset)

Each feature (predictor, booking, updates, cutoffs, guides, resources, faqs, settings, chatbot, whatsapp, admin, auth) is implemented as an independent module. Errors within one module do not cascade into others. All modules are always registered — there is no environment-based feature-flag toggling.

Detailed architecture is documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Technology Stack

**Frontend**

- Next.js
- TypeScript

**Backend**

- Node.js
- Express.js
- TypeScript

**Database**

- PostgreSQL (Supabase, with `pgvector` for RAG embeddings)
- Redis (caching, rate limiting — optional, degrades gracefully if unset)

**External Services**

- SMTP (Email Service)
- Google Calendar API
- Gemini API (chatbot RAG generation)
- WhatsApp Cloud API (Meta)

**Deployment**

- Frontend: Vercel ([cethub.in](https://cethub.in))
- Backend: Render
- Database: Supabase (managed PostgreSQL)

---

## Project Structure

```
career-guidance-platform/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── config/   # Configuration
│   │   └── utils/    # Utilities
│   ├── scripts/      # Helper scripts
│   └── docs/         # Backend documentation
├── frontend/         # Next.js application
│   └── src/
│       └── app/      # App router pages
├── docs/             # Project documentation
│   ├── API_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── deployment.md
└── README.md
```

Each module contains:

- controller
- service
- repository
- routes
- types

Modules are self-contained and communicate only through defined service boundaries.

---

## Environment Variables

Backend and frontend each have their own `.env.example` (`backend/.env.example`,
`frontend/.env.example`) — copy those rather than typing variables from
scratch. Key backend variables:

- `PORT`, `DATABASE_URL` (or discrete `DB_*` vars), `DB_POOL_MAX`
- `JWT_SECRET`, `CSRF_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optional — seeds an initial admin user)
- `EMAIL_PROVIDER` (`mock` or `smtp`), `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` (optional — mock meeting links used if unset)
- `REDIS_URL` (optional — caching/rate-limiting disabled gracefully if unset)
- `GEMINI_API_KEY` (optional — RAG generation skipped if unset, chatbot falls back)
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` (optional — WhatsApp channel)
- `SENTRY_DSN`, `ERROR_WEBHOOK_URL` (optional — error tracking)

Key frontend variables: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL`.

There are no `FEATURE_*` toggle env vars — every module is always registered.

---

## Installation

### Backend Setup

1. Navigate to backend directory

   ```bash
   cd backend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure environment variables
   - Copy `.env.example` to `.env`
   - Update database credentials, API keys, etc.

4. Initialize database

   Apply the baseline schema once (creates `updates`, `admin_users`,
   `resources`, `guides`, `guide_downloads`, `faqs`, `bookings`):

   ```bash
   psql -U postgres -d career_guidance -f src/config/schema.sql
   ```

   Everything else — cutoffs/colleges/courses, CAP schedule, document
   checklist, chatbot/RAG tables, platform settings — lives in
   `backend/migrations/` and applies automatically on server start
   (`npm run dev` / `npm start`), or manually via `npm run migrate`.

5. Run development server
   ```bash
   npm run dev
   ```
   Backend runs on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory

   ```bash
   cd frontend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure environment
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`

4. Run development server
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:3000

## Design Principles

- Modular feature-based architecture
- Strict separation of business logic and data access
- Independent error handling per module
- Clean and scalable folder structure
- Replaceable external service integrations

The architecture allows future expansion to include:

- JEE Main admission module
- NEET admission module
- Multi-year cutoff intelligence
- Advanced analytics and reporting

---

## Data & Compliance

The platform collects limited student data for:

- Consultation booking
- Lead tracking
- Predictor usage analytics

Security practices include:

- Server-side validation
- Structured error handling
- Role-based admin protection
- Environment-based configuration
- Controlled external API integration

This platform is independent and not affiliated with State CET Cell or DTE Maharashtra.

---

## Future Scope

- Multi-year cutoff trend analysis engine
- Advanced percentile forecasting
- Email notification campaigns for CAP deadlines
- Performance monitoring and observability integration
- Optional payment integration module

---

## Release Checklist

Before every production release:

1. Run backend checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
2. Run frontend checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. Confirm environment variables are set for target environment.
4. Deploy backend, then frontend.
5. Execute smoke tests (`/api/v1/health`, `/api/v1/ready`, predictor, booking, admin login, chatbot).

Detailed deployment instructions: `docs/deployment.md`.
