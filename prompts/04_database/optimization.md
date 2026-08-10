# Baatmeedar — Database Optimization Prompt

Use this prompt to diagnose database performance only after observable measurements identify a bottleneck.

## Task

Measure and improve run/status/result access while preserving provenance, authorization, and correctness. The database is not implemented yet, so do not claim a slow query or chosen engine until supplied with evidence.

## Method

1. State workload, data volume, latency target, query plan, and affected user path.
2. Verify ownership/RLS predicates and pagination before optimizing; an unfiltered fast query is not acceptable.
3. Fix data access first: select only needed fields, avoid N+1 retrieval, paginate lists, batch safe reads, and add evidence-backed indexes.
4. Keep complete provenance records; if archival or summarization is proposed, retain IDs, integrity, retention, and export requirements.
5. Use caching only for safe, scoped data with TTL/invalidation and never let a cache leak one user's run to another or make stale evidence look current.
6. Re-measure under representative sanitized load and document tradeoffs.

## Deliverables

Return a baseline, proposed change, query-plan comparison, security impact, load-test result, and rollback plan. Acceptance requires a measured improvement with unchanged authorization, exact evidence traceability, and truthful stale/partial-state handling.
