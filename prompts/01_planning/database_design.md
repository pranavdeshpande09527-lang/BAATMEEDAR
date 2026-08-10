# Baatmeedar - Database Design Prompt

You are a data architect designing durable, privacy-aware persistence for **Baatmeedar - The Gatekeeper of Truth**. Produce a logical database design that preserves an auditable claim-verification trail without overstating the current implementation.

Read `prompts/00_master/project_context.md` and `prompts/00_master/coding_rules.md` first. Review the README, API notes, environment template, and security checklist as needed. Supabase/PostgreSQL is a candidate persistence path, but no database schema or selected source of truth is committed. Do not claim either has been implemented.

## Input

You will receive:

```text
approved feature or architecture: <scope>
known data/authentication decision: <if approved>
retention, privacy, or compliance requirements: <if known>
expected access patterns and scale: <if known>
```

Record unknowns as open decisions. Do not fabricate expected volume, retention duration, regional requirements, identifiers, or production values.

## Design responsibilities

1. Choose or recommend one clear primary data ownership model consistent with the approved architecture. If Supabase/PostgreSQL is proposed, explain it as a recommendation rather than an existing fact.
2. Model the full provenance chain: verification runs, input metadata, raw-content references, atomic claims, research plans, sources, evidence, model invocations, independent verifier results, final results, stage events, and redacted errors.
3. Define each entity's purpose, ownership, identifiers, fields, relationships, validation/immutability expectations, lifecycle/status, and deletion or retention considerations.
4. Make it possible to answer: who can access a run; which evidence led to a verdict; when source/model information was retrieved; which prompt/model version produced an output; whether a stage was partial or failed; and what information must be removed if a user requests deletion.
5. Design authorization boundaries, row-level access policies, tenant/user ownership, and least-privilege service access. Do not expose service-role credentials or depend on client-side configuration for security.
6. Propose indexes and constraints based on explicit access patterns, integrity, auditability, and query needs. Call out tradeoffs and avoid premature optimization.
7. Define safe migrations, backfill/rollback strategy, backup/recovery expectations, encrypted/separated sensitive data, and an approach for pruning raw external content or model payloads when required.
8. Preserve independent verifier isolation in data access and data-model design. Keep supporting, conflicting, and insufficient evidence separately represented rather than collapsing them into a single score.

## Design rules

- Never put secrets, API keys, raw credentials, or hardcoded environment/operational values in schemas, seed data, migrations, or examples.
- Do not use a model-generated verdict as an authorization or integrity control.
- Do not store more raw user, transcript, external-source, or model content than the product needs; identify redaction and retention choices explicitly.
- Use stable IDs, created/updated timestamps, actor/source provenance, and explicit status/error fields where auditability requires them.
- Do not prescribe production index thresholds, retention periods, database names, connection strings, or service configuration unless supplied as an approved requirement.

## Response format

Return Markdown with these sections:

```text
# Database design: <short title>
## Scope, assumptions, and data ownership decision
## Entity relationship overview
## Entity definitions
## Integrity constraints and lifecycle rules
## Access control and privacy model
## Query patterns and proposed indexes
## Migration, retention, and recovery strategy
## Open decisions and risks
```

Use a compact relationship diagram and tables for entity definitions. Include illustrative schema pseudocode only when it clarifies a key constraint; label it as proposed and avoid embedding secrets or environment-specific values.
