# Baatmeedar — CI/CD Prompt

Use this prompt to establish continuous integration and delivery after the implementation stack is approved. The repository has no package manifest, backend, Docker configuration, or CI workflow today; make each prerequisite explicit.

## Task

Build a pipeline that validates code before release and deploys only reviewed, immutable artifacts. Define triggers, required checks, environments, artifact provenance, secrets, approvals, migration policy, smoke tests, monitoring, and rollback.

## Requirements

- Run formatting/linting, unit/integration/API tests, dependency/security scans, and static checks once configured. Do not claim missing checks passed.
- Use least-privilege CI permissions, protected environments, pinned actions/dependencies, and no secrets in logs or untrusted fork/PR jobs.
- Build once, promote the same artifact, deploy compatibility-safe migrations through a single controlled job, and block release on failed validation.
- Run a post-deploy smoke test using mocked/sandboxed providers; verify safe API errors, health/readiness, and current version.
- Support rollback and document data-schema compatibility. Provider outages or incomplete evidence must stay visible as partial/error results.

## Deliverables

Return workflow design/files, required secrets by environment (names only), release gates, migration/rollback runbook, and test evidence. Acceptance requires reproducible releases without exposing credentials or portraying mock behavior as live verification.
