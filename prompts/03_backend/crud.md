# Baatmeedar — Verification Run CRUD Prompt

Use this prompt to add safe create/read/update/delete behavior for verification data. Do not reduce the product to generic CRUD: evidence provenance and workflow immutability matter.

## Task

Define APIs and domain services for runs, claims, research plans, sources, evidence, verifier results, and final editorial results. Preserve the browser's existing submission/status/results contract while adding a versioned authenticated API only when needed.

## Rules

- Creation accepts only validated Stage 1 input. It creates a run ID, owner/retention metadata, initial status, and an immutable input record before work is queued.
- Workflow-produced records are append-only or versioned. Never allow a client to forge evidence, verifier results, model metadata, or a final verdict through an update endpoint.
- Permit narrowly defined user actions such as cancellation, deletion request, or export. Define what cancellation means for in-flight provider calls and preserve a redacted audit trail.
- Paginate and authorize all listing endpoints; filter queries by ownership and bound page size. Avoid returning raw transcript/article content unless the viewer is permitted and the retention policy allows it.
- Use idempotency keys for submission/retry paths and transactions or outbox-style coordination where persistence and job dispatch meet.
- Use typed schemas at the route boundary and stable enums for stages, statuses, stances, and verdicts.

## Deliverables

Provide route contracts, data ownership rules, mutation/state-transition table, error response shape, and tests for duplicate submissions, invalid transitions, deletion, cancellation races, partial work, and cross-user access. Completion requires auditable provenance and no client-controlled truth or evidence fields.
