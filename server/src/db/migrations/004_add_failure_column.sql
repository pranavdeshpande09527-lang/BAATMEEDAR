-- Migration 004: Add failure JSON column to verification_runs table
ALTER TABLE verification_runs
  ADD COLUMN IF NOT EXISTS failure JSONB DEFAULT NULL;
