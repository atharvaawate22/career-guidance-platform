# DATABASE_SCHEMA.md

## 1. Design Principles

The database is designed with the following principles:

- Module-based table separation
- Minimal cross-table coupling
- Indexed query optimization for cutoff filtering
- Clear distinction between operational data and content data
- Future-ready for multi-year expansion

Each module interacts primarily with its own tables.

---

## 2. Tables Overview

### 2.1 cutoff_data

Stores historical cutoff information used by both the cutoff explorer and predictor engine.

**Fields**

- id (UUID, Primary Key)
- year (INTEGER, indexed)
- college_name (VARCHAR, indexed)
- branch (VARCHAR, indexed)
- category (VARCHAR, indexed)
- gender (VARCHAR, nullable)
- home_university (VARCHAR, indexed)
- percentile (DECIMAL(5,2), indexed)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**Indexes**

- (year, category, branch)
- (percentile)
- (college_name)

Purpose:
Optimized for percentile-based filtering and college lookup queries.

---

### 2.2 bookings

Stores consultation booking records.

**Fields**

- id (UUID, Primary Key)
- student_name (VARCHAR)
- email (VARCHAR, indexed)
- phone (VARCHAR)
- percentile (DECIMAL(5,2))
- category (VARCHAR)
- branch_preference (TEXT)
- meeting_time (TIMESTAMP, indexed)
- meet_link (TEXT)
- booking_status (VARCHAR)  // scheduled, completed, cancelled
- email_status (VARCHAR)    // sent, failed, pending
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Purpose:
Tracks consultation lifecycle and meeting automation data.

---

### 2.3 updates

Stores official CET notifications and updates.

**Fields**

- id (UUID, Primary Key)
- title (VARCHAR)
- content (TEXT)
- official_link (TEXT)
- published_date (DATE, indexed)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Purpose:
Chronological display of verified CET updates.

---

### 2.4 guides

Stores metadata for downloadable PDF guides.

**Fields**

- id (UUID, Primary Key)
- title (VARCHAR)
- description (TEXT)
- file_url (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Purpose:
Manage guide visibility and metadata without storing large binary data in database.

---

### 2.5 guide_downloads

Tracks guide download activity and lead capture.

**Fields**

- id (UUID, Primary Key)
- guide_id (UUID, Foreign Key → guides.id)
- name (VARCHAR)
- email (VARCHAR, indexed)
- percentile (DECIMAL(5,2), nullable)
- downloaded_at (TIMESTAMP)

Purpose:
Lead tracking and analytics.

---

### 2.6 admin_users

Stores authorized admin accounts.

**Fields**

- id (UUID, Primary Key)
- name (VARCHAR)
- email (VARCHAR, unique, indexed)
- password_hash (TEXT)
- role (VARCHAR)  // super_admin, editor
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Purpose:
Role-based access control for admin dashboard.

---

## 3. Relationships

- guide_downloads.guide_id → guides.id
- No direct dependency between bookings and cutoff_data
- Admin users are independent of public user data

Cross-module joins are minimized to preserve module isolation.

---

## 4. Indexing Strategy

Critical indexes:

- cutoff_data.percentile
- cutoff_data.year
- cutoff_data.category
- cutoff_data.branch
- bookings.meeting_time
- bookings.email
- updates.published_date
- admin_users.email

Indexing ensures fast predictor queries and booking management operations.

---

## 5. Data Retention Strategy

- Cutoff data retained indefinitely for historical analysis
- Booking data retained for operational and analytics purposes
- Update records retained permanently
- Download records may be archived after defined period (optional)

---

## 6. Scalability Considerations

Future enhancements:

- Partition cutoff_data by year
- Add composite indexes for heavy query combinations
- Introduce analytics tables for percentile trend analysis
- Separate reporting database if traffic scales significantly

The schema is intentionally normalized but avoids over-normalization to maintain query performance.
