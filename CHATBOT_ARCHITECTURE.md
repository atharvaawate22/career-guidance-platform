# CET Hub Chatbot — Architecture

This document tracks the design of the CET Hub chatbot feature: a rule-based
(Phase 1) assistant that answers MHT-CET admission questions on two channels
— the website and WhatsApp — plus a RAG layer (Phase 2) for the conceptual
questions Phase 1's keyword/FAQ matching can't cover.

It exists to capture *why* decisions were made, including what was
deliberately **not** built and why, so this reasoning survives past the code
itself — useful both for future maintenance and for explaining the scoping
choices in a technical interview.

**Status: both phases are implemented and verified end-to-end.** Phase 1
(§2) is the rule-based bot across website + WhatsApp. Phase 2 (§3) is FAQ
content + defer branches (step a) plus the pgvector/Gemini RAG pipeline
(step b), wired in as the final fallback after Phase 1's keyword router and
FAQ match have both declined.

---

## 1. Overall architecture — one shared brain, two channel adapters

The core design principle: the website widget and the WhatsApp bot are two
*delivery channels* for the same decision logic, not two separate chatbots.

```
Website widget  ──POST /api/v1/chatbot/message──┐
                                                   ├──▶  chatbot.service.getReply()  ──▶  Postgres (cutoffs, cap_schedule,
WhatsApp (Meta)  ──POST /api/v1/whatsapp/webhook─┘         (the "brain")                 document_checklist, faqs,
                                                                                          unanswered_queries)
```

- **`backend/src/modules/chatbot/chatbot.service.ts`** is the channel-agnostic
  decision engine. `getReply(message, channel, contactIdentifier)` takes a
  raw string and returns a `ChatReply` (`{ text, quickReplies, matched }`).
  It has no knowledge of HTTP, Express, or WhatsApp's message format — it is
  a pure function of "message in, decision out."
- **`chatbot.controller.ts` + `chatbot.routes.ts`** are the website adapter:
  a thin `POST /api/v1/chatbot/message` endpoint that validates the body and
  calls `getReply()`.
- **`whatsapp.controller.ts` + `whatsapp.routes.ts`** are the WhatsApp
  adapter: a webhook that verifies the request came from Meta, extracts the
  incoming text message, calls the *exact same* `getReply()`, and posts the
  reply back through the Cloud API's `POST /messages` endpoint.

Neither adapter contains any intent-matching, SQL, or "what should I say"
logic — that all lives in one place. Adding a third channel (e.g. Instagram
DMs) later would mean writing a third thin adapter, not forking the bot.

### Why this split, concretely

The alternative — building the WhatsApp bot as its own thing — would have
meant the cutoff-lookup regex, the CAP-date logic, and the fallback/logging
behavior all needing to be written and kept in sync twice. Two students
asking "cutoff for COEP CS" on the website vs. on WhatsApp get answered by
the same code path, so a fix or new intent lands on both channels at once.

---

## 2. Phase 1 — rule-based / keyword-matching, no LLM

### What it does

- **Menu**: a flat, globally-numbered menu (`chatbot.constants.ts`
  `MENU_OPTIONS`) shown on "hi"/"menu"/"help" or a bare `1`–`6` reply.
- **Keyword/pattern intents** (`chatbot.service.ts`): regex matching on the
  normalized message routes to one of: cutoff lookup, CAP dates, document
  checklist, predictor pointer, counselor handoff.
