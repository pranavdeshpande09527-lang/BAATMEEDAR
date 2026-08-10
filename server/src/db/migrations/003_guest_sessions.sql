-- Baatmeedar Migration 003: Guest Sessions & Account Linking

CREATE TABLE IF NOT EXISTS guest_sessions (
  id VARCHAR(255) PRIMARY KEY,
  allowed_run_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions (expires_at);

CREATE TABLE IF NOT EXISTS account_link_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  linked_run_ids JSONB DEFAULT '[]'::jsonb,
  skipped_run_ids JSONB DEFAULT '[]'::jsonb,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_link_user ON account_link_log (user_id);
