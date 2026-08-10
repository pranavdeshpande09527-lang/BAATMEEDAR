# Baatmeedar — Database Backup and Recovery Prompt

Use this prompt to design backup, restore, retention, and disaster-recovery controls for persisted verification data.

## Task

Define backup frequency, retention, encryption, access controls, point-in-time recovery, restore verification, and a runbook appropriate to the selected database and data classification. No production database is configured today; label all provider-specific steps as proposals until chosen.

## Requirements

- Classify inputs, transcripts, account identifiers, sources/evidence, audit trails, and operational logs. Minimize what is stored before deciding what must be backed up.
- Encrypt backups in transit and at rest, restrict restore access, isolate credentials, and audit access. Never place backup archives in public buckets or source control.
- Define RPO/RTO targets, legal/consent retention, deletion propagation, and treatment of expired or anonymized records.
- Perform scheduled restore drills into an isolated environment. Verify integrity, ownership/RLS policy, migration compatibility, and absence of secrets in application logs.
- Document incident communications, rollback, and how to prevent a restored old result from being represented as a current verification.

## Deliverables

Return a provider-neutral policy, environment-specific runbook once selected, restore-test evidence, and ownership/retention matrix. Acceptance requires that recovery is tested, controlled, and does not re-expose deleted or unauthorized user data.
