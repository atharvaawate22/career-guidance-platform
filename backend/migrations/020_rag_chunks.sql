-- Migration 020: RAG chunks
-- Purpose: pgvector storage for the Phase 2 step (b) RAG corpus — the
-- seat-mechanics cluster (Freeze/Float/Slide, the Auto-Freeze trap, the
-- seat-floor guarantee, choice-filling guidance, and the between-rounds
-- editing/betterment rules). See CHATBOT_ARCHITECTURE.md §3.3/§3.5 and
-- docs/rag-source-content.md (the verbatim source text these chunks are
-- authored from).
-- Idempotent (safe to re-run).
--
-- Embedding is Supabase-native gte-small (384-dim), so vector(384) is fixed
-- to that model — switching embedding models later means a re-embed.
--
-- UNIQUE (topic_label) is the natural key the ingestion script upserts on,
-- so re-running ingestion after an edit updates the row in place instead of
-- appending a duplicate — same idempotency shape as 014/015's seed tables.
--
-- RLS: enabled with NO public read policy, same as unanswered_queries
-- (016) — this table is only ever read from the backend, which connects
-- with a direct Postgres URL outside the Supabase Data API, never from a
-- client.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_label TEXT NOT NULL,
  source_section TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (topic_label)
);

-- No ANN index (ivfflat/hnsw) on purpose: at ~10 rows a plain sequential
-- scan over the cosine operator is both fast enough and more accurate than
-- an approximate index, which needs far more rows to build meaningful
-- clusters. Revisit if the corpus grows into the hundreds (see
-- CHATBOT_ARCHITECTURE.md §6).

ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
