# Baatmeedar — Backend Deployment Prompt

Use this prompt when preparing the real backend for deployment. Current Render references and the hard-coded frontend URL are not proof of a deployable backend.

## Task

Create an environment-specific deployment plan for the selected runtime, database, worker/queue, and frontend. Keep production configuration outside source control and require a working health/readiness strategy before traffic is routed.

## Requirements

- Document local, test, staging, and production configuration, secret ownership, rotation, and least-privilege deployment identities.
- Provide liveness and readiness endpoints that reveal no secrets, provider credentials, or internal topology. Readiness must check only dependencies required to accept work.
- Run schema migrations through a controlled, reversible, single-writer process; never run destructive migrations automatically without an approved backup/rollback plan.
- Configure timeouts, concurrency, queued long-running work, retry/dead-letter behavior, structured redacted logs, and alerting before enabling live provider calls.
- Deploy an immutable artifact, verify its version, then perform smoke checks of input validation, status polling, and a mocked or sandboxed end-to-end run.
- Roll back code safely and make rollback/data-compatibility limits explicit. Never log or inject `.env` values into build output.

## Deliverables

Return deployment manifests/workflows only after the stack is chosen, an environment-variable inventory, health checks, migration and rollback runbook, and post-deploy verification checklist. Acceptance requires that a failed dependency or provider produces an honest partial/error state rather than a fabricated result.
