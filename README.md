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
- CET Updates Section (chronological, verified notifications)
- College Cutoff Explorer (Branch, Category, Gender, Home University filters)
- College Predictor Tool (Safe / Target / Dream classification logic)
- Downloadable Admission Guides (PDF resources)
- Consultation Booking with Google Meet Integration
- Automated Email Confirmation System

### Admin Modules

- CET Update Management
- Cutoff Dataset Upload & Management
- Booking Management Dashboard
- Lead Tracking
- Download Monitoring
- Role-Protected Admin Access

---

## Architecture Summary

The system follows a modular monolith architecture with strict separation of concerns.

**Application Flow**

Client → API Layer → Service Layer → Data Layer

**External Integrations**

- Email Service (Gmail SMTP)
- Google Calendar API (for meeting creation)

Each feature (predictor, booking, updates, cutoffs, guides, admin) is implemented as an independent module. Errors within one module do not cascade into others. Feature toggling is supported via environment configuration.

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

- PostgreSQL

**External Services**

- Gmail SMTP (Email Service)
- Google Calendar API

**Deployment**

- Frontend: Vercel or equivalent cloud platform
- Backend: VPS / Cloud service
- Database: Managed PostgreSQL instance

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

Create a `.env` file in the root directory with the following variables:

PORT=

DATABASE_URL=

EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

FEATURE_PREDICTOR=true
FEATURE_BOOKING=true
FEATURE_UPDATES=true
FEATURE_GUIDES=true

Feature flags allow controlled activation or deactivation of individual modules.

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

   ```bash
   # Connect to PostgreSQL and run schema
   psql -U postgres -d career_guidance -f src/config/schema.sql
   ```

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
- Config-driven feature toggling
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
