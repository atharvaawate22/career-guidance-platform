# ARCHITECTURE.md

## 1. Architectural Style

The system follows a **Modular Monolith Architecture**.

This approach ensures:

- Feature-level isolation
- Clear separation of concerns
- Independent module boundaries
- Easier maintainability
- Future migration path to microservices (if required)

The system is intentionally designed so that failure in one module does not cascade into others.

---

## 2. High-Level System Flow

Client  
→ API Layer  
→ Service Layer  
→ Data Layer  
→ External Services (Email, Google Calendar)

### Layer Responsibilities

**Client Layer**

- UI rendering
- Form validation (basic)
- API communication

**API Layer (Controllers + Routes)**

- Request validation
- Response formatting
- Route protection
- Error handling boundary

**Service Layer**

- Business logic
- Cross-module coordination (if required)
- Data transformation

**Data Layer (Repositories)**

- Database queries
- Data persistence
- External API communication wrappers

---

## 3. Module-Based Structure

The system is organized by features instead of technical layers.

/src
/modules
/auth
/predictor
/cutoffs
/updates
/booking
/guides
/resources
/faqs
/settings
/chatbot
/whatsapp
/admin
/shared
/config
server.ts

Each module contains:

- controller.ts
- service.ts
- repository.ts
- routes.ts
- types.ts

Modules are self-contained and should not directly depend on each other’s internal files.

---

## 4. Module Responsibilities

### Predictor Module

Responsibilities:

- Accept percentile and filter parameters
- Query cutoff dataset
- Apply classification logic (Safe / Target / Dream)
- Return structured results

Dependencies:

- Cutoff repository only

Failure in predictor should not impact:

- Booking
- Updates
- Guides

---

### Cutoffs Module

Responsibilities:

- Store and manage historical cutoff data
- Provide filtered query access
- Support predictor engine

This module does not depend on predictor logic.

---

### Updates Module

Responsibilities:

- Publish official CET updates
- Provide chronological listing
- Store notification metadata

Independent of:

- Booking
- Predictor
- Cutoffs

---

### Booking Module

Responsibilities:

- Slot management
- Booking creation
- Google Meet link generation
- Email confirmation
- Booking status tracking

If email delivery fails:

- Booking record must still be stored
- Error must be logged
- System must not crash

---

### Guides Module

Responsibilities:

- Manage downloadable PDF metadata
- Track downloads
- Capture lead information

Completely independent of prediction logic.

---

### Admin Module

Responsibilities:

- Protected access control
- Manage updates
- Upload cutoff datasets
- Monitor bookings
- View leads

All admin routes must be protected by role-based middleware.

---

### Auth Module

Session login/logout for admin users; JWT-based session cookie issuance and
validation.

### Resources Module

Public downloadable resource listing, admin upload/toggle/delete — parallel
to, but distinct from, the Guides module.

### FAQs Module

Public FAQ listing; admin CRUD. Backs the chatbot's rule-based matching
layer (see Chatbot Module below) as well as the public FAQ page.

### Settings Module

Admin-editable `platform_settings` (booking slots, announcement banner,
contact info), exposed read-only to the public via `/api/v1/settings/*`.

### Chatbot Module

Rule-based FAQ matching first; below-threshold queries fall through to RAG
retrieval + Gemini generation over `rag_chunks` (pgvector embeddings).
Unanswered/low-confidence queries are logged to `unanswered_queries` for
admin review. Full decision flow and confidence thresholds are documented in
[`CHATBOT_ARCHITECTURE.md`](../CHATBOT_ARCHITECTURE.md).

### WhatsApp Module

Meta Cloud API webhook — reuses the chatbot module's answering logic for a
WhatsApp channel. Rate-limited per `wa_id`, with Redis-based `msg.id` dedup.

---

## 5. Error Isolation Strategy

Each module handles its own errors using:

- Try/catch at service layer
- Standardized error response format
- Centralized error handler middleware
- Structured logging

Example error response format:

{
"success": false,
"error": {
"code": "MODULE_ERROR",
"message": "Descriptive message"
}
}

No module should throw unhandled exceptions to the global runtime.

---

## 6. Dependency Rules

Strict rules enforced:

- Controllers do not access database directly
- Services do not access request objects
- Repositories do not contain business logic
- Modules do not import other module internals
- Shared utilities contain no business rules

Allowed dependency direction:

Controller → Service → Repository

Not allowed:

Repository → Service  
Service → Controller

---

## 7. Feature Toggles

