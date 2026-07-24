# DATABASE_SCHEMA.md

## 1. Design Principles

The database is designed with the following principles:

- Module-based table separation
- Minimal cross-table coupling
- Indexed query optimization for cutoff filtering
- Clear distinction between operational data and content data
- Future-ready for multi-year expansion

Each module interacts primarily with its own tables. Baseline tables live in
`backend/src/config/schema.sql`; everything added afterward lives in
`backend/migrations/` (numbered, run automatically on server start).

---

## 2. Tables Overview

### 2.1 colleges / courses / cutoffs

Historical cutoff data used by the cutoff explorer and predictor. This is a
normalized three-table design (migration `012_cutoffs_redesign.sql`), not a
flat table — see [`CUTOFFS_DB_REDESIGN.md`](CUTOFFS_DB_REDESIGN.md) for the
full rationale and source-data mapping.

**`colleges`**
- college_code (TEXT, Primary Key)
- name, status, minority_type, minority_group, home_university
- city (display town), city_normalized (district — used for filtering/grouping)
- created_at

**`courses`**
- id (UUID, Primary Key)
- choice_code (TEXT, unique)
- college_code (FK → colleges.college_code)
- course_name, branch_group
- created_at

**`cutoffs`**
- id (UUID, Primary Key)
- course_id (FK → courses.id)
- academic_year, cap_round (1–4)
- allotment_pool, stage, category_code, gender, category, subquota
- closing_rank, closing_percentile
- created_at
- UNIQUE (course_id, academic_year, cap_round, allotment_pool, stage, category_code)

**Indexes**
- `idx_cutoffs_predict` on (academic_year, cap_round, category, gender, closing_rank) including closing_percentile
- `idx_cutoffs_course` on (course_id)
- `idx_colleges_city_norm`, `idx_colleges_minority`
- `idx_courses_college`, `idx_courses_branch`, trigram index on course_name

**Legacy table:** the old flat `cutoff_data` table (year/college_name/branch/
category/gender/home_university/percentile) is superseded. It's RLS-locked
(migration `013_secure_legacy_tables.sql`) and kept in the live database only
as a revert backup — not queried by the application and not recreated by
`schema.sql`.

---

### 2.2 bookings

Stores consultation booking records.

**Fields**

- id (UUID, Primary Key)
- student_name, email, phone (TEXT)
- percentile (DECIMAL(10,7))
- category, branch_preference (TEXT)
- meeting_purpose (TEXT, default `'General admission guidance'`)
- meeting_time (TIMESTAMPTZ, indexed)
- meet_link (TEXT)
- booking_status (TEXT, default `'scheduled'`)
- email_status (TEXT, default `'pending'`)
- created_at (TIMESTAMPTZ)

**Indexes**
- `idx_bookings_meeting_time` on (meeting_time)
- `idx_bookings_status` on (booking_status)
- `idx_bookings_meeting_time_active_unique` — partial unique index on
  meeting_time excluding cancelled/no_show/completed rows, preventing double
  booking at the DB level (migration `011_bookings_meeting_time_unique.sql`)

Purpose:
Tracks consultation lifecycle and meeting automation data.

---

### 2.3 updates

Stores official CET notifications and updates.

**Fields**

- id (UUID, Primary Key)
- title, content (TEXT)
- published_date (TIMESTAMPTZ, indexed)
- edited_at (TIMESTAMPTZ, nullable)
- source_url (TEXT, nullable — link to the official notice; migration `017_updates_source_url.sql`, only populated going forward)
- created_at

Purpose:
Chronological display of verified, official-sourced CET updates.

---

### 2.4 guides / resources

Two parallel content tables for downloadable material.

**`guides`** — id, title, description, file_url, is_active, created_at.
Downloads go through `guide_downloads` (lead capture).

**`resources`** — id, title, description, file_url, category
(default `'Others'`), is_active, created_at. No download/lead-capture table;
public listing only.

---

### 2.5 guide_downloads

Tracks guide download activity and lead capture.

**Fields**

- id (UUID, Primary Key)
- guide_id (FK → guides.id)
- name, email (TEXT)
- percentile (DECIMAL(10,7), nullable)
- downloaded_at (TIMESTAMPTZ)

