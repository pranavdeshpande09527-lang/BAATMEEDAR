-- Baatmeedar Migration 006: Allow 'grok' and 'xai' in verifier_results verifier column

ALTER TABLE verifier_results DROP CONSTRAINT IF EXISTS verifier_results_verifier_check;

ALTER TABLE verifier_results ADD CONSTRAINT verifier_results_verifier_check 
  CHECK (verifier IN ('groq', 'gemini', 'grok', 'xai'));
