# Baatmeedar — DevOps Containerization Prompt

Use this prompt to containerize the approved backend and worker. No runtime or Dockerfile exists yet, so choose the runtime first and do not create unnecessary infrastructure.

## Task

Create reproducible development and production images with a multi-stage build, pinned supported base image, minimal runtime dependencies, non-root user, `.dockerignore`, explicit command/port, graceful shutdown, and health check.

## Requirements

- Keep `.env`, database URLs, provider keys, build secrets, and local artifacts out of image layers and source control.
- Separate local dependency orchestration from production. Do not expose database, queue, or admin ports publicly by default.
- Make resource limits, concurrency, timeouts, and worker shutdown/cancellation behavior configurable for long-running runs.
- Generate an SBOM or dependency scan where supported and address material image vulnerabilities.
- Prove a clean checkout builds without live credentials and runs a safe mock-provider smoke test.

## Deliverables

Return Docker files, local run instructions, health/readiness behavior, scan results, and deployment notes. Acceptance requires a secure, repeatable image that does not turn a failed dependency into a false-ready service.