Purpose:
Lead tracking and analytics.

---

### 2.6 admin_users

Stores authorized admin accounts.

**Fields**

- id (UUID, Primary Key)
- email (TEXT, unique, indexed)
- password_hash (TEXT)
- role (TEXT)
- created_at (TIMESTAMPTZ)

There is no `name` or `is_active` column — role-based access is via `role`
only; deactivation is done by removing/rotating the account, not a soft-delete flag.

---

### 2.7 faqs

Public FAQ content, also backing the chatbot's rule-based matching layer.

**Fields**

- id (UUID, Primary Key)
- question, answer (TEXT)
- display_order (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)

---

### 2.8 platform_settings

Admin-editable key/value config, read-only to the public via
`/api/v1/settings/*` (migration `010_platform_settings.sql`).

**Fields**

- key (TEXT, Primary Key)
- value (JSONB)
- updated_at (TIMESTAMPTZ)

Seeded keys: `booking_slots`, `announcement`, `contact_info`.

---

### 2.9 cap_schedule

Structured CAP round dates used by the chatbot (migration `014_cap_schedule.sql`).

**Fields**

- id (UUID, Primary Key)
- academic_year, cap_round (1–4)
- event_name, start_date, end_date
- is_confirmed (BOOLEAN)
- notes (TEXT)
- created_at
- UNIQUE (academic_year, cap_round, event_name)

---

### 2.10 document_checklist

Seeded CAP admission document checklist content for the chatbot (migration
`015_document_checklist.sql`).

**Fields**

- id (UUID, Primary Key)
- category (TEXT, default `'general'`)
- display_order (INTEGER)
- document_name, description (TEXT)
- is_active (BOOLEAN)
- created_at
- UNIQUE (category, document_name)

---

### 2.11 unanswered_queries

Logs chatbot fallback/low-confidence queries for admin review — the RAG
content backlog (migration `016_unanswered_queries.sql`).

**Fields**

- id (UUID, Primary Key)
- channel (TEXT — e.g. `web`, `whatsapp`)
- raw_message (TEXT)
- contact_identifier (TEXT, nullable)
- created_at (TIMESTAMPTZ, indexed)

Not exposed via the Supabase Data API — no public read policy; read only
from the backend (`GET /api/v1/admin/unanswered-queries`).

---

### 2.12 rag_chunks

pgvector storage for the chatbot's RAG corpus (migration `020_rag_chunks.sql`).

**Fields**

- id (UUID, Primary Key)
- topic_label (TEXT, unique)
- source_section (TEXT)
- content (TEXT)
- embedding (vector(384))
- created_at, updated_at

No approximate-nearest-neighbor index (ivfflat/hnsw) — at the corpus's
current small size a sequential scan is both fast enough and more accurate;
revisit if the corpus grows into the hundreds (see
[`CHATBOT_ARCHITECTURE.md`](../CHATBOT_ARCHITECTURE.md) §6).

---

## 3. Relationships

- guide_downloads.guide_id → guides.id
- courses.college_code → colleges.college_code
- cutoffs.course_id → courses.id
- No direct dependency between bookings and cutoffs
- Admin users are independent of public user data

Cross-module joins are minimized to preserve module isolation.

---

## 4. Indexing Strategy

Critical indexes:

- cutoffs: `idx_cutoffs_predict`, `idx_cutoffs_course`
- colleges: `idx_colleges_city_norm`, `idx_colleges_minority`
- courses: `idx_courses_college`, `idx_courses_branch`, trigram on course_name
- bookings.meeting_time, bookings partial unique active-slot index
- updates.published_date
- admin_users.email
- unanswered_queries.created_at

Indexing ensures fast predictor/explorer queries and booking management
operations.

---

## 5. Data Retention Strategy

- Cutoff data retained indefinitely for historical analysis
- Booking data retained for operational and analytics purposes
- Update records retained permanently
- Download records may be archived after defined period (optional)

---

## 6. Scalability Considerations

Future enhancements:

- Partition cutoffs by academic_year if volume grows significantly
- Add composite indexes for heavy query combinations
- Introduce analytics tables for percentile trend analysis
- Separate reporting database if traffic scales significantly

The schema is intentionally normalized but avoids over-normalization to maintain query performance.
