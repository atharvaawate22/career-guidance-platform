-- Migration 016: Unanswered Queries
-- Purpose: Feedback-loop log for the Phase 1 rule-based chatbot. Every
-- message that falls through to the fallback response (no menu number, no
-- keyword pattern, no FAQ match) is logged here. This backlog is what Phase
-- 2's RAG content should be built to cover — see CHATBOT_ARCHITECTURE.md.
-- Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS unanswered_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  contact_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unanswered_queries_created_at
ON unanswered_queries(created_at DESC);

-- No public read policy: this table is only ever read from the backend
-- (which connects outside the Supabase Data API), never exposed publicly.
ALTER TABLE unanswered_queries ENABLE ROW LEVEL SECURITY;
