-- Baatmeedar Migration 002: Row Level Security Policies

ALTER TABLE verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifier_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically in Supabase Postgres.
-- Client RLS policies for authenticated users:
CREATE POLICY runs_authenticated_owner_policy ON verification_runs
  FOR ALL
  TO authenticated
  USING (owner_type = 'authenticated' AND owner_id = auth.uid()::text)
  WITH CHECK (owner_type = 'authenticated' AND owner_id = auth.uid()::text);

-- Claims accessible if owner of run
CREATE POLICY claims_authenticated_policy ON claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM verification_runs r
      WHERE r.id = claims.run_id AND r.owner_type = 'authenticated' AND r.owner_id = auth.uid()::text
    )
  );

-- Sources accessible if owner of run
CREATE POLICY sources_authenticated_policy ON sources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN verification_runs r ON r.id = c.run_id
      WHERE c.id = sources.claim_id AND r.owner_type = 'authenticated' AND r.owner_id = auth.uid()::text
    )
  );

-- Verifier results accessible if owner of run
CREATE POLICY verifier_results_authenticated_policy ON verifier_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN verification_runs r ON r.id = c.run_id
      WHERE c.id = verifier_results.claim_id AND r.owner_type = 'authenticated' AND r.owner_id = auth.uid()::text
    )
  );

-- Final results accessible if owner of run
CREATE POLICY final_results_authenticated_policy ON final_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN verification_runs r ON r.id = c.run_id
      WHERE c.id = final_results.claim_id AND r.owner_type = 'authenticated' AND r.owner_id = auth.uid()::text
    )
  );
