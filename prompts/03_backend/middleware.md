# Baatmeedar — Backend Middleware Prompt

Use this prompt to define the ordered, reusable request protections around the API. The static frontend's checks are only usability checks; the backend must enforce the real boundary.

## Task

Specify middleware/interceptors for request IDs, trusted-proxy handling, secure headers/CORS, body limits, authentication, authorization context, rate limits, schema validation, error translation, and redacted request logging.

## Requirements

- Apply a strict origin allowlist; do not use credentialed wildcard CORS. Keep development origins separate from production configuration.
- Enforce JSON/content limits before parsing expensive bodies. Validate `input_type` and length/URL shape with typed schemas.
- Authenticate before protected routes and establish an immutable principal context. Perform resource authorization in the route/domain layer where the resource is known.
- Use route-specific configurable rate limits; protect `/verify` against cost abuse and auth routes against brute force.
- Translate expected errors into documented safe responses and unknown errors into a generic correlation-ID response. Do not leak provider messages, files, database errors, or stack traces.
- Do not put workflow business decisions, provider SDK calls, or secret configuration in middleware.

## Deliverables

Return the middleware order and rationale, configuration keys, route exceptions, response examples, and tests for CORS, oversized payloads, invalid JSON, spoofed identity, rate limits, and error redaction. Acceptance requires each public route to receive the same baseline protections.
