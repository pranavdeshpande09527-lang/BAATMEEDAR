-- Baatmeedar Migration 001: Verification Runs & Workflow Schema

CREATE TABLE IF NOT EXISTS verification_runs (
  id UUID PRIMARY KEY,
  input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('text', 'article', 'youtube')),
  input_content TEXT NOT NULL,
  source_url TEXT,
  publisher TEXT,
  retrieved_at TIMESTAMPTZ,
  extraction_status VARCHAR(50) DEFAULT 'pending',
  raw_text_preview TEXT,
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('guest', 'authenticated')),
  owner_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('accepted', 'processing', 'complete', 'partial', 'cancelled', 'failed')),
  current_stage VARCHAR(30) NOT NULL CHECK (current_stage IN ('accepted', 'input_received', 'extracting_claims', 'researching', 'verifying', 'synthesizing', 'complete')),
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runs_owner ON verification_runs (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON verification_runs (status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON verification_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS claims (
  id VARCHAR(100) PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES verification_runs(id) ON DELETE CASCADE,
  claim_index INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  context TEXT,
  entities JSONB DEFAULT '[]'::jsonb,
  temporal VARCHAR(50) DEFAULT 'unspecified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_run_id ON claims (run_id);

CREATE TABLE IF NOT EXISTS removed_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES verification_runs(id) ON DELETE CASCADE,
  opinion_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_plans (
  claim_id VARCHAR(100) PRIMARY KEY REFERENCES claims(id) ON DELETE CASCADE,
  research_question TEXT NOT NULL,
  required_facts JSONB DEFAULT '[]'::jsonb,
  source_strategy TEXT,
  tavily_queries JSONB DEFAULT '[]'::jsonb,
  support_criteria TEXT,
  contradiction_criteria TEXT,
  follow_up_gaps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id VARCHAR(100) PRIMARY KEY,
  claim_id VARCHAR(100) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  publisher TEXT,
  published_date VARCHAR(50),
  source_type VARCHAR(50) NOT NULL,
  authority_rationale TEXT,
  excerpt TEXT NOT NULL,
  stance VARCHAR(20) NOT NULL CHECK (stance IN ('supporting', 'contradicting', 'insufficient')),
  retrieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_claim_id ON sources (claim_id);

CREATE TABLE IF NOT EXISTS verifier_results (
  id VARCHAR(100) PRIMARY KEY,
  claim_id VARCHAR(100) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  verifier VARCHAR(20) NOT NULL CHECK (verifier IN ('groq', 'gemini')),
  verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('supported', 'contradicted', 'inconclusive')),
  confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  reasoning TEXT NOT NULL,
  evidence_ids JSONB DEFAULT '[]'::jsonb,
  limitations TEXT,
  unresolved_questions JSONB DEFAULT '[]'::jsonb,
  model_id VARCHAR(100),
  prompt_version VARCHAR(50),
  invocation_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifier_results_claim ON verifier_results (claim_id);

CREATE TABLE IF NOT EXISTS final_results (
  claim_id VARCHAR(100) PRIMARY KEY REFERENCES claims(id) ON DELETE CASCADE,
  verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('supported', 'contradicted', 'inconclusive')),
  rationale TEXT NOT NULL,
  supporting_evidence_ids JSONB DEFAULT '[]'::jsonb,
  conflicting_evidence_ids JSONB DEFAULT '[]'::jsonb,
  sources_cited JSONB DEFAULT '[]'::jsonb,
  limitations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES verification_runs(id) ON DELETE SET NULL,
  event VARCHAR(50) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  details_redacted JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_run_id ON audit_log (run_id);
