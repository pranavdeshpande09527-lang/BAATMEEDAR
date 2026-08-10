# Baatmeedar — AI Memory and State Prompt

Use this prompt to decide how Baatmeedar retains context across a verification run or user history. Do not call arbitrary chat history “memory”; provenance and privacy requirements apply.

## Task

Separate short-lived workflow state from durable product records. Define exactly what each stage may read and write, how it is scoped to run/claim/owner, how it expires, and how a user can inspect or delete it.

## Requirements

- Keep a run state machine and immutable provenance records for input, claims, plans, sources, evidence, invocations, verifier outputs, and final result.
- Store only minimum context needed by a stage. Stage 4 verifier isolation is mandatory: Grok/xAI and Gemini receive the same approved evidence packet, never each other's verdict/confidence/reasoning.
- Do not reuse a previous user's content, sources, hidden prompts, or model output for another user without explicit product/legal approval and strong tenancy controls.
- Distinguish retrieval cache, workflow checkpoint, user-visible history, and evaluation dataset; each needs its own retention, access, deletion, and encryption policy.
- Version prompts/models and snapshots needed to explain a result, while redacting credentials and minimizing raw source text.

## Deliverables

Provide a state/retention diagram, access matrix, schema, deletion/export behavior, and tests for tenant isolation, expiration, retries, cancellation, verifier isolation, and restoration after worker failure. Acceptance requires memory to improve resumability without changing historical evidence into invented current knowledge.
