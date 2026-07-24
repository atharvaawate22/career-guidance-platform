# API_SPEC.md

## 1. API Design Principles

- RESTful structure
- JSON request and response format
- Standardized success and error responses
- Clear separation between public and admin routes
- No business logic inside controllers
- All validation handled at API boundary

Base URL: `/api/v1` — this prefix is live and enforced, not aspirational.
Any request under `/api/*` that isn't `/api/v1/*` is rejected by
`backend/src/server.ts` before reaching a route handler.

---

## 2. Standard Response Format

### Success Response

```
{
"success": true,
"data": { ... }
}
```

### Error Response

```
{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Descriptive error message"
}
}
```

All endpoints follow this format.

---

## 3. Public Endpoints

### 3.1 Get CET Updates

**GET** `/api/v1/updates`

Query Parameters (optional): `page`, `limit`

### 3.2 Get Cutoffs

**GET** `/api/v1/cutoffs`

Query parameters filter by college/course/category/CAP round rather than the
old flat branch/percentile shape — see
[`CUTOFFS_DB_REDESIGN.md`](CUTOFFS_DB_REDESIGN.md) §3 for the current
`colleges` / `courses` / `cutoffs` schema and response fields
(`cap_round`, `allotment_pool`, `category_code`, `closing_rank`,
`closing_percentile`, etc).

**GET** `/api/v1/cutoffs/meta` — filter metadata (available years, colleges, categories)

### 3.3 College Predictor

**POST** `/api/v1/predict`

Request Body:

```
{
"percentile": 92.5,
"category": "OPEN",
"gender": "Male",
"home_university": "SPPU",
"preferred_branches": ["Computer Engineering", "IT"]
}
```

Response:

```
{
"success": true,
"data": {
"safe": [ ... ],
"target": [ ... ],
"dream": [ ... ]
}
}
```

Classification logic handled entirely within the predictor service
(`backend/src/modules/predictor`).

### 3.4 Booking

**GET** `/api/v1/bookings/slots` — available slots
**POST** `/api/v1/bookings` — create a booking

Response includes a `booking_id` and a Google Meet link (mock link generated
if Google Calendar credentials are not configured). Booking still returns
success if the confirmation email fails to send; the failure is logged
internally.

### 3.5 Guides

**GET** `/api/v1/guides` — list guides
**POST** `/api/v1/guides/download` — download (lead capture; `guide_id` in body)

### 3.6 Resources

**GET** `/api/v1/resources`

### 3.7 FAQs

**GET** `/api/v1/faqs`

### 3.8 Settings (public)

**GET** `/api/v1/settings/booking-slots`
**GET** `/api/v1/settings/announcement`
**GET** `/api/v1/settings/contact-info`

### 3.9 Chatbot

**POST** `/api/v1/chatbot`

Rule-based FAQ matching first; if confidence is below threshold, falls
through to RAG retrieval + Gemini generation
(`backend/src/modules/chatbot/gemini.service.ts`). Unanswered/low-confidence
queries are logged to `unanswered_queries` for admin review. See
[`CHATBOT_ARCHITECTURE.md`](../CHATBOT_ARCHITECTURE.md) for the full
decision flow, confidence thresholds, and RAG pipeline.

### 3.10 WhatsApp Webhook

**GET** `/api/v1/whatsapp/webhook` — Meta verification handshake
**POST** `/api/v1/whatsapp/webhook` — incoming message receipt

Rate-limited per `wa_id` (not IP); always returns `200` even when
rate-limited, since Meta treats non-200 as delivery failure and retries.
Incoming `msg.id` is deduped via Redis (`SET NX`, 7-day TTL); fails open
(processes the message) if Redis is unavailable. See
[`CHATBOT_ARCHITECTURE.md`](../CHATBOT_ARCHITECTURE.md) §6.

---

## 4. Auth Endpoints

**POST** `/api/v1/admin/login`

Request Body:

```
{
"email": "admin@example.com",
"password": "password"
}
```

Response sets an httpOnly session cookie (JWT-based).

**GET** `/api/v1/admin/session` — current session status

---

## 5. Admin Endpoints

All admin endpoints require authentication (session cookie) and
role-based authorization.

- **Updates**: `POST /api/v1/admin/updates`, `PUT /api/v1/admin/updates/:id`, `DELETE /api/v1/admin/updates/:id`
- **Guides**: `GET/POST /api/v1/admin/guides`, `GET /api/v1/admin/guides/downloads`, `PATCH /api/v1/admin/guides/:id/toggle`, `DELETE /api/v1/admin/guides/:id`
- **Resources**: `GET/POST /api/v1/admin/resources`, `PATCH /api/v1/admin/resources/:id/toggle`, `DELETE /api/v1/admin/resources/:id`
- **FAQs**: `GET/POST /api/v1/admin/faqs`, `PUT /api/v1/admin/faqs/:id`, `PATCH /api/v1/admin/faqs/:id/toggle`, `DELETE /api/v1/admin/faqs/:id`
- **Settings**: `GET /api/v1/admin/settings`, `PUT /api/v1/admin/settings/:key`
- **Analytics**: `GET /api/v1/admin/analytics`
- **Unanswered chatbot queries**: `GET /api/v1/admin/unanswered-queries`
- **Bookings**: `GET /api/v1/admin/bookings`, `PATCH /api/v1/admin/bookings/:id`, `DELETE /api/v1/admin/bookings/:id`
- **Cutoffs upload**: `POST /api/v1/admin/*` (see `admin.upload.routes.ts`)

Route files: `backend/src/modules/admin/admin.routes.ts`,
`admin.bookings.routes.ts`, `admin.upload.routes.ts`.

---

## 6. Rate Limiting

Rate-limited endpoints (`backend/src/middleware/rateLimit.ts`):

- `/api/v1/predict`
- `/api/v1/bookings` (POST), `/api/v1/bookings/slots` (GET)
- `/api/v1/guides/download`
- `/api/v1/cutoffs` (public read limiter)
- `/api/v1/admin/login` (auth limiter)
- `/api/v1/whatsapp/webhook` (per-`wa_id`, always 200 — see §3.10)
- `/api/v1/chatbot` (own rate limiter inside the route module)

---

## 7. Error Codes

Examples:

- INVALID_INPUT
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- PREDICTOR_FAILED
- BOOKING_FAILED
- EMAIL_DELIVERY_FAILED
- INTERNAL_SERVER_ERROR

---

## 8. Versioning

`/api/v1/...` is the live and only supported prefix today — not a future
plan. New breaking versions would be introduced as `/api/v2/...` alongside
it, not as an in-place change.

---

## 9. Testing Requirements

- Unit tests for services
- Integration tests for API endpoints
- Mocked external services for calendar and email
- Validation testing for predictor classification logic

API contracts must remain consistent and backward-compatible.
