# Baatmeedar — Backend Validation Prompt

Use this prompt to enforce boundary validation for every API, tool, model, and persistence transition.

## Task

Create versioned schemas for Stage 1 submission, run IDs, status/results payloads, provider/tool inputs, model outputs, and persistence records. Validate before data crosses a trust boundary; frontend validation never replaces backend validation.

## Requirements

- Accept only `text`, `article`, or `youtube` input types. Bound text and URL sizes, reject blank/control-character abuse, and require exactly the expected fields.
- Parse URLs with a real URL parser, require supported public HTTPS providers/schemes, and pass them to an SSRF-safe retrieval service that validates DNS/IP redirects, response type, size, and timeout.
- Use closed enums for workflow stage, status, evidence stance, source type where controlled, and verdict (`supported`, `contradicted`, `inconclusive`). Reject unknown enum values before they reach renderer CSS classes.
- Validate model output against strict schemas: claim IDs, evidence IDs, bounded confidence, required limitations, and no invented citations. Bounded repair/retry is allowed; silent coercion is not.
- Produce safe field-level errors for clients and redacted diagnostics internally. Version contracts intentionally when the frontend shape changes.

## Deliverables

Provide schemas, normalization rules, error format, fuzz/adversarial cases, and tests for malformed, oversized, malicious, ambiguous, and provider-malformed payloads. Acceptance requires invalid data never creating a run, triggering a provider charge, or entering persistence.