There is currently no environment-based feature-flag system. All modules'
routes are registered unconditionally in `server.ts`. Individual external
integrations degrade gracefully when unconfigured instead (e.g. no
`GEMINI_API_KEY` → chatbot skips RAG generation and falls back; no
`REDIS_URL` → caching/rate-limiting/dedup disabled gracefully; no Google
Calendar credentials → mock meeting links). Module-level enable/disable
flags remain a possible future addition, not a current capability.

---

## 8. Database Interaction Model

Each module interacts only with its own tables.

Example separation:

- bookings → Booking module
- colleges / courses / cutoffs → Cutoffs module (normalized schema; the
  legacy flat `cutoff_data` table is RLS-locked and retained only as a
  revert backup — see [`CUTOFFS_DB_REDESIGN.md`](CUTOFFS_DB_REDESIGN.md))
- updates → Updates module
- guide_downloads → Guides module
- resources → Resources module
- faqs, unanswered_queries, rag_chunks → Chatbot module
- cap_schedule, document_checklist → content used by Predictor/Booking/Chatbot
- platform_settings → Settings module
- admin_users → Admin module

Cross-table access must be minimal and justified.

Indexes must be used for:

- Percentile filtering
- College search queries
- Booking time lookup

---

## 9. External Service Integration

External services are abstracted through service wrappers.

Example:

- EmailService
- CalendarService

Modules depend on abstractions, not direct implementations.

This allows:

- Replacing Gmail SMTP with another email provider
- Disabling calendar integration
- Testing with mock services in development

---

## 10. Security Architecture

- Role-based middleware for admin routes
- Input validation at API boundary
- Rate limiting on booking and predictor endpoints
- Environment-based configuration
- No direct exposure of internal service keys

Sensitive operations are never handled on the client side.

---

## 11. Scalability Path

The modular structure allows future separation into microservices:

- predictor-service
- booking-service
- content-service

Because modules are already isolated, migration would require minimal refactoring.

---

## 12. Future Expansion Strategy

Planned expansion modules:

- JEE Main Admission Module
- NEET Admission Module
- Multi-Year Cutoff Analytics Engine
- Reporting and Data Intelligence Dashboard

New modules must follow the same architecture pattern and isolation principles.

---

## 13. Observability, Performance Baselines, and SLOs

### 13.1 Performance Baseline profiling
Endpoint latency profiling (`npm run profile:endpoints`, from the backend
directory) exists as a local script — it is **not** wired into CI. The
backend's CI job (`.github/workflows/ci.yml`) only runs `npm ci`, lint,
typecheck, and test; it does not build/start the app, run the profiler, or
upload a `backend-profile-baseline` artifact. Profiling against
`GET /api/v1/cutoffs`, `POST /api/v1/predict`, and `GET /api/v1/cutoffs/meta`
is a manual, developer-run step today. Wiring it into CI remains a possible
future improvement, not a current capability.

### 13.2 Service Level Objectives (SLOs) & Alert Thresholds
Pragmatic service-level goals suitable for student-project production deployment:

#### Availability Targets
*   **API Liveness (`GET /api/v1/health`):** 99.9% monthly availability target.
*   **API Readiness (`GET /api/v1/ready`):** 99.5% monthly availability target.
*   *Alert Thresholds:*
    *   **Critical:** 3 consecutive readiness failures (2-minute interval).
    *   **Warning:** Readiness error rate > 5% over 15 minutes.

#### Latency Targets (p95)
*   `GET /api/v1/cutoffs`: $\le$ 700ms
*   `POST /api/v1/predict`: $\le$ 900ms
*   `GET /api/v1/cutoffs/meta`: $\le$ 500ms
*   *Alert Thresholds:*
    *   **Warning:** p95 exceeds target for 3 consecutive measurement windows.
    *   **Critical:** p95 exceeds 1.5x target for any 2 consecutive windows.

#### Error Rate & Booking Flow Goals
*   **Public/Admin 5xx Rate:** < 1% over 15-minute rolling window.
*   **Booking Success Rate (`POST /api/v1/bookings`):** $\ge$ 98% success (excluding validation errors).
*   *Alert Thresholds:*
    *   **Critical:** 5xx $\ge$ 3% over 10 minutes, or booking success rate < 95% over 15 minutes.

#### Incident Webhook Integration
Use these optional environment variables to automatically stream logs/errors to external monitoring channels:
*   **Backend:** `ERROR_WEBHOOK_URL` (non-blocking)
*   **Frontend:** `NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL` (non-blocking)

