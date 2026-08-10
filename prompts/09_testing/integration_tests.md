# Baatmeedar — Integration Testing Prompt

Use this prompt to test boundaries between routes, orchestration, storage, queues, and adapters after those components exist.

## Task

Run the real application wiring with a test database/emulator and controlled provider fakes. Exercise create-run, asynchronous status transitions, results retrieval, authorization, persistence, retries, cancellation, and safe error mapping.

## Requirements

- Isolate tests from production services and credentials. Reset test data safely and validate RLS/ownership with multiple principals.
- Assert the current API contract or documented version: `POST /verify`, status, results; test invalid content and safe polling failure.
- Verify each evidence/result record references real fixture source/evidence IDs, and Stage 4 inputs do not contain the other verifier's conclusion.
- Simulate timeouts, rate limits, malformed output, blocked URL, partial provider failure, migration mismatch, and duplicate job delivery.

## Output

Return test setup, fixtures, assertions, cleanup, and CI command. Acceptance requires production-like boundaries with no live external cost or data leakage.
