# Baatmeedar — Backend Logging and Audit Prompt

Use this prompt to implement observability for the claim-verification workflow without leaking sensitive material.

## Task

Create structured server logs, metrics, and audit events for run lifecycle, provider calls, retrieval, validation, authorization, retries, and finalization. A run must be traceable without storing raw secrets or unnecessarily retaining full user/source text.

## Required fields

Include correlation/run ID, claim ID where applicable, stage, event name, timestamp, duration, provider/model identifier, prompt version, retry count, outcome class, and redacted error code. Separate operational logs from immutable provenance/audit records.

## Guardrails

- Never log API keys, cookies, authorization headers, service-role credentials, database URLs, full prompts, full article/transcript text, or raw provider responses by default.
- Redact personal data and source excerpts according to an explicit retention policy; restrict log access and document emergency access.
- Use stable error categories such as validation, blocked URL, timeout, rate-limited, provider unavailable, malformed output, authorization denied, and internal fault.
- Record evidence IDs and source IDs, not invented summaries. Do not log an evaluator's hidden reasoning into another verifier's context.
- Make sampling, log level, retention, and alert thresholds configurable.

## Deliverables

Provide an event schema, redaction policy, dashboards/alerts proposal, and tests proving secrets and raw stack traces are absent from public responses and logs. Acceptance requires an operator to reconstruct a failed run's stage and cause without exposing private data.
