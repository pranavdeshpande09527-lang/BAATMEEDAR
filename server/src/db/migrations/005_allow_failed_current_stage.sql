-- Migration 005: Update verification_runs_current_stage_check constraint to permit 'failed'
ALTER TABLE verification_runs
  DROP CONSTRAINT IF EXISTS verification_runs_current_stage_check;

ALTER TABLE verification_runs
  ADD CONSTRAINT verification_runs_current_stage_check
  CHECK (current_stage IN ('accepted', 'input_received', 'extracting_claims', 'researching', 'verifying', 'synthesizing', 'complete', 'failed'));
