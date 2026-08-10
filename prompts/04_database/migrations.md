# Baatmeedar — Database Migration Prompt

Use this prompt for any schema change to verification data. The project has no existing migrations, so first establish the approved database and migration tool; never infer one from `.env.example`.

## Task

Create safe, reviewable, reversible migrations for provenance-sensitive data.

## Requirements

- Write forward migration, rollback/mitigation plan, compatibility notes, affected indexes/RLS policies, and a backfill plan before applying a change.
- Prefer additive, backwards-compatible changes: add nullable fields/tables, deploy compatible code, backfill in batches, validate, then tighten constraints in a later release.
- Treat changes to verdict enums, ownership, evidence/source relationships, retention, and prompt/model provenance as high risk. Preserve legacy records and explain interpretation across versions.
- Run migrations once through CI/CD or an approved release job with a single writer, least-privilege credentials, backups, and metrics. Do not auto-run destructive statements on application startup.
- Test on representative sanitized fixtures including partial runs, cancelled runs, duplicated retries, and cross-user records.

## Deliverables

Return the migration files, rollout and rollback runbook, data-validation queries, and test results. Acceptance requires zero secret values in migration code, no data loss by default, a documented recovery path, and compatibility with the current API during rollout.
