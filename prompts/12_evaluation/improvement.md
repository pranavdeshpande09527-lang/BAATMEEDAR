# Baatmeedar — Improvement Planning Prompt

Use this prompt after a review, user feedback, incident, or evaluation result.

## Task

Turn observations into prioritized improvements. For each proposal, state user/evidence impact, root cause, affected stage/module, expected benefit, cost/risk, dependency/decision, security/privacy effect, test, rollout, metric, and rollback.

## Prioritization

Prioritize blockers to trustworthy behavior: fabricated-success paths, unsafe input/retrieval, secret/authorization flaws, missing evidence provenance, verifier leakage, and untestable integrations. Then improve reliability, accessible UX, performance/cost, and presentation. Do not optimize a mock UI while describing it as a live pipeline.

## Output

Return a ranked backlog with one smallest safe next slice, success metrics, and deferred items. Acceptance requires each improvement to preserve source conflict and honest uncertainty.
