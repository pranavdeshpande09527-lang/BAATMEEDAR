# Baatmeedar — Render Deployment Integration Prompt

Use this prompt if Render is approved for hosting. The frontend currently contains a Render URL string, but no committed service configuration proves an active deployment.

## Task

Deploy the selected backend/worker and static frontend with separate environments, build/start commands, health checks, server-side secrets, and a controlled migration path.

## Requirements

- Keep API keys, database credentials, and deployment tokens in Render's secret configuration; do not place them in the frontend bundle or repository.
- Configure a public web service only for intended API routes. Put workers/queues/databases behind private access where possible.
- Use readiness checks, startup timeouts, graceful shutdown, autoscaling/concurrency limits, and logs/alerts appropriate to long-running verification work.
- Deploy immutable revisions, run smoke tests, and document rollback, migration compatibility, custom-domain/CORS settings, and cold-start user messaging.
- Do not use a Render management key in application runtime unless a separate approved automation strictly needs it.

## Deliverables

Return Render configuration, secret/environment matrix, health/smoke checks, rollback plan, and post-deploy verification evidence. Acceptance requires the UI to receive safe timeouts/errors and no secrets to be visible in client code or build logs.
