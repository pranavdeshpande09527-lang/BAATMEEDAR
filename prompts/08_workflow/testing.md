# Baatmeedar — Workflow Test Planning Prompt

Use this prompt to plan end-to-end workflow validation across the five stages.

## Task

Create a traceable test matrix from Stage 1 input through Stage 5 editorial result. Use deterministic provider/retrieval fakes; no live API keys or changing web evidence are required for automated tests.

## Cover

Direct statements, article URLs, YouTube URLs, empty/malformed/oversize input, SSRF attempts, unavailable transcript, extraction failure, compound/ambiguous claims, no evidence, supporting and conflicting evidence, stale scope mismatch, malformed model output, verifier disagreement, cancellation, retries, rate limits, unauthorized access, and renderer-safe enum values.

Assert provenance IDs, exact evidence attribution, verifier isolation, safe errors, accurate stages, and `supported|contradicted|inconclusive` outcomes. Current UI has a mock `/verify` contract; make it an explicit fixture rather than evidence that a backend is tested.

## Output

Return scenarios, fixtures/fakes, assertions, automation layer, and release gate. Acceptance requires each failure to remain visible and no test fixture to contain a real secret or misrepresented citation.
