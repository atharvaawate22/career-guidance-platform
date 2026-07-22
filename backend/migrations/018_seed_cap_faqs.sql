-- Migration 018: Seed CAP guidance FAQs (Phase 2 step a)
-- Purpose: Add nine reviewed FAQ rows covering CAP process guidance that
-- compresses cleanly to single-answer Q&A (the RAG-scope decision — see
-- CHATBOT_ARCHITECTURE.md), plus a one-sentence opt-in clause on the existing
-- TFWS FAQ. Content was reviewed and figures independently verified before
-- this migration was written; year-variable structural facts are either scoped
-- to the current cycle in the text (round count) or omitted.
--
-- Idempotent: each INSERT is guarded by WHERE NOT EXISTS on the exact question,
-- and the TFWS UPDATE only appends when the clause is not already present.
-- Dollar-quoted ($q$...$q$) literals avoid apostrophe escaping.

-- 1. Option form strategy
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$How many choices should I fill in the CAP option form, and does the order matter?$q$,
  $q$Fill generously — at least 15–20 choices, and more if you have realistic options, since under-filling is one of the most common regrets students report. The order is a priority list, not just best-to-worst by cutoff: the allotment algorithm works down your list and gives you the highest-ranked choice you are eligible for in that round. Adding more choices only increases flexibility — it never locks you into a worse outcome, because a lower choice is only ever used if none of your higher choices work out. You can fill up to 300 choices in total, though most students realistically fill somewhere between 20 and 60.$q$,
  16
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$How many choices should I fill in the CAP option form, and does the order matter?$q$);

-- 2. HU vs OHU
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$What is the difference between Home University (HU) and Other Than Home University (OHU) seats?$q$,
  $q$Each institute reserves roughly 70% of its seats for candidates from that college's own "home university" region (HU) — for example SPPU/Pune University, Mumbai University, RTMNU Nagpur, or BAMU Aurangabad — with the remaining ~30% (OHU) open to candidates from other university regions. Because the OHU pool is smaller and draws from a much larger set of candidates statewide, OHU cutoffs at a given institute are consistently tighter than HU cutoffs — so a college can be far more reachable for you as an HU candidate than the raw percentile-based cutoff suggests. Check which university region a college falls under before assuming a cutoff applies to you — you can compare cutoffs on the Cutoff Finder, or book a session if you'd like help with your specific case.$q$,
  17
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$What is the difference between Home University (HU) and Other Than Home University (OHU) seats?$q$);

-- 3. CAP rounds + quota split (round count scoped to the 2026 cycle)
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$How many CAP rounds are there, and how are seats divided between Maharashtra and other states?$q$,
  $q$For the current 2026 admission cycle, the Centralized Admission Process has three centralized CAP rounds (Round 1, Round 2, and Round 3), followed by an Institutional Round (Round 4) that participating institutes use to fill seats still vacant after the centralized rounds. The number of rounds has varied in past years, so if you're reading this in a later cycle, confirm the current round count in the Updates section rather than assuming it's four. Regardless of the round count, around 85% of seats are reserved for Maharashtra-domicile candidates (the State quota) and about 15% for the All India Quota (candidates domiciled outside Maharashtra), and every round follows the same sequence: choice filling (the option form), a merit-based allotment, your accept/freeze/float/slide decision with fee payment, and then reporting to the allotted college. Exact dates for each round are announced by the State CET Cell — check the Updates section for the latest official schedule.$q$,
  18
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$How many CAP rounds are there, and how are seats divided between Maharashtra and other states?$q$);

-- 4. Branch-change myth
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Can I change my branch after the first year if I don't get the branch I want?$q$,
  $q$Treat branch change after first year as very unlikely, not a backup plan. Some colleges technically allow an internal branch transfer after year one based on your CGPA, but in practice it is rare — the number of transfer seats is very small and the CGPA cutoffs are high. Do not choose a college or branch on the assumption that you will switch to a more preferred branch (such as Computer Science) later; decide as if the branch you are allotted is the branch you will graduate in.$q$,
  19
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Can I change my branch after the first year if I don't get the branch I want?$q$);

-- 5. Agent / guaranteed-seat scams
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Are agents or consultants who promise a "guaranteed seat" in CAP genuine?$q$,
  $q$No — anyone charging for a "guaranteed seat" through CAP is not worth your money. CAP allotment is a transparent, algorithm-driven process based only on your merit (percentile and category) and the preference order you submit. No agent, consultant, or middleman can influence your rank, change a cutoff, or reserve a seat for you outside the published process. The only things that affect your allotment are your score, your category, and how you fill your option form.$q$,
  20
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Are agents or consultants who promise a "guaranteed seat" in CAP genuine?$q$);

-- 6. Locking the option form
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$What happens if I fill the option form but don't confirm or lock it before the deadline?$q$,
  $q$An option form that is filled but not finally confirmed/locked before the deadline does not count — it is treated exactly as if you had entered nothing. A partially filled or unsubmitted form is void, so you must complete the final Confirm/Lock step within the window to take part in that round's seat allotment. Always finish and lock your choices before the deadline, and don't assume that simply entering choices has secured you a place in the round.$q$,
  21
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$What happens if I fill the option form but don't confirm or lock it before the deadline?$q$);

-- 7. ILS / against-CAP-vacancy seats
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$If I don't get a seat through the CAP rounds, do I have any other legitimate options?$q$,
  $q$Yes. Beyond the CAP rounds, many colleges fill remaining seats directly through Institute Level Seats (ILS) — often around 20% of a college's intake — and through "against-CAP-vacancy" rounds for seats left empty after CAP closes. These are legitimate, merit-based seats, not donation seats, and they are a real second path if the CAP rounds don't work out for you. Watch the Updates section and individual college notices for when these seats open, since the process and timing are decided by the colleges.$q$,
  22
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$If I don't get a seat through the CAP rounds, do I have any other legitimate options?$q$);

-- 8. Final-round cutoffs as baseline
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Can I use the final round's cutoffs as a baseline for how competitive a college is?$q$,
  $q$It's better to rely on the Round 1 and Round 2 cutoffs as your reference for how competitive a college or branch genuinely is. The final centralized round's cutoffs are often skewed lower by stray vacancies and last-minute withdrawals, so they can make a college look easier to get into than it really is in a normal year. Use the earlier rounds to judge a realistic cutoff, and treat the final round as the exception rather than the rule. You can compare cutoffs across rounds on the Cutoff Finder.$q$,
  23
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Can I use the final round's cutoffs as a baseline for how competitive a college is?$q$);

-- 9. When to start documents
INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$When should I start getting my admission documents ready?$q$,
  $q$Start early — well before your results if you haven't already — especially for documents that take time to obtain. A Caste Validity Certificate and a Non-Creamy Layer Certificate (for the relevant reserved categories) can take weeks to come through, so waiting until CAP begins often causes avoidable stress or missed deadlines. Keep originals and photocopies of your standard documents (marksheets, scorecard, domicile, ID, and category certificates where applicable) organised and ready before the rounds start. You can see the full document checklist any time from the assistant's menu.$q$,
  24
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$When should I start getting my admission documents ready?$q$);

-- TFWS opt-in clause appended to the existing FAQ (idempotent — only if absent).
UPDATE faqs
SET answer = answer || $q$ Note that TFWS is a separate consideration you must opt into — you have to select it as a specific choice type when filling your option form, as it is not applied automatically.$q$
WHERE question = $q$What is the Tuition Fee Waiver Scheme (TFWS)?$q$
  AND answer NOT LIKE '%opt into%';
