# RAG source content — CAP 2026 Process Guide, §3–4

This is the verbatim source text for the Phase 2 step (b) RAG corpus (the
seat-mechanics cluster — see `CHATBOT_ARCHITECTURE.md` §3.1/§3.5). It is
copied unmodified from the CAP 2026 Process Guide the project owner authored
and had fact-verified earlier in this project (the same document that seeded
the Phase 2 step (a) FAQ content). It previously existed only in chat history
for this project, not in the repo — kept here so future sessions building on
step (b) have the source without re-deriving or re-requesting it.

The facts below (the 300-choice cap, the "order = priority" rule, and the
between-rounds editing rule) were already verified as part of the step (a)
FAQ work; they are not re-verified here. This file is the citation source for
the chunked rows in `rag_chunks` — if the guide is ever revised, re-chunk from
here rather than from the live database.

---

## 3. Freeze / Float / Slide — the core concept

| Option | What it means | What happens next |
|---|---|---|
| Freeze | Satisfied with the allotted seat. Final decision. | Exit CAP entirely. No further rounds. Pay fee, report to college. |
| Float | Accept the current seat as a fallback, but want a better college/branch combo in the next round. | Stay in the running for Round 2. If something better comes through, Round 1 seat is auto-cancelled and replaced. If not, keep the Round 1 seat — it's not lost. |
| Slide | Same idea as Float, but scoped to the same college, hoping for a better branch within it. | Same mechanic as Float, but the algorithm only tries to upgrade the branch within that one college. |

Critical safety net: with Float or Slide, the current seat is never lost —
even if no upgrade comes through, the student keeps what they already had,
provided the seat acceptance fee is paid.

The "Auto-Freeze" trap: If a student lists a college/branch as their #1
preference and actually gets allotted that #1 choice, the system
automatically freezes it — no float/slide option, no choice in the matter.
Only put something at #1 if 100% certain, even if it's not the most
"ambitious" reach. A common mistake is putting a dream-but-uncertain college
at #1 and getting auto-locked into it.

## 4. Choice filling / option form

Students can fill up to 300 choices, though most realistically fill 20–60.

General guidance: fill at least 15–20 choices minimum to maximize chances
across all rounds — under-filling is one of the most common regrets students
report.

Order = priority, not just "best to worst" by cutoff. The algorithm processes
top to bottom and allots the highest-ranked choice the student is eligible
for in that round.

Filling more doesn't increase risk — it only increases flexibility. A long
list doesn't lock a student into a bad outcome; it just gives the algorithm
more options to try.

Between rounds, there's usually a limited window to modify choices if the
student chose Float/Slide (not if they Froze). If floating, the student can
add, remove, or reorder choices — including new colleges ranked above the
current allotted rank, since that's the whole point of betterment. The
system only moves the student if it finds them eligible for something
higher-ranked than their current allotted rank; anything added below the
current rank is irrelevant since the current seat already outranks it.
