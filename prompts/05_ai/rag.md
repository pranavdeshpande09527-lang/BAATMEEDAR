# Baatmeedar — Retrieval-Augmented Generation Prompt

Use this prompt when adding retrieval to the evidence workflow. Retrieval is not implemented today; Tavily is a documented candidate, not a completed evidence source.

## Task

Build a retrieval pipeline that discovers, safely fetches, inspects, and attributes candidate sources for one atomic claim. It must seek both support and contradiction and make lack of adequate evidence visible.

## Requirements

- Start from Hermes's research plan, domain source priorities, temporal/scope context, and targeted query candidates.
- Treat search snippets as leads only. Before evidence is stored, capture canonical URL, title, publisher/author, publication/retrieval dates, source type, authority rationale, exact relevant excerpt, stance, relevance, and limitations.
- Enforce SSRF-safe URL retrieval, public-provider/scheme allowlists, redirect/DNS/IP validation, content-type/size/time limits, robots/licensing policy, deduplication, and safe text extraction.
- Rank authority and directness, not just semantic similarity. Preserve credible conflicting and insufficient evidence.
- Do not use vector similarity or summaries to invent a quote or convert stale/indirect material into proof. Preserve source and evidence IDs supplied to later models.

## Deliverables

Return retrieval/evidence schemas, source-ranking policy, safe-fetch interface, caching/expiry policy, provider fakes, and tests for injection in pages, blocked URLs, stale sources, duplicates, unsupported media, contradiction, and empty retrieval. Acceptance requires a reader to inspect every displayed evidence statement at its source.
