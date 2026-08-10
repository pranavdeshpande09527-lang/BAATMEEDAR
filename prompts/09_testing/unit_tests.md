# Baatmeedar — Unit Testing Prompt

Use this prompt to test one pure function, validator, domain service, or provider adapter in isolation. Establish the selected test runner first; none is currently configured.

## Requirements

- Test schema validation, URL parsing/policy decisions, state transitions, claim/evidence IDs, verdict synthesis, redaction, renderer escaping, and retry/idempotency logic with deterministic inputs.
- Mock all network, clock, database, and provider dependencies. Never depend on live Tavily, Gemini, Groq, Grok/xAI, YouTube, or a real database.
- Cover valid, boundary, malformed, adversarial, empty, duplicate, and failure cases. Assert exact closed enums and that `inconclusive` is reachable.
- Keep fixtures sanitized; do not encode keys, private sources, or unsupported “true/false” assumptions.

## Output

Return test file(s), concise fixture builders, coverage rationale, and commands to run them. Acceptance requires tests to be deterministic and to fail if provenance, isolation, validation, or redaction regresses.
