# Baatmeedar — GitHub Actions Prompt

Use this prompt to implement secure GitHub Actions workflows for the actual project.

## Task

Create minimal workflows for validation and, once approved, controlled deployment. Set explicit event triggers, job permissions, trusted versus untrusted PR behavior, concurrency, caching, artifacts, environment approvals, and failure reporting.

## Guardrails

- Default token permissions to read; grant write/deployment scope only to the job that needs it.
- Pin third-party actions to immutable revisions. Do not expose secrets to forks, pull-request code, logs, or artifacts.
- Run established tests/scans only; where the test runner/backend is absent, provide a visible TODO/gate instead of a pretend green check.
- Keep deployment secrets in protected environments, restrict production jobs to trusted branches, and record artifact commit/version.
- Upload sanitized reports only; never archive `.env`, credentials, raw user content, or provider outputs.

## Deliverables

Return workflow YAML, permission rationale, branch/environment protections, required secret names, and a dry-run or observed result. Acceptance requires a contributor to understand every workflow's trust boundary.
