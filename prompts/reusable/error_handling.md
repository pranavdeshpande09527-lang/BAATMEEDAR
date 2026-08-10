# Baatmeedar — Reusable Error Handling Prompt

Classify expected errors at each boundary: invalid input, blocked URL, extraction/transcript unavailable, provider timeout/rate limit/refusal/malformed output, authorization denied, cancelled run, partial evidence, persistence failure, and internal fault.

Return a stable safe client error with correlation ID and a truthful status; log structured redacted diagnostics server-side. Never convert failure into evidence, a confident verdict, or a fake success. Use bounded configurable retries only when the operation is safe/idempotent. Preserve completed prior stages and explain what remains unavailable. Do not expose keys, provider response bodies, stack traces, database errors, or internal paths.
