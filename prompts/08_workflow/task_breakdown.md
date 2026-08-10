# Baatmeedar — Task Breakdown Prompt

Use this prompt to turn a feature or defect into executable work without hiding dependencies.

## Task

Break `[request]` into small, ordered tasks. For each, state owner/boundary, affected files or proposed module, inputs/outputs, dependencies, risk, verification, and definition of done.

## Required decomposition

Account for: product contract; data/schema decisions; backend routes/orchestration; safe retrieval/provider adapters; UI contract; authorization/security; observability; tests/fixtures; migration/deployment; documentation. Mark a task blocked when an unselected provider, database, transcript solution, or identity decision is required—do not invent it.

## Baatmeedar guardrails

Every task must preserve atomic claims, attributable evidence, independent Grok/xAI and Gemini Stage 4 evaluation, and an honest `inconclusive`/partial outcome. Current UI endpoints are `/verify`, `/verify/{id}/status`, and `/verify/{id}/results`; version them deliberately if changed.

## Output

Return a dependency-ordered checklist with milestones, risks, test cases, and explicit deferred items. The smallest first milestone should be a testable vertical slice, not a cosmetic mock presented as a live fact-checking system.
