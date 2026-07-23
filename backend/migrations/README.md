# Database migrations

This project uses a **baseline + deltas** model. The numbering does not start at
`001`, which is intentional — read this before adding a migration.

## The two pieces

1. **Baseline — [`../src/config/schema.sql`](../src/config/schema.sql)**
   The full, current schema (all tables, indexes, RLS policies). It is written
   with `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so it is
   idempotent. Apply it once when provisioning a fresh database:

   ```sh
   psql -U postgres -d career_guidance -f src/config/schema.sql
   ```

   (On Supabase, run it in the SQL editor.)

2. **Deltas — `migrations/NNN_*.sql`**
   Incremental changes applied *on top of* the baseline. They run automatically
   and idempotently at server startup via `runMigrations()`
   ([`../src/config/migrations.ts`](../src/config/migrations.ts)), and can also
   be run manually:

   ```sh
   npm run migrate
   ```

   The runner sorts `*.sql` files alphabetically, applies any not yet recorded,
   and records each applied filename in the `schema_migrations` table so it is
   never run twice.

## Why numbering starts at 008

Migrations `001`–`007` from early development were consolidated into the
`schema.sql` baseline and removed from this directory. Everything from `008`
onward is a delta layered on that baseline. A fresh database is therefore
provisioned by applying `schema.sql` first, then letting the runner apply
`008`+ — not by replaying `001`+ (which no longer exist).

## Adding a migration

1. Create `NNN_short_description.sql` using the next number after the highest
   existing file (zero-padded to 3 digits, e.g. `012_add_x.sql`).
2. Keep it **idempotent** where practical (`IF NOT EXISTS`, `IF EXISTS`,
   guarded `DO $$ ... $$` blocks) so re-runs and partial failures are safe.
3. If the change is structural and permanent, also reflect it in `schema.sql`
   so the baseline stays an accurate description of the current schema.
4. Destructive steps (`DROP`, column removal) should be called out in a comment
   at the top of the file.

## Current deltas

| File | Purpose |
|------|---------|
| `008_cleanup_unused_indexes.sql` | Drop unused single-column indexes; add trigram/composite + predictor-filter indexes |
| `009_meeting_time_timestamptz.sql` | Convert `bookings.meeting_time` to `TIMESTAMPTZ`; add active-future partial index |
| `010_platform_settings.sql` | Add `platform_settings` key/value table |
| `011_bookings_meeting_time_unique.sql` | Unique index enforcing one active booking per time slot |
| `012_cutoffs_redesign.sql` | Normalized colleges/courses/cutoffs schema |
| `013_secure_legacy_tables.sql` | RLS lockdown for legacy tables kept only as revert backups |
| `014_cap_schedule.sql` | `cap_schedule` table — structured CAP round dates for the chatbot (placeholder rows, `is_confirmed = false`, until DTE releases the official schedule) |
| `015_document_checklist.sql` | `document_checklist` table — seeded CAP admission document list for the chatbot |
| `016_unanswered_queries.sql` | `unanswered_queries` table — logs chatbot fallback queries as the Phase 2 RAG content backlog |
| `018_seed_cap_faqs.sql` | Seed nine reviewed CAP-guidance FAQ rows + append the TFWS opt-in clause (Phase 2 step a; idempotent) |
| `019_faq_eligibility_closer.sql` | Append a "confirm against the official brochure" hedge to the Class XII eligibility FAQ (FAQ-audit outcome; idempotent) |
| `020_rag_chunks.sql` | `rag_chunks` table (`pgvector`) — Phase 2 step (b) RAG corpus storage |
