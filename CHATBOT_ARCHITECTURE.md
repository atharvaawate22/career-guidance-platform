# CET Hub Chatbot — Architecture

This document tracks the design of the CET Hub chatbot feature: a rule-based
(Phase 1) assistant that answers MHT-CET admission questions on two channels
— the website and WhatsApp — with a RAG layer (Phase 2) planned for
conceptual/procedural questions once Phase 1 ships.

It exists to capture *why* decisions were made, including what was
deliberately **not** built and why, so this reasoning survives past the code
itself — useful both for future maintenance and for explaining the scoping
choices in a technical interview.

**Status: Phase 1 is implemented and verified end-to-end. Phase 2 (RAG) is
designed below but not yet built.**

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

## 3. Phase 2 (planned, not yet built) — RAG for conceptual questions

This section documents the intended design so the "what we skipped and why"
reasoning in §4 has a concrete plan to react against. None of this is
implemented yet.

### 3.1 Query router

A lightweight classifier — a keyword/pattern check first, escalating to a
single cheap LLM call only if the pattern check is ambiguous — decides:

- **(a) Structured data question** ("cutoff for COEP CS") → the existing
  Phase 1 direct-SQL path. Phase 2 does not replace this; RAG is strictly
  additive for the conceptual-question slice Phase 1's `faqs` fallback
  doesn't already cover well.
- **(b) Conceptual/procedural question** ("what's HU vs OHU") → RAG
  retrieval.

### 3.2 RAG pipeline

1. **Chunk** the CAP guidance content (freeze/float rules, HU vs OHU, common
   mistakes, the auto-freeze trap, etc.) into small, topic-scoped pieces.
2. **Embed** each chunk with a free/open-source model
   (`sentence-transformers`) or a cheap embedding API — the tradeoff to be
   decided when this phase starts: self-hosted embedding avoids a per-call
   cost but adds a model-serving dependency; a hosted embedding API is
   simpler operationally for a corpus this small.
3. **Store** chunks + embeddings in **pgvector**, added to the existing
   Postgres instance — no new database. `pgcrypto` and `pg_trgm` are already
   enabled on this database (`012_cutoffs_redesign.sql`), so there's direct
   precedent for adding an extension here.
4. **Retrieve**: embed the incoming question, run a cosine-similarity search
   in pgvector, take the top 3–5 chunks.
5. **Generate**: feed the retrieved chunks + question to an LLM for the final
   answer. This is the one place in the whole system a paid/free-tier LLM
   call is actually necessary — grounding the answer in retrieved chunks is
   what makes it safe to let an LLM phrase the response at all.

---

## 4. What we deliberately did *not* build, and why

This is the scoping reasoning to reuse when explaining these decisions —
each one trades a real capability for reduced complexity, on purpose, given
the actual size of this corpus.

- **No hybrid retrieval** (dense vector search + sparse/BM25 keyword search).
  Hybrid retrieval solves recall problems in large, vocabulary-diverse
  corpora. This CAP guidance corpus is a few dozen chunks and topically
  narrow — dense vector search alone has strong recall at this scale, and
  hybrid would add a second search system, merge/reranking logic, and tuning
  effort without a measurable accuracy gain.

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
- **Chat-log retention and purge**: the privacy policy now discloses that
  unanswered chatbot questions are logged (and, on WhatsApp, stored with the
  sender's number — see the privacy page's *Chatbot and WhatsApp assistant*
  section), but `unanswered_queries` has **no retention window or purge job
  yet**. Everything else with PII carries one (bookings 2 years, guide leads
  1 year). This is a deliberately deferred follow-up: a scheduled purge (e.g.
  drop rows older than N months) plus a stated retention period on the privacy
  page, kept together so the disclosure and the enforcement match. Deferred,
  not forgotten.
