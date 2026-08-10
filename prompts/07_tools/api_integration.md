# Baatmeedar — Third-Party API Integration Prompt

Use this prompt for any new HTTP/API provider integration.

## Task

Implement a small server-side adapter with typed request/response contracts, configuration validation, authentication, timeouts, retry classification, rate/cost controls, redacted errors, and deterministic fake. Do not call third-party APIs directly from the static browser client when credentials or policy enforcement are required.

## Requirements

- Verify the provider's official contract and use only approved endpoints/scopes.
- Validate all inputs and outputs; treat provider payloads as untrusted data. Bound payload size, pagination, redirects, and retries.
- Store secrets only in deployment configuration; never log headers/keys or return provider error bodies to clients.
- Map failure into explicit states: invalid input, blocked request, unavailable, timeout, rate-limited, malformed response, or partial result.
- Preserve a correlation/run/claim ID and provider/model/version metadata. Use idempotency where the provider supports writes.
- Keep vendor SDKs behind an interface so unit tests use fakes and domain logic stays portable.

## Deliverables

Provide adapter interface, configuration keys, error mapping, test fixtures, observability fields, and documentation of data sharing/retention. Acceptance requires failure not to become a fabricated success or unexplained final verdict.
