# Baatmeedar — Embeddings and Semantic Retrieval Prompt

## Purpose

Use this prompt to decide whether embeddings are useful for Baatmeedar and, only when approved, to design or implement them safely. Embeddings are optional: they are not currently implemented, and semantic similarity must never be mistaken for verification evidence.

Read `prompts/00_master/project_context.md`, `prompts/00_master/coding_rules.md`, `prompts/01_planning/database_design.md`, and the repository documentation first. The project has no selected database, vector store, schema, persistence layer, or RAG implementation. Supabase/PostgreSQL is documented only as a candidate, and Firebase must not become a competing source of truth without an approved division of responsibility.

## Inputs

```text
business question embeddings should answer: <specific, measurable use case>
candidate corpus: <what content, owner, retention, and legal basis>
approved data/authentication architecture: <if any>
retrieval consumers: <researcher, internal reviewer, user feature, etc.>
privacy, retention, deletion, scale, and cost constraints: <known facts only>
```

If no concrete use case improves on keyword/domain search or the corpus cannot be stored lawfully and safely, recommend not adding embeddings yet.

## Allowed uses and non-negotiable limits

Suitable candidate uses include finding related prior runs owned by the same user, deduplicating already-inspected source material, or helping a reviewer locate semantically related evidence records. Retrieved chunks are leads only.

Do not use embeddings to:

- determine whether a claim is true or false;
- manufacture citations, source authority, exact quotations, or publication dates;
- replace fresh Stage 3 web research for time-sensitive claims;
- bypass ownership rules or reveal one user's inputs/runs to another;
- embed secrets, credentials, hidden prompts, unredacted sensitive source text, or arbitrary third-party content without a documented retention basis.

## Design requirements

1. State the expected benefit, baseline, evaluation method, and stopping rule before choosing a vector technology.
2. Keep the vector index attached to canonical, access-controlled records rather than treating it as an independent source of truth. Store stable document/evidence IDs, owner/tenant, provenance, content version/hash, source date, embedding model/version, creation time, and deletion state.
3. Chunk deterministically with provenance boundaries. Each returned chunk must link to a permitted original record and an exact displayable excerpt; never reconstruct evidence from vector values alone.
4. Apply authorization and row-level/tenant filters before or during retrieval, not after exposing results. If Supabase/PostgreSQL with pgvector is approved, describe it as a proposed implementation until migrations and policies exist.
5. Define ingestion validation, duplicate handling, encryption/access controls, retention, re-embedding, deletion propagation, and handling for model changes. A deletion request must remove both content and derived vectors according to the approved policy.
6. Keep source freshness, jurisdiction, population, and domain authority available as explicit metadata. Similarity score is not an authority or truth score.
7. Design the retrieval interface to return no result when appropriate and to expose relevance/limitations internally without presenting an overconfident answer to users.
8. Use provider adapters and configuration for embedding model, dimensions, batch sizes, thresholds, and storage. Do not hardcode operational values or send provider credentials to the client.

## Deliverables

Return a decision record or implementation plan containing:

1. The exact use case and a recommendation to implement, defer, or reject embeddings.
2. A proposed data model and access-control boundary, clearly labeled as proposed if no database decision exists.
3. Ingestion, retrieval, re-indexing, retention, and deletion flows.
4. A retrieval contract that returns record IDs, permitted excerpts, provenance, model/version metadata, and limitations—not fabricated evidence.
5. A test plan covering authorization isolation, deletion, stale/index-version behavior, adversarial text, duplicate content, no-result behavior, and evaluation against a curated relevance set.

## Acceptance criteria

- Every retrieved item is authorized, traceable to its source record, and visibly distinguished from newly inspected evidence.
- Vector similarity never directly changes a claim verdict or evidence stance.
- The design works with mocked embedding and storage adapters.
- The proposal is honest about the absence of an existing vector/database implementation and does not select both Firebase and Supabase as duplicate data stores.
