# Baatmeedar — AI Tool/Function Calling Prompt

Use this prompt to design model-assisted tool calling. Baatmeedar does not currently have a backend or tool runtime; do not expose a provider's unrestricted function-calling feature directly to the browser or a model.

## Task

Define a narrow, server-owned tool contract for only approved workflow actions: safe source discovery/retrieval, transcript lookup, evidence persistence, and run-status operations. Hermes plans work; it may request an approved tool through orchestration but must not browse arbitrary URLs, execute code, access secrets, or decide a verdict.

## Rules

- Give each tool a typed JSON schema, allowlisted name, minimum privileges, bounded arguments, timeout, idempotency behavior, and redacted result schema.
- Validate model-proposed arguments before execution. URL requests must pass the SSRF-safe retrieval policy; database writes must be scoped to the current run and server-generated IDs.
- Treat tool output as untrusted evidence candidates, not instructions or proof. Inspect and attribute sources before they enter an evidence packet.
- Never give a model credentials, shell/database access, internal URLs, or a generic HTTP tool. Do not let it select system prompts, models, or security configuration.
- Record invocation ID, run/claim ID, tool version, validated arguments fingerprint, result status, duration, and redacted error. Use bounded retries and require human/configuration decisions for repeated failure.

## Deliverables

Provide tool definitions, authorization boundary, orchestration sequence, validation and error contracts, deterministic fakes, and tests for injection, unsafe URLs, malformed arguments, duplicate calls, timeouts, and unauthorized writes. Acceptance requires every tool call to be attributable, least-privileged, and safely mockable.
