# DATABASE_SCHEMA.md

## 1. Design Principles

- Module-based table separation with minimal cross-table coupling.
- Indexed query optimisation for cutoff filtering and predictor queries.
- UUID primary keys everywhere.
- All timestamps stored as `TIMESTAMPTZ` (UTC-aware).
- Row Level Security (RLS) enabled on all tables to block Supabase Data API access where not needed.

Each module interacts primarily with its own table.

---

## 2. Tables

### 2.1 cutoff_data

Stores historical cutoff records used by the cutoff explorer and the college predictor.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key, `gen_random_uuid()` |
| year | INTEGER | e.g. 2025 |
| college_code | TEXT | Nullable |
| college_name | TEXT | Not null |
| branch_code | TEXT | Nullable |
| branch | TEXT | Not null |
| category | TEXT | e.g. OPEN, OBC, SC, ST, TFWS |
| gender | TEXT | Nullable — All / Female |
| home_university | TEXT | Defaults to 'All' |
| college_status | TEXT | Nullable |
| stage | TEXT | Nullable — I / II / III / IV (CAP round) |
| level | TEXT | Nullable — State Level / Home University Level |
| city_normalized | TEXT | Nullable; derived and cached from college name |
| percentile | DECIMAL(6,4) | Not null |
| cutoff_rank | INTEGER | Nullable |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes** (from migrations 001 and 002)

- `idx_cutoff_year` — `(year)`
- `idx_cutoff_category` — `(category)`
- `idx_cutoff_branch` — `(branch)`
- `idx_cutoff_percentile` — `(percentile)`
- `idx_cutoff_home_university` — `(home_university)`
- `idx_cutoff_college_name` — `(college_name)`
- `idx_cutoff_composite` — `(year, category, branch)`
- `idx_cutoff_college_code` — `(college_code)`
- `idx_cutoff_meta_year_branch` — `(year, branch)`
- `idx_cutoff_year_stage_rank` — `(year, stage, cutoff_rank) WHERE cutoff_rank IS NOT NULL`
- `idx_cutoff_predictor_filters` — `(year, stage, category, level, cutoff_rank) WHERE cutoff_rank IS NOT NULL`
- GIN trigram indexes on `branch` and `college_name` for `ILIKE` queries.

---

### 2.2 bookings

Tracks student consultation booking records.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| student_name | TEXT | Not null |
| email | TEXT | Not null |
| phone | TEXT | Not null |
| percentile | DECIMAL(5,2) | Not null |
| category | TEXT | Not null |
| branch_preference | TEXT | Not null |
| meeting_purpose | TEXT | Defaults to 'General admission guidance' |
| meeting_time | TIMESTAMPTZ | Not null |
| meet_link | TEXT | Not null |
| booking_status | TEXT | `CHECK IN ('scheduled','confirmed','cancelled','completed','no_show')` |
| email_status | TEXT | Defaults to 'pending' |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_bookings_meeting_time` — `(meeting_time)`
- `idx_bookings_email` — `(email)`
- `idx_bookings_status` — `(booking_status)`
- `idx_bookings_unique_active_slot` — `UNIQUE (meeting_time) WHERE booking_status NOT IN ('cancelled', 'no_show')` — prevents double-booking

---

### 2.3 updates

Stores CET notifications and announcements.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | TEXT | Not null |
| content | TEXT | Not null |
| published_date | TIMESTAMPTZ | Not null, default now() |
| edited_at | TIMESTAMPTZ | Nullable; set on edit |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_updates_published_date` — `(published_date DESC)`
- `idx_updates_edited_at` — `(edited_at DESC)`

---

### 2.4 guides

Stores metadata for downloadable PDF guides.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | TEXT | Not null |
| description | TEXT | Not null |
| file_url | TEXT | Not null |
| is_active | BOOLEAN | Defaults to true |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_guides_is_active` — `(is_active)`

---

### 2.5 guide_downloads

Tracks guide download lead capture.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| guide_id | UUID | Foreign key → `guides.id` |
| name | TEXT | Not null |
| email | TEXT | Not null |
| percentile | DECIMAL(5,2) | Nullable |
| downloaded_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_guide_downloads_email` — `(email)`
- `idx_guide_downloads_guide_id` — `(guide_id)`

---

### 2.6 resources

Stores downloadable resources (seat matrices, circulars, etc.).

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | TEXT | Not null |
| description | TEXT | Not null |
| file_url | TEXT | Not null |
| category | TEXT | Defaults to 'Others' |
| is_active | BOOLEAN | Defaults to true |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_resources_active_category_created_at` — `(is_active, category, created_at DESC)`

---

### 2.7 faqs

Stores FAQ entries for the public FAQ section.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| question | TEXT | Not null |
| answer | TEXT | Not null |
| display_order | INTEGER | Defaults to 0 |
| is_active | BOOLEAN | Defaults to true |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_faqs_active_display_order` — `(is_active, display_order, created_at)`

---

### 2.8 admin_users

Stores admin accounts for the dashboard.

**Columns**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | TEXT | Unique, not null |
| password_hash | TEXT | bcrypt hash |
| role | TEXT | `CHECK IN ('admin')` |
| created_at | TIMESTAMPTZ | Default now() |

**Indexes**

- `idx_admin_users_email` — `(email)`

---

## 3. Relationships

- `guide_downloads.guide_id` → `guides.id`
- No direct dependency between `bookings` and `cutoff_data`
- `admin_users` is independent of all other tables

Cross-module joins are intentionally avoided to preserve module isolation.

---

## 4. Row Level Security

RLS is enabled on all tables. Key policies:

| Table | Policy |
|---|---|
| `cutoff_data` | Public SELECT (read-only) |
| `updates` | Public SELECT |
| `faqs` | Public SELECT where `is_active = true` |
| `guides` | Public SELECT where `is_active = true` |
| `resources` | Public SELECT where `is_active = true` |
| `admin_users` | No access via Supabase Data API |
| `bookings` | No access via Supabase Data API |
| `guide_downloads` | No access via Supabase Data API |

All writes go through the Express API, never through the Supabase Data API directly.

---

## 5. Migration System

Migrations are SQL files in `backend/migrations/` run in alphabetical order at startup. Applied migrations are tracked in `schema_migrations` to prevent re-runs.

