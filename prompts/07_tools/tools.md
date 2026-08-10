# Baatmeedar — External Tools Inventory Prompt

Use this prompt to select or review integrations. Existing documentation lists possible services, but none are implemented server-side. Verify each integration and its data ownership before coding.

## Task

Create an approved-tool inventory for the five-stage workflow. For every tool, specify purpose, owner, stage, data sent/received, authentication method, server/client boundary, retention, rate/cost limits, timeout/retry policy, mock, monitoring, and fallback.

## Decisions to make explicitly

- Choose one primary authentication/persistence path; Supabase and Firebase must not both own the same data.
- Specify a transcript-capable service; a YouTube Data API key alone does not guarantee transcript retrieval.
- Keep Groq (Stage 3 analysis) distinct from Grok/xAI (Stage 4 verification), and add a backend-only Grok/xAI configuration only after approval.
- Treat Resend and Brevo/SMTP as alternatives until one is selected.

## Guardrails

Use least-privilege server credentials, typed adapters, allowlisted network operations, redacted logs, health checks, feature flags, and deterministic fakes. No external tool may receive a secret, unrestricted database access, or user data beyond the stage's minimum need.

## Deliverables

Return the inventory, decision log, adapter contracts, configuration matrix, failure behavior, and integration tests. Acceptance requires every live-tool claim to be backed by tested code and every deferred dependency to be visibly labeled.
