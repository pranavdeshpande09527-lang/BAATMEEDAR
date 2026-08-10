# Baatmeedar — Hosting and Operations Prompt

Use this prompt to select and configure hosting for the static frontend, backend API, async workers, database, and observability.

## Task

Document an approved hosting topology and operational limits. Render is mentioned in the project, but no configuration proves it is the selected or deployed backend.

## Requirements

- Keep static UI, public API, worker/queue, database, and admin surfaces separated by least-privilege networking. Define domains, HTTPS, CORS, health/readiness, autoscaling/concurrency, timeouts, and graceful shutdown.
- Store secrets in the host's secret manager; use distinct local/test/staging/production accounts/projects and restrict deploy identities.
- Define database backup/restore, migration gate, worker retry/dead-letter path, monitoring, incident contacts, cost limits, and rollback.
- Test cold start, provider outage, queue backlog, and database unavailability. User-facing results must show partial/actionable status rather than a fabricated verdict.

## Deliverables

Return topology diagram, provider decision, environment matrix, operational runbook, disaster-recovery targets, and smoke/rollback checks. Acceptance requires actual deployment claims to be testable and documented.
