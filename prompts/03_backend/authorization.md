# Baatmeedar — Authorization Prompt

Use this prompt to protect verification runs, sources, evidence packets, exports, administration, and operational actions. Authentication identifies a principal; authorization decides what that principal may do.

## Task

Define and implement resource-based authorization before persistence is exposed. The repository has no current auth or database layer, so state the selected identity and storage path rather than assuming Supabase, Firebase, or a role model already exists.

## Policy requirements

- Make ownership explicit for every persisted run and related claim, evidence, and result record. A user may read, cancel, export, or delete only their own permitted runs.
- Define narrowly scoped roles only when needed (for example: user, support reviewer, administrator). Deny by default; administrative operations must be separate, audited, and never reachable from the public client using a service key.
- Enforce authorization in the backend/data layer on every read and write, including nested IDs, status endpoints, downloads, retries, and background-job callbacks. UI hiding is not authorization.
- If Supabase is chosen, write and test Row Level Security policies. If another database is chosen, enforce equivalent query constraints and transactions. Do not rely on an unrestricted service credential for normal user requests.
- Prevent IDOR by using opaque IDs plus ownership checks. Do not reveal whether an inaccessible run exists.
- Record redacted allow/deny audit events and ensure background workers act with a run's constrained ownership context.

## Deliverables

Return an authorization matrix, data-layer policy/query examples, error contract (`404` or policy-safe equivalent), and tests for cross-user reads/writes, guessed IDs, role escalation, worker retries, and revoked access. It is complete only when every route and background action has an explicit authorization decision.