- **FAQ search, weighed against the keyword match**: a `pg_trgm` similarity
  search over the existing admin-managed `faqs` table runs on *every* message,
  and a confident FAQ hit outranks a keyword intent rather than losing to it
  — see [§2.4](#24-faq-matching-and-confidence-based-routing).
- **True fallback**: anything still unmatched gets a fixed "I didn't
  understand that" reply and is logged to `unanswered_queries`
  ([§5](#5-the-unanswered-query-feedback-loop)).
- **Direct SQL, no LLM anywhere**: cutoff percentiles, CAP round dates, and
  document checklists are all answered by parameterized Postgres queries
  against the existing `cutoffs`/`colleges`/`courses` tables plus two new
  ones (`cap_schedule`, `document_checklist`).

### 2.1 Why rule-based, not an LLM, for Phase 1

MHT-CET admission questions in this scope split cleanly into two kinds:

1. **Structured lookups** — "cutoff for X", "when is round 2", "what
   documents do I need" — have a single correct answer sitting in Postgres.
   An LLM call here would be strictly worse: slower, costs money, and can
   hallucinate a wrong cutoff number where a `SELECT` cannot.
2. **Conceptual/procedural questions** — "what's the difference between
   float and freeze" — are Phase 2's job (RAG), not Phase 1's.

So Phase 1 deliberately covers only the first kind, with the admin-managed
FAQ table as a stopgap for a handful of the second kind that already existed
as structured Q&A content (see 2.4). No LLM API call happens anywhere in
Phase 1 — this was a hard constraint, not just a starting point, because of
the cost model below.

### 2.2 Cost rationale: why WhatsApp is student-initiated only

WhatsApp's Cloud API is free for **service conversations** — any message
sent within 24 hours of the user's last message to you — but charges per
message for **business-initiated conversations** (a business messaging a
user first, outside that window).

The booking flow already assumed a `wa.me` deep link as an entry point; this
build makes that real: the WhatsApp CTA (in the booking flow and in the
website chat widget) always opens a `wa.me/<number>?text=...` link, meaning
**the student always sends the first message**. Every conversation this bot
handles is therefore inside the free service-conversation window.

**Deliberately not built in Phase 1: any business-initiated / proactive
messaging** (e.g. "your CAP round 2 result is out, check now"). That would
require either a student having messaged in the last 24h, or a paid
[message template](https://developers.facebook.com/docs/whatsapp/pricing),
both of which are a deliberate cost/scope line for a later phase, not an
oversight.

### 2.3 Statelessness — no conversation/session state

The bot does not store any per-user or per-session conversation state,
anywhere (no Redis session, no DB row keyed by phone number or browser
session). This was a genuine design choice, not a shortcut:

- The root menu (`MENU_OPTIONS`) is **flat and globally numbered** — there
  is no nested sub-menu where "1" means one thing after picking option A and
  something else after picking option B. That means a bare `"1"`–`"6"` reply
  is unambiguous **without remembering what was shown before it**.
- Every other intent match works off the content of the single incoming
  message alone (keyword regex, or extracting a college/branch/category from
  one sentence like "cutoff for COEP CS OBC").

The tradeoff: there is no multi-turn slot-filling dialogue. If a student asks
"cutoff for COEP" without a branch, the bot asks for the branch back — but
if they reply with just the branch name, the bot has no memory of "COEP" and
re-asks from scratch instead of continuing the thread. For Phase 1's scope
(quick lookups, not a conversation), this was judged an acceptable
simplification: it avoids building session infrastructure (a Redis TTL store
keyed by browser session id / WhatsApp `wa_id`) for a rule-based bot where
most real questions ("cutoff for COEP CS OBC") already fit in one message.
If usage data shows students frequently drop off at a partial-info prompt,
revisit with a short-TTL Redis session (the project already uses Redis for
caching, so the infra exists) storing only the last extracted filter, not a
general conversation history.

### 2.4 FAQ matching and confidence-based routing

Rather than hardcoding strings like the float/freeze explanation into
`chatbot.service.ts`, conceptual answers come from a `pg_trgm` similarity
search over the existing admin-managed `faqs` table (already used by the
homepage FAQ section). This means:

- Admins can edit or add chatbot answers for conceptual questions from
  `/admin/faqs` — no deploy needed.
- The bot's copy and the website's visible FAQ copy can never drift apart,
  since they're the same rows.

Getting this to actually work took three corrections, each caught by testing
against the real FAQ table rather than reasoning about it. They're worth
recording because they're all the same underlying lesson — naive fuzzy
matching is confidently wrong in ways that only show up on real data.

**(a) Generic phrasing dominates trigram similarity.** Scoring the raw
sentence "difference between float and freeze" matched the *wrong* FAQ —
"What is the difference between e-Scrutiny and Physical Scrutiny?" (0.364)
over the correct Freeze/Float/Slide one (0.274) — because the shared
boilerplate "difference between … and" contributes more trigrams than the
topic words do. Stripping filler words before scoring fixes it.

**(b) …but stripping filler is not safe either.** The first version of the
filter reused the stopword list built for *college-name extraction*, which
deliberately discards domain words ("cutoff", "percentile", "branch") because
in "cutoff for COEP CS" everything but the college name is noise. Applied to
FAQ search that gutted the actual topic: "what is the difference between
percentile and percentage" reduced to just `"percentage"`, scoring 0.195
against its own FAQ. There are now two separate lists — `NAME_STOPWORDS` and
`FAQ_STOPWORDS` — because the two jobs want opposite things.

Since neither the raw nor the filtered form is reliable alone, and taking the
higher of the two just reintroduces (a), the final rule scores **both** forms
and combines them by **agreement**:

| | raw form picks | filtered form picks | outcome |
|---|---|---|---|
| "difference between percentile and percentage" | correct FAQ (0.649) | correct FAQ (0.195) | agree → confidence 0.649 ✅ |
| "difference between float and freeze" | e-Scrutiny (0.364) ✗ | Freeze/Float (0.274) ✓ | disagree → trust filtered ✅ |

**(c) The keyword router was short-circuiting the FAQ search entirely.**
Intent regexes ran first and returned unconditionally, so any conceptual
question containing a trigger word never reached the FAQ table at all.
Measured against the live FAQ rows, 4 of 10 real questions were being
hijacked — "what is the difference between percentile and percentage" and
"what is the source of the cutoff data" both contain cutoff/percentile
triggers and were answered with a nonsensical *"Which college?"* despite
having exact FAQ entries.

The router now evaluates both and compares confidence. Thresholds were picked
from measured scores, not guessed:

- **`FAQ_OVERRIDE_CONFIDENCE = 0.35`** — bar an FAQ must clear to beat a
  matched keyword intent. Real conceptual questions score 0.41–0.79; genuine
  structured lookups ("cutoff for COEP CS", "when is round 2", "which college
  can I get with 95 percentile") top out at 0.20. 0.35 sits in that gap with
  margin on both sides.
- **`FAQ_MIN_CONFIDENCE = 0.2`** — bar when no keyword intent matched at all.

The cost is one extra query per message (scoring every active FAQ in a single
round trip over a table of tens of rows), which is well worth removing a whole
class of confidently-wrong answers.

**Keyword-intent ordering (predictor before cutoff).** The intent regexes are
tried in order, first match wins, and `PREDICTOR` is checked before `CUTOFF`
on purpose. "which college can I get with 95 percentile" contains "percentile",
which also triggers `CUTOFF` — and because a cutoff lookup names a specific
college while a predictor question never carries a predictor phrase
(chance/eligible/which college/predict), ordering predictor first captures the
overlap without stealing genuine cutoff queries. Before this order that
question hit `CUTOFF` and dead-ended on "Which college?" despite being exactly
what the predictor answers.

**Short-query rescue with `word_similarity()`.** `similarity()` is
length-normalised, so a short query is diluted by the long FAQ question around
the match: "what is TFWS" scores only 0.125 against "What is the Tuition Fee
Waiver Scheme (TFWS)?" and used to fall through. `word_similarity()` is not
length-normalised — it scores the best contiguous run — and rates that pair at
1.000. It is added as a **rescue**, not a replacement, because measuring it
across the real FAQ table showed it is too generous to trust as the primary
signal (a structured lookup like "cutoff for COEP CS" scores 0.538 on a shared
substring). Two guards keep the rescue safe, both derived from measured scores
on the `word_similarity()` scale — deliberately re-measured rather than reusing
the 0.35/0.20 numbers, which live on the `similarity()` scale:

- **`WORD_SIM_RESCUE = 0.70`** — short exact-ish hits ("tfws", "float",
  "e-scrutiny") land at 1.000; the highest non-matching query measured reaches
  0.615, so 0.70 clears the gap with margin.
- **A distinctive-token guard** — `word_similarity` rates a single generic
  domain word at 1.000 against any FAQ that contains it ("the college" →
  "college" → "How reliable is the College Predictor?" at 1.000). The rescue
  only fires when the filtered query still holds a non-generic token after
  `RESCUE_GENERIC_WORDS` (college, cutoff, branch, predictor, seat, …) are
  removed; queries made only of generic words are already keyword-routed.
- **Scope guard** — the rescue is consulted **only** on the no-keyword-intent
  path, never to override a structured lookup, so its generosity can't hijack
  a cutoff/date/document query.

Measured result: "what is TFWS" / "tfws" / "what is float" / "what is
e-scrutiny" now answer from the FAQ table; "branch", "seat", "good morning" and
junk still fall through and log.

### 2.5 Cutoff lookups: one answer per course, never a silent pick

A cutoff row is identified by (course, CAP round, allotment pool, category,
stage), so answering "cutoff for X" means collapsing several rows into one
number — and the collapse is where it's easy to be quietly wrong.

Within a single course and round, the correct closing cutoff is the **worst**
rank (`closing_rank DESC`) — that's the last candidate admitted. The first
implementation applied that tiebreak while deduping on `cap_round` **alone**,
which silently extended "worst rank" *across different courses*: at a college
where the keyword matched six computer branches, it reported the least
selective one as if it were the branch the student asked about.

Measured against live 2025 data for Vishwakarma Institute of Technology, Pune:

| Branch matched by "computer" | Round 1 closing |
|---|---|
| Computer Engineering | **98.9469989** |
| CSE (AI & ML) | 98.4416943 |
| CSE (Artificial Intelligence) | 98.2046366 |
| Computer Engineering (Software Engineering) | 98.1993682 |
| CSE (Data Science) | 98.0894834 |
| CSE (IoT & Cyber Security) | **97.9240683** ← what the bot reported |

A student with 98.2 percentile would have read "VIT computer = 97.92" and
concluded Computer Engineering was comfortably in reach, when it actually
closed a full percentile point higher. In an admissions tool that is the
worst category of bug: not a crash, just a number that looks authoritative
and is wrong in the direction that costs someone a seat.

Two changes fix it:

1. **`DISTINCT ON (course_id, cap_round)`** — the course is part of the
   dedup key, so "worst rank" stays scoped to a single course, which is what
   it actually means.
2. **The service decides how to present multiple courses instead of the SQL
   silently choosing one.** One matched course → per-round breakdown. Several
   → every course listed with its own cutoff, most selective first.

Because `BRANCH_ALIASES` deliberately maps a whole family to one keyword
(`cse` → `computer`), the alias alone can never distinguish Computer
Engineering from CSE (Data Science). So the multi-course reply invites the
student to narrow it, and `narrowCoursesByMessage()` makes that a real
affordance rather than a dead-end prompt: it matches the extra words they
typed against the matched course names — either the full course name
("…computer engineering") or the distinguishing words ("data science",
"cyber"). When the message is still ambiguous it lists everything; it never
guesses.

### 2.6 College acronyms: unambiguous alias vs. ambiguous prompt

Students type acronyms, not registered names ("COEP", not "COEP Technological
University"), so `COLLEGE_ALIASES` maps each to a name fragment verified to
resolve to exactly one row. But some acronyms are shared by several genuinely
distinct, well-known colleges — resolving those to one silently is the same
confidently-wrong failure as the cutoff bug above. Enumerated against the live
`colleges` table:

| Acronym | Plausible colleges | Decision |
|---|---|---|
| **MIT** | MIT Academy of Engineering (Alandi); Maharashtra Institute of Technology (Aurangabad / Thane); Marathwada Mitra Mandal's COE (Pune) | **ambiguous → prompt** |
| **VIT** | Vishwakarma Institute of Technology (Pune); Vidyalankar Institute of Technology (Mumbai) | **ambiguous → prompt** |
| **ICT** | Institute of Chemical Technology, Matunga (flagship) + a location-qualified off-campus | single flagship default |
| COEP, VJTI, PICT, … | one dominant college each | single alias |

MIT and VIT move to `AMBIGUOUS_COLLEGE_ACRONYMS`, where each maps to a list of
candidates. The bot lists them and asks — unless the message already carries a
distinguishing word (`resolveAmbiguousAcronym()` checks each candidate's
keywords), so "VIT pune" resolves to Vishwakarma and "VIT mumbai" to
Vidyalankar without a prompt, while a bare "VIT" asks. ICT and the rest keep a
single flagship interpretation because their alternatives are branch campuses
or colleges rarely called by the bare acronym — the same reason "COEP" safely
means one college. "MIT maharashtra" resolves to the "Maharashtra Institute of
Technology" hint, which itself matches two campuses (Aurangabad, Thane) and so
lands on the ordinary second-level "which one did you mean?" list — correct,
not a bug.

### 2.7 The `unanswered_queries` feedback loop

See [§5](#5-the-unanswered-query-feedback-loop) — every fallback is logged.
This is the explicit bridge from Phase 1 to Phase 2: the backlog of things
students actually asked that the rule-based bot couldn't answer is exactly
the content Phase 2's RAG corpus needs to cover, instead of guessing.

The backlog is read through an authenticated admin endpoint,
`GET /api/v1/admin/unanswered-queries` (`authMiddleware` + `requireAdminRole`,
read-only, same shape as the existing `/admin/analytics`). It returns the
questions **grouped by frequency**, most-asked first, so content work can be
prioritised by demand rather than eyeballing raw rows:

- Grouping key is a normalized message — `regexp_replace(btrim(lower(
  raw_message)), '\s+', ' ', 'g')` — so case, edge whitespace, and internal
  whitespace runs collapse into one row with a true count. ("What is the AUTO
  FREEZE trap" and "  what is the auto freeze trap  " are one group.)
- `contact_identifier` is never selected — prioritising content needs the
  questions, not who asked them (it stays out of this read path entirely).
- `?days=` (default 90, max 365) and `?limit=` (default 100, max 500) bound
  the window; a summary block reports total / unique / per-channel counts.

**Still deferred:** retention/purge for this table (see §6). The read path
exists; the aging-out policy does not yet.

### 2.8 WhatsApp Cloud API wiring

- `GET /api/v1/whatsapp/webhook` — Meta's one-time verification handshake
  (`hub.mode` / `hub.verify_token` / `hub.challenge`), checked against
  `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/v1/whatsapp/webhook` — incoming message receipt. Responds `200`
  immediately (Meta retries aggressively on slow/non-2xx responses, which
  would otherwise fan out into duplicate replies), then processes messages
  asynchronously: extract text → `chatbot.service.getReply()` → send the
  reply back via the Graph API.
- **Signature verification, fail-closed**: incoming webhook POSTs are checked
  against Meta's `X-Hub-Signature-256` header (HMAC-SHA256 over the raw request
  body, keyed by `WHATSAPP_APP_SECRET`) so the endpoint can't be fed fake
  "incoming messages" by anyone who finds the URL. This needs the *raw* request
  bytes (JSON.parse output can't be re-serialized byte-identically), so the
  route gets its own `express.json({ verify: captureRawBody })` ahead of the
  global body parser — the same pattern already used in `server.ts` for the
  admin/cutoffs bulk-import endpoint's larger body limit.

  The app secret is set *independently* of the send credentials, so the check
  keys off whether the bot can send, not just whether the secret is present:
  - secret set → verify every request;
  - secret unset **and** sends configured (`ACCESS_TOKEN` + `PHONE_NUMBER_ID`)
    → **reject (500)**. This is a misconfigured live deployment — accepting
    unsigned payloads while dispatching real messages is the exact hole to
    avoid, so it fails closed rather than open;
  - secret unset **and** sends not configured → skip, so the pipeline stays
    testable in local/mock mode before any credentials exist.

  `isSendConfigured()` is the single source of truth for "can the bot send",
  shared between the sender and this check. Covered by
  `tests/whatsapp.signature.test.ts`.
- **Graceful "not configured yet" mode**: with no credentials set, the webhook
  still runs its full pipeline (verification handshake, message receipt,
  chatbot logic, DB logging) — only the final "send it back to WhatsApp" call
  is skipped and logged. This mirrors the existing `EMAIL_PROVIDER=mock` /
  optional `GOOGLE_CLIENT_ID` pattern elsewhere in the codebase, and meant the
  whole pipeline could be built and verified (via a simulated webhook POST)
  before a real Meta Business App exists. Note the fail-closed rule above: the
  moment sends are switched on, the app secret stops being optional.

### 2.9 Seed-data migrations must carry their own conflict target

Both new content tables ship with seed rows, and `migrations/README.md`
requires migrations to be idempotent. `ON CONFLICT DO NOTHING` looks like it
satisfies that, but it only does anything if some constraint can actually be
violated — and the sole constraint on a table keyed by
`id UUID DEFAULT gen_random_uuid()` is a primary key that never collides. The
first version of `015_document_checklist.sql` had exactly that shape, so
re-running it would have silently appended a second copy of the whole
checklist and the chatbot would have listed all 13 documents twice.

Both seeds now declare the natural key they're idempotent on —
`UNIQUE (category, document_name)` in 015, `UNIQUE (academic_year, cap_round,
event_name)` in 014 — and name it in the conflict target. 015 also carries a
guarded `ALTER TABLE … ADD CONSTRAINT` block, because `CREATE TABLE IF NOT
EXISTS` is a no-op on databases that already applied the earlier version, so
an inline `UNIQUE` alone would never reach them. Verified by applying the
file three times against the live database: row count holds at 13.

---

## 3. Phase 2 — RAG for conceptual questions

**Status: both steps are BUILT and verified end-to-end. Step (a) — the content
classification, the new FAQ rows, and the router defer branches (migration
018 + `chatbot.service.ts`). Step (b) — the pgvector table (migration 020),
the `embed` Supabase Edge Function, ingestion of the 10 seat-mechanics
chunks, retrieval with a calibrated confidence floor, and the Gemini
generation adapter, wired into `getReply()` as the final fallback.**

### 3.1 What became FAQ vs. RAG — the scope decision

The supplied CAP guidance was classified topic-by-topic against a single test:
*does answering require synthesising two or more concepts, or does it compress
to one Q&A pair?* Most of it compressed — so most of it became **FAQ rows**
(step a), not RAG. RAG is reserved for the one genuinely synthesis-heavy
cluster.

| Content | Home | Why |
|---|---|---|
| Freeze/Float/Slide mechanics + Auto-Freeze trap + seat-floor guarantee; float-betterment ↔ choice-modification interaction | **RAG corpus** (step b) | Real questions combine 2–3 rules — e.g. "I floated round 1 and got better in round 2, do I lose my round 1 seat?" (float + seat-floor), "why did the system lock me into my #1?" (auto-freeze + preference order). A flat definition can't answer these. |
| Bare Freeze/Float/Slide definitions | FAQ (already existed, #7) | Compress to one row; the existing row already covers the safety-net idea. |
| Option-form strategy, HU vs OHU, CAP round/quota structure, branch-change myth, agent scams, form-locking, ILS/against-vacancy seats, final-round-cutoff caveat, document timing | **FAQ rows** (step a, migration 018) | Each compresses cleanly to a single answer. |
| Exam-format specifics, fee amounts, exact dates | **Defer** (never stored as fact) | Time-sensitive; route to /updates. |
| Personalised recommendations ("which branch for *me*") | **Defer** | Needs the student's own percentile/category/preferences — a human/tool decision, not corpus content. |

**Why HU vs OHU is FAQ, not RAG** (it was originally proposed as RAG): the
definition plus "your home-university region can make a college more reachable
than the OHU cutoff suggests" is *one* coherent fact, not a multi-hop
synthesis. The version that *would* need synthesis — "is COEP reachable for
**me** as OHU?" — is a personalised-reachability question, which is correctly a
**defer** case, not something either FAQ or RAG should own. So nothing about
HU/OHU lands in the RAG corpus.

A content-review discipline was applied to every FAQ row: any structural fact
that has changed year-to-year (the CAP round count — 3 in 2024, 4 in 2025/26)
is **scoped to the current cycle in the text itself** with a note to verify in
/updates for later years, so a student reading it in a future year gets a
dated fact rather than a silently stale one. Figures that couldn't be
independently confirmed as stable were omitted rather than asserted.

**What shipped, and the audit.** The nine new rows plus a one-sentence
opt-in clause on the existing TFWS row landed in `018_seed_cap_faqs.sql`
(idempotent — `WHERE NOT EXISTS` per exact question; append only when absent).
The same bar was then applied *retroactively* to the 16 pre-existing FAQ rows,
which predate this discipline and were already live. Result: 14 were clean
(conceptual/definitional, or already hedged with "confirm against the official
brochure"); two carried hard external-policy figures and were independently
verified as currently correct — the 45%/40% Class XII minimums and the NCL
"31 March of the admission year" validity. The NCL row uses a *relative*
formula ("of the admission year") that stays accurate across cycles, so it was
left as-is; the eligibility row's figures were correct but lacked a hedge, so
`019_faq_eligibility_closer.sql` appended the same brochure-confirmation closer
(idempotent). No transpositions or permanent-statements-of-cycle-variable-facts
were found in the existing rows. This is the "clean, verified FAQ foundation"
that step (b) builds on.

### 3.2 Query router — layered so RAG fires last (and rarely)

RAG is a *late* fallback, not a front door, which keeps LLM calls minimal:

```
message
  ├─ structured? (cutoff / dates / documents keywords) ──── Phase 1 SQL
  ├─ personalised-recommendation OR fee amount? ─────────── DEFER (built, step a)
  ├─ conceptual → FAQ trigram (Phase 1). Confident hit? ─── return FAQ row
  └─ conceptual, no FAQ match → RAG (step b):
        embed question → pgvector top-3–5 → confidence floor
             ├─ below floor ────────────────────────────── DEFER (never guess)
             └─ above floor ── grounded generation → answer
                   (still nothing) ───────────────────────── fallback + log
```

The **defer branches are already live** (step a): personalised-recommendation
questions ("which branch is best for me") point to /predictor and /book;
fee-amount questions point to /updates. They run *before* the keyword/FAQ
router and are `matched: true`, so they are never logged as unanswered. Date
questions were already deferred by the Phase-1 CAP-schedule intent.

### 3.3 RAG pipeline (step b)

1. **Chunk** only the seat-mechanics cluster (§3.1) — ~8–12 concept-scoped
   chunks (~80–250 tokens each), each with a topic-label header prepended to
   improve retrieval. The corpus is deliberately tiny; that smallness is what
   validates the skipped techniques in §4.
2. **Embed** with Supabase-native **`gte-small`** (384-dim) via an edge
   function — no new vendor or API key, and no load on the free-tier Render
   box. The pgvector column dimension is fixed to the model (384), so the
   choice is locked before the table is created; switching later means a
   re-embed.
3. **Store** chunks + embeddings in **pgvector** on the existing Postgres —
   no new database. `pgcrypto` and `pg_trgm` are already enabled
   (`012_cutoffs_redesign.sql`), so adding an extension has precedent.
4. **Retrieve**: embed the question, cosine-similarity search, top 3–5 chunks.
5. **Generate** with **Gemini 3.5 Flash** (free tier), under three
   grounding layers — see §3.4.

### 3.4 Grounding, generation, and the Gemini decision

The hard requirement — *answers draw only from retrieved chunks, never the
model's own training knowledge; if retrieval isn't confident or the question
touches a date/number, say so and point to /updates or a consultation, never
guess* — is enforced by the **pipeline, not the model**, in three layers:

1. **Router pre-filter** (§3.2): date/number/personalised questions never
   reach generation at all.
2. **Retrieval-confidence floor**: if the top chunk's similarity is below a
   calibrated threshold (same approach as the Phase-1 FAQ thresholds), don't
   generate — defer.
3. **Strict generation prompt**: answer only from the provided context; if it
   isn't there, say so and point to /updates or a consultation; never use
   outside knowledge; never state a date, fee, or number unless it appears
   verbatim in the context.

Because those three do the safety work, the model choice is about phrasing
quality, not the grounding guarantee. **Gemini 3.5 Flash (free tier)** is used
for generation — the project already avoids paid API keys, and a Gemini key
requires no credit card. The three safety layers are model-agnostic; only the
integration adapter differs from an Anthropic one: the strict-grounding rule
goes in Gemini's `systemInstruction` field, responses are parsed from
`candidates[].content.parts[].text` with a `finishReason` guard, and a
safety-blocked or empty Gemini response routes into the **same defer/fallback
path** as a below-floor retrieval (never surfaced as an error). Gemini's
thinking budget is set low (`thinkingBudget: 0`) for a short grounded answer,
and the generation call carries a 10s client-side timeout so a slow/overloaded
provider response can't stall a chatbot reply indefinitely — a timeout is
treated the same as any other generation failure.

**Model note.** The plan above originally named Gemini 2.5 Flash. By the time
step (b) was implemented, that model (and `gemini-2.5-flash-lite`) returned
`404 "no longer available to new users"` against a freshly-created API key,
and `gemini-2.0-flash` was deprecated (shut down 2026-06-01) and `429`d on
this key. Verified live against the actual key before committing to a
replacement: **Gemini 3.5 Flash** (launched 2026-05-19) is what actually
works, and Google's pricing page confirms a genuine free tier (free
input/output tokens, ~1,500 requests/day, 15 RPM, no card required) with the
same "may be used to improve products" caveat already accounted for below.
During implementation the free tier was also observed intermittently
returning `503 "high demand"` — handled by the same defer path as any other
generation failure, not a bug.

**Privacy note (Gemini free tier).** Unlike paid tiers, Gemini's free tier may
use prompt/response data for model training. When step (b) ships, the
user-facing privacy policy's *Chatbot and WhatsApp assistant* section (the same
disclosure added for chat logging) gets one line: conceptual questions routed
to the RAG assistant may be processed by a third-party model provider. That
line is **held until (b) goes live** rather than added now — disclosing a data
flow that doesn't yet exist would be inaccurate — but it's recorded here so it
ships with the feature, not after it.

### 3.5 Step (b) build checklist — the concrete work, in order

Each item followed the project's verification discipline (live before/after
evidence, flag uncertainty, no unrelated files in commits).

1. ✅ **Migration: pgvector + chunks table.** `020_rag_chunks.sql` adds
   `CREATE EXTENSION IF NOT EXISTS vector;` and `rag_chunks` — `id`,
   `topic_label` (unique, the upsert key), `source_section`, `content`,
   `embedding vector(384)`, timestamps. RLS enabled, no public policy (same
   as `unanswered_queries`) — verified live: `rls_enabled: true`,
   `policy_count: 0`. No ANN index — a plain sequential scan over ~10 rows is
   both fast enough and more accurate than ivfflat/hnsw at this size.
2. ✅ **Author + chunk the corpus.** Source: `docs/rag-source-content.md`
   (verbatim CAP 2026 Process Guide §3–4, previously only in chat history —
   now committed so it isn't lost again). 10 chunks — Freeze, Float, Slide,
   the seat-floor guarantee, the Auto-Freeze trap, choice-count guidance,
   order-is-priority, more-choices-is-flexibility, between-rounds editing
   eligibility, and betterment mechanics — split by question shape rather
   than the source's paragraph breaks (e.g. the seat-floor guarantee and the
   Auto-Freeze trap are their own chunks because they're the two synthesis
   questions this corpus exists to answer). Reviewed and approved before
   ingestion.
3. ✅ **Embedding ingestion.** `backend/scripts/ingest_rag_chunks.ts` —
   batches all 10 chunks into one call to the `embed` Edge Function, upserts
   by `topic_label`. Re-runnable when content changes. Ingestion is offline;
   only *query* embedding happens at request time, via the same function.
4. ✅ **Retrieval + confidence floor.** `chatbot.repository.ts`'s
   `searchRagChunks()` embeds the question and does a cosine-similarity
   search over `rag_chunks`, top 5. `RAG_CONFIDENCE_FLOOR = 0.85` in
   `chatbot.service.ts`, calibrated 2026-07-23 against 10 in-corpus synthesis
   questions (top-1 similarity 0.8720–0.9424) and 10 out-of-corpus/near-miss
   questions (top-1 similarity 0.7628–0.8308) — a small first-pass sample,
   not permanently correct; revisit if real RAG-deferred traffic in
   `unanswered_queries` suggests otherwise. All top-5 chunks are passed to
   generation regardless of individual score once the top chunk clears the
   floor — a legitimately relevant 2nd/3rd chunk is exactly what a multi-hop
   synthesis question needs, and the strict-grounding prompt handles
   filtering out anything genuinely irrelevant.
5. ✅ **Gemini generation adapter.** `chatbot/gemini.service.ts` mirrors
   `whatsapp.service.ts`'s mock-mode shape: `GEMINI_API_KEY` unset → logs and
   returns `null` (RAG defers) rather than throwing. The strict-grounding
   rule lives in `systemInstruction`; responses are parsed from
   `candidates[].content.parts[].text` with a `finishReason` guard;
   safety-blocked/empty responses route into the same defer path as a
   below-floor retrieval. Low thinking budget (`thinkingBudget: 0`). A 10s
   client-side timeout (`AbortController`) was added after a live test hung
   past what's acceptable for a chat reply — timeout is treated as any other
   generation failure. **Model note:** built against **Gemini 3.5 Flash**, not
   the originally-planned 2.5 Flash — see §3.4's model note for why.
6. ✅ **Wire into `getReply()`.** RAG runs as the final fallback, after the
   keyword router, the defer branches, and the FAQ trigram match (primary +
   rescue) have all declined. Replaces the old
   `logUnansweredQuery` + generic-fallback tail for the conceptual/no-match
   case with "try RAG; if it defers or returns nothing, log + generic
   fallback" — still logs to `unanswered_queries` when RAG can't answer.
7. ✅ **Privacy disclosure.** Added to the live
   `frontend/src/app/privacy/page.tsx` *Chatbot and WhatsApp assistant*
   section: conceptual questions the rule-based logic and FAQ don't cover may
   be answered via Google's Gemini API, grounded only in the site's own
   admission guidance, and that the free tier may process the question/answer
   to improve Google's models. Verified rendering live in the browser.
8. ✅ **Verify end-to-end.** Synthesis questions that a flat FAQ can't answer
   ("I floated round 1 and got better in round 2, do I lose my round 1 seat?")
   → grounded RAG answer; out-of-corpus / date / fee / personalised questions →
   defer, never a hallucinated fact; regression that all Phase-1 intents, the
   defer branches, and the FAQ path still work. Typecheck, lint, full test
   suite green before committing.

---

## 4. What we deliberately did *not* build, and why

This is the scoping reasoning to reuse when explaining these decisions —
each one trades a real capability for reduced complexity, on purpose, given
the actual size of this corpus.

- **No hybrid retrieval** (dense vector search + sparse/BM25 keyword search).
  Hybrid retrieval solves recall problems in large, vocabulary-diverse
  corpora. After the §3.1 scope decision this corpus is only ~10 chunks and
  topically narrow — dense vector search alone has strong recall at this
  scale, and hybrid would add a second search system, merge/reranking logic,
  and tuning effort without a measurable accuracy gain.

- **No reranking step** (e.g. cross-encoder reranking of retrieved chunks).
  Reranking matters when initial retrieval returns many marginally-relevant
  candidates from a large corpus. With top-5 retrieval over a small corpus,
  reranking has negligible impact.

- **No query expansion / query decomposition.** These techniques help with
  ambiguous or multi-part queries against large corpora. Student questions
  here are short and single-intent, so the added complexity isn't justified.

- **No multi-agent RAG or agentic pipelines.** This is a single-hop
  retrieval + generation task (retrieve relevant guidance, answer the
  question) — no multi-step reasoning or tool-use chain is needed.

- **No fine-tuning of any model.** RAG (grounding a general-purpose LLM in
  retrieved context) solves the accuracy problem without the cost/complexity
  of training a custom model.

- **No proactive/business-initiated WhatsApp messaging** (Phase 1, see
  [§2.2](#22-cost-rationale-why-whatsapp-is-student-initiated-only)). Every
  conversation is student-initiated to stay inside Meta's free
  service-conversation window; sending unprompted notifications would incur
  per-message cost and was scoped out, not forgotten.

- **No per-session conversation state** (Phase 1, see
  [§2.3](#23-statelessness--no-conversationsession-state)). The bot
  classifies each message independently; multi-turn slot-filling dialogue
  was scoped out in favor of a flat, globally-numbered menu.

---

## 5. The unanswered-query feedback loop

Every message that reaches the true fallback (no menu number, no intent
regex, no FAQ trigram match above threshold) is logged verbatim:

```sql
-- backend/migrations/016_unanswered_queries.sql
CREATE TABLE unanswered_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,            -- 'website' | 'whatsapp'
  raw_message TEXT NOT NULL,
  contact_identifier TEXT,          -- wa_id for WhatsApp, null for the anonymous web widget
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This is a deliberate feedback loop, not incidental logging: this table *is*
the backlog for what Phase 2's RAG corpus needs to cover. Instead of
guessing what conceptual content to write and chunk for RAG, the actual
questions students asked that the rule-based bot couldn't answer become the
prioritized content list. A query appearing here repeatedly is a strong
signal it deserves a chunk in Phase 2's corpus (or, if it's actually a
structured-data gap like the CAP-schedule table was, a Phase 1 fix instead).

That "appearing repeatedly" signal is surfaced by the admin read endpoint
described in [§2.7](#27-the-unanswered_queries-feedback-loop), which returns
these questions grouped by frequency so the highest-demand gaps rise to the
top on their own.

---

## 6. If this needed to scale significantly, what I'd revisit

Written to show scaling awareness without pretending the current scale
justifies any of it yet:

- **Hybrid retrieval (§4)** becomes worth it once the RAG corpus grows from
  "a few dozen chunks" to hundreds of documents with more varied
  terminology — at that point dense-only retrieval starts missing exact
  keyword matches (specific form numbers, exact certificate names) that BM25
  would catch, and the tuning cost of a second retrieval path is justified
  by a real recall problem instead of a hypothetical one.
- **Per-session conversation state (§2.3)** becomes worth it if usage data
  from `unanswered_queries` / real conversations shows students frequently
  abandon a multi-step lookup (e.g. give a college but never follow up with
  a branch) — a short-TTL Redis session keyed by browser session id / WhatsApp
  `wa_id`, storing only the last partial filter, would fix that without a
  full conversation-history system.
- **Reranking (§4)** becomes worth it alongside hybrid retrieval, once
  retrieval is regularly returning many marginally-relevant candidates that
  need reordering — not before.
- **Query router escalation to an LLM call (§3.1)** becomes worth it if the
  keyword/pattern classifier's false-positive rate on ambiguous questions
  (structured vs. conceptual) becomes a measurable problem — right now a
  cheap pattern check is enough because the two categories rarely overlap in
  phrasing.
- **College-name resolution** currently relies on curated acronym maps
  (`COLLEGE_ALIASES` for one-college acronyms, `AMBIGUOUS_COLLEGE_ACRONYMS`
  for shared ones — see §2.6), verified by hand against the live `colleges`
  table (e.g. "COEP" now officially resolves to "COEP Technological
  University", not the old "College of Engineering, Pune" name a naive alias
  would have assumed). This is a real data-drift risk: new colleges, renames,
  or acronym collisions will silently degrade match quality over time. At
  meaningful scale this would move to embedding-based entity resolution
  against the `colleges` table instead of a hand-maintained map — but for the
  ~20 well-known Maharashtra engineering colleges students actually abbreviate,
  curating and spot-checking a static list against the live data was faster
  and more predictable than standing up a fuzzy-entity-resolution system.
- **`cap_schedule` admin UI**: the table is currently seeded with placeholder
  rows for the cycle active when the migration was written and updated only
  by direct SQL. At any real usage volume this needs an admin-editable UI
  (matching the existing `platform_settings` pattern) so dates can be
  published the moment DTE releases them, instead of waiting on a code
  change.
- **WhatsApp webhook rate limiting + `msg.id` dedup**: flagged in an earlier
  review, not yet fixed. `chatbotLimiter` (`middleware/rateLimit`) is wired
  into `chatbot.routes.ts` (the website endpoint) but never applied to
  `whatsapp.routes.ts` — the WhatsApp webhook has no rate limiting at all.
  Separately, `whatsapp.controller.ts`'s `receiveMessage` never checks
  Meta's `msg.id` against anything already processed, so a retried delivery
  (Meta is at-least-once, and retries aggressively on slow/non-2xx
  responses — see §2.8) would be processed and answered a second time:
  a duplicate WhatsApp reply sent to the student, and, if it happened to
  fall through to the fallback path, a duplicate `unanswered_queries` row.
  Fix is two independent, low-risk additions: apply a rate limiter to the
  webhook route, and short-circuit `receiveMessage` when `msg.id` has
  already been seen (e.g. a short-TTL Redis set, matching the project's
  existing Redis-for-caching pattern).
- **Ladies-quota cutoff data is unreachable via the chatbot**: flagged in an
  earlier review, not yet fixed, and not something this session's RAG work
  touched. `getCutoffAnswer()` (`chatbot.repository.ts`) filters
  `co.gender IS DISTINCT FROM 'L'` unconditionally — General-seat cutoffs
  only — and neither `chatbot.constants.ts` nor `chatbot.service.ts` has any
  keyword detection for "ladies quota" or similar phrasing. A student who
  asks specifically about a ladies-quota seat gets the General-category
  cutoff back with no indication that a different, ladies-only number
  exists or was excluded. This isn't a rounding error: verified live against
  `cutoffs` — `gender = 'L'` rows are **33.7%** of all 92,050 rows (`G` is
  51.0%, `NULL` is 15.3%), so roughly a third of the table is silently
  unreachable through this path. Fix needs a ladies-quota keyword/intent,
  a `categoryToken`-style flag threaded into `getCutoffAnswer()` to switch
  the gender filter instead of hardcoding it out, and a disclosure line when
  a student asks in General terms at a college/branch where a ladies-quota
  row also exists.
- **Chat-log retention and purge**: the privacy policy now discloses that
  unanswered chatbot questions are logged (and, on WhatsApp, stored with the
  sender's number — see the privacy page's *Chatbot and WhatsApp assistant*
  section), but `unanswered_queries` has **no retention window or purge job
  yet**. Everything else with PII carries one (bookings 2 years, guide leads
  1 year). This is a deliberately deferred follow-up: a scheduled purge (e.g.
  drop rows older than N months) plus a stated retention period on the privacy
  page, kept together so the disclosure and the enforcement match. Deferred,
  not forgotten.
