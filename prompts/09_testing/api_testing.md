# Baatmeedar — API Testing Prompt

Use this prompt to verify the public/backend contract.

## Test contract

Test `POST /verify` for allowed `input_type` values and validated content, `GET /verify/{run_id}/status` for authorized state updates, and `GET /verify/{run_id}/results` for complete, partial, missing, cancelled, and forbidden runs. Preserve the static frontend's expected fields until a versioned migration exists.

## Requirements

- Assert HTTP status, JSON schema, correlation ID, safe headers, CORS policy, pagination where applicable, and generic redacted errors.
- Test blank, too-long, malformed, unsupported, and SSRF-targeting URLs; never rely on the browser's basic URL check.
- Assert rate limits, auth/ownership, idempotency, request-size limit, enum validation, and absence of provider/database error text.
- Use fakes for providers and fixtures with explicit source/evidence provenance.

## Output

Return an executable API collection/spec, automated assertions, negative cases, and compatibility report. Acceptance requires no unauthenticated/unauthorized data leak and no API response falsely presenting unverified information as evidence.
