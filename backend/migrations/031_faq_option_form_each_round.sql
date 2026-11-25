-- Migration 031: FAQs on the per-round option form
-- Purpose: in the 2026 cycle every CAP round had its own option-form window,
-- but nothing in the FAQ table said so. The chatbot answered "do I need to
-- fill the option form again for round 2?" with the "how many choices" FAQ,
-- "can I edit my option form between rounds?" with the fallback, and "can I
-- change my choices after round 1 if I floated?" with the branch-change FAQ.
-- The old guide PDFs had also taught the opposite ("you do not need to
-- resubmit"), so this is a misunderstanding worth answering directly.
--
-- Two questions because students ask two different things (whether to
-- refill, and who may change choices). Question wording measured against the
-- live table (similarity()): "do i need to fill the option form again for
-- round 2" -> 0.617 (best existing 0.307); "can i edit my option form between
-- rounds" -> 0.655 (best existing 0.198); "can i change my choices after
-- round 1 if i floated" -> 0.397 (branch-change FAQ 0.300). Existing
-- questions keep their own FAQs ("how many choices" 0.647 vs <=0.324 here).
--
-- Dates and rules are the 2026-27 notices (Admission Notice 4, vacancy
-- notices of 19 and 29 Aug 2026) and are scoped to that cycle in the text.
-- Idempotent: guarded by WHERE NOT EXISTS on the exact question.

INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Do I need to fill a new option form for every CAP round?$q$,
  $q$Yes, in the 2026-27 cycle. Each CAP round had its own option-form window, which opened after that round's vacant seats were published: Round II on 7 to 9 August, Round III on 20 to 22 August and Round IV on 30 August to 1 September 2026. If you are still in CAP (you accepted a seat with Float, or you have no seat yet) and want to be considered for a better seat in a round, fill and confirm that round's form inside its window; a form that is not confirmed counts as not filled. Check this year's notice, because the round structure can change.$q$,
  28
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Do I need to fill a new option form for every CAP round?$q$);

INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Can I change my option form choices between CAP rounds?$q$,
  $q$Yes, if you are still in CAP. In the 2026-27 cycle each round had a fresh option form built from that round's vacancies, so students who accepted a seat with Float (or Slide, where offered) and students without a seat could add, remove or reorder choices. If you chose Freeze, or your seat was frozen automatically (your 1st choice in Round I, one of your first 3 in Round II or one of your first 6 in Round III), you have left CAP and cannot change your choices. Only list seats you would accept: a better allotment replaces the seat you floated.$q$,
  29
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Can I change my option form choices between CAP rounds?$q$);
