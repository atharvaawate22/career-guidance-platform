-- Migration 019: Defensive closer on the Class XII eligibility FAQ
-- Purpose: The minimum-eligibility FAQ states hard figures (45% open / 40%
-- reserved). Those were independently confirmed correct for the current cycle,
-- but they are external policy that can be revised between cycles, so this
-- appends the same "confirm against the official brochure" hedge that the
-- category-documents FAQ already carries — the outcome of the full FAQ audit.
--
-- Idempotent: the append only fires when the closer is not already present.

UPDATE faqs
SET answer = answer || $q$ Always confirm the current eligibility criteria against the official CAP information brochure, as these minimums can be revised between cycles.$q$
WHERE question = $q$What is the minimum Class XII requirement for engineering admission via MHT-CET?$q$
  AND answer NOT LIKE '%confirm the current eligibility criteria against the official CAP information brochure%';
