# Baatmeedar — Backend Services Prompt

Use this prompt to implement domain services for the five-stage newsroom workflow.

## Task

Design small, testable services with explicit interfaces: input ingestion, safe retrieval/transcript acquisition, claim extraction, research planning, evidence collection, Stage 3 analysis, isolated verification, editorial synthesis, status publishing, and persistence. The current `src/js/api.js` mock is a UI demo, not a service implementation.

## Constraints

- Keep the orchestration service responsible for allowed state transitions only. Provider adapters implement vendor calls; repositories implement storage; routes translate transport.
- Every service receives typed validated inputs and returns typed successes or expected failures. Preserve correlation IDs and provenance between stages.
- Make long-running work asynchronous, cancellation-aware, idempotent, time-bounded, and retry-safe. A retry must not duplicate evidence or overwrite a newer run state.
- Isolate Grok/xAI and Gemini Stage 4 calls; neither service input can include the other's verdict.
- Synthesis may use only the attributable evidence packet and verifier records, and must allow `inconclusive`.
- Use deterministic fakes for all providers in automated tests.

## Deliverables

Return service interfaces, ownership/state-transition diagram, dependency-injection plan, failure/partial-result handling, and unit/integration tests. Acceptance requires replacement of any provider with a fake without changing orchestration logic and no service fabricates evidence or success.
