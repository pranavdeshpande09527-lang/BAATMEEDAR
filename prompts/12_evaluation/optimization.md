# Baatmeedar — Optimization Prompt

Use this prompt to improve latency, cost, or usability after measuring a real bottleneck.

## Method

State baseline, target, workload, stage, and measurement. Optimize with safety constraints: never skip validation, reduce evidence provenance, merge independent verifiers, cache private results across users, or turn a provider failure into a result.

## Areas

Consider bounded parallel retrieval, query/source deduplication, queue concurrency, caching safe public metadata with expiry, efficient status polling, pagination, model routing only after quality evaluation, and payload minimization. Keep source dates/currency visible and record model/prompt version changes.

## Output

Return proposed change, quality/security impact, experiment design, metrics, regression tests, rollout/rollback, and observed result. Acceptance requires an evidence-backed improvement with unchanged epistemic and privacy guarantees.
