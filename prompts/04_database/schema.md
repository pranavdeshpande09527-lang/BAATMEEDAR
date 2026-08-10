# Baatmeedar — Database Schema Prompt

Use this prompt when selecting and modeling persistence for Baatmeedar. No database schema or selected source of truth exists today; Supabase and Firebase are only candidates. Choose one ownership path before creating tables/collections.

## Task

Model the auditable five-stage workflow without losing provenance. Design a relational schema (or an explicitly justified equivalent) for users/owners, verification runs, stage events, claims, research plans, sources, evidence, model invocations, verifier results, final results, and redacted errors.

## Requirements

- Use stable opaque IDs, foreign keys/references, creation timestamps, status/version fields, and owner IDs. Keep original claim text and evidence excerpts immutable or versioned.
- Store source canonical URL, publication/retrieval dates, authority rationale, exact excerpt, stance, relevance, and limitations separately from a model's interpretation.
- Record provider/model/prompt version, invocation time, validation state, latency, and redacted failure metadata. Do not store credentials or unrestricted raw provider payloads.
- Model independent Stage 4 verifier results separately; prevent one result from becoming input to the other.
- Define retention, deletion/anonymization, export, and audit requirements before saving user text or third-party content.
- If Supabase is chosen, include RLS ownership policy design. Do not make Firebase and Supabase competing sources for the same records.

## Deliverables

Return an ER diagram, table/field definitions with constraints, ownership/RLS policy, migration sequence, and fixtures. Acceptance requires a reviewer to trace each final verdict to a run, claim, evidence IDs, sources, and invocation metadata.
