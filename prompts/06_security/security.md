# Baatmeedar — Security Review and Implementation Prompt

Use this prompt for any security change or audit. Inspect the repository first: it has a static mock frontend, no live backend/auth/database, and `.env` is ignored. Do not read, reveal, or copy secret values.

## Task

Threat-model the requested change across user input, article/YouTube retrieval, browser/API boundary, model/tool calls, persistence, identity, deployment, and operations. Implement controls in the server/data layer; client checks are only usability aids.

## Required controls

- Strict versioned schemas, request/body limits, closed enums, output encoding, and configurable endpoint-specific rate limits. Use per-IP plus per-account backoff for auth.
- SSRF-safe retrieval: public HTTPS/provider allowlists, DNS/IP and redirect validation, private/link-local blocking, content-type/size/timeout limits, and no arbitrary URL tool.
- Server-only credentials, least privilege, secret scanning, rotation, dependency audit, protected CI/deploy secrets, and no service-role key in browser code.
- Server/data-layer authentication and authorization, ownership/RLS tests, deny-by-default roles, IDOR protection, and audited administrative actions.
- Prompt-injection isolation: treat pages, transcripts, search/model/tool output as data; allowlisted typed tools only; Stage 4 verifier isolation.
- Redacted structured logs and generic client errors; no stack traces, raw database/provider errors, internal paths, credentials, or unnecessary source/user text.
- If uploads are added, validate type/size/content, use isolated non-executable storage, malware handling, and authorization.

## Deliverables

Return threat model, prioritized findings, remediations, configuration changes, tests, monitoring, and residual risk. Acceptance requires proof for invalid/malicious input, blocked URLs, leaked-secret scans, rate limits, cross-user access, redaction, provider failure, and dependency findings—without claiming unimplemented controls are live.
