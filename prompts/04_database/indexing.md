# Baatmeedar — Database Indexing Prompt

Use this prompt to add or review indexes after the Baatmeedar schema and query patterns are known.

## Task

Derive indexes from real access paths: fetch a run by ID and owner, poll status, list a user's runs by time/status, retrieve claims/evidence for results, find pending jobs, and enforce uniqueness/idempotency. Do not add indexes merely because columns look important.

## Requirements

- Document each query, expected cardinality, ownership filter, ordering, and evidence from query plans or representative measurements.
- Favor composite indexes that match selective filters and sort order, for example owner plus creation time, or run ID plus stage/status where the selected database supports it.
- Use unique constraints for stable external IDs/idempotency keys only when their scope is explicit.
- Consider write cost, storage, migrations, and privacy; indexes may expose lookup patterns and must respect RLS/query policies.
- Create/build large production indexes safely and monitor lock/runtime behavior. Remove redundant indexes only after confirming no required query relies on them.

## Deliverables

Return query inventory, index definitions, explain-plan evidence, rollout plan, and regression tests. Acceptance requires each index to improve a named authorized query without weakening constraints or forcing unbounded scans of private data.
