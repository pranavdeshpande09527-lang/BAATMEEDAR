# Baatmeedar — Docker Tooling Prompt

Use this prompt to containerize an approved backend/runtime. There is no current backend, Dockerfile, or compose configuration; do not manufacture a container stack before selecting the implementation runtime.

## Task

Create a production-minded, reproducible image for the backend and optional worker. Use a multi-stage build, pinned supported base image, non-root runtime user, minimal dependencies, `.dockerignore`, explicit port/health check, and runtime environment configuration.

## Guardrails

- Never bake `.env`, provider keys, database URLs, or test fixtures with secrets into an image/layer.
- Keep development compose files separate from production secrets and document only the approved dependencies.
- Run dependency/security scanning, set resource limits, and ensure graceful shutdown/cancellation for long-running verification jobs.
- Do not expose databases, queues, or admin ports publicly by default.

## Deliverables

Return Docker files after runtime approval, build/run commands, health check, image-scan result, and a smoke test using mocked providers. Acceptance requires a clean checkout to build without credentials and a deployed container to report truthful readiness.
