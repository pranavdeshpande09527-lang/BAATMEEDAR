# Baatmeedar — Deployment Flow Prompt

Use this prompt to release a verified change. No CI/CD or backend deploy configuration currently exists; make missing prerequisites explicit.

## Flow

1. Confirm approved code, tests, dependency/security scan, configuration schema, migration/backup plan, and release version.
2. Build an immutable artifact without secrets; deploy to staging with isolated credentials and mocked/sandboxed providers.
3. Run smoke checks: submission validation, safe status polling, redacted errors, one controlled end-to-end run, and ownership/RLS checks if persistence exists.
4. Apply compatible migrations once, deploy production, monitor readiness/error/queue/provider signals, and verify the release version.
5. Roll back code or halt intake when safety, provenance, authorization, or provider failure thresholds are crossed. Document data-compatibility limits.

## Guardrails

Never auto-deploy an unreviewed destructive migration, expose production secrets to CI logs, or claim live verification before real providers are configured. A provider outage must be a visible partial/error state.

## Output

Return a preflight checklist, environment matrix, release steps, smoke evidence, monitoring window, and rollback runbook.
