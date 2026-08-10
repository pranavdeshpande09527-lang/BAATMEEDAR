# Baatmeedar — AI Quality Evaluation Prompt

## Purpose

Use this prompt to design, implement, or review evaluation for Baatmeedar's AI-assisted claim-verification stages. Evaluate trustworthiness and workflow conformance, not just whether a response sounds polished.

Read `prompts/00_master/project_context.md`, `prompts/00_master/coding_rules.md`, `docs/instruction_for_Hermes_agent.md`, and the relevant stage prompt before acting. No automated evaluation harness, live AI adapter, or provider test suite exists in the repository today. `src/js/api.js` supplies one illustrative mock result and must not be treated as a benchmark or live evidence.

## Inputs

```text
stage or component under evaluation: <claim extraction, Hermes planning, evidence analysis, verification, synthesis>
approved output schema and prompt/model versions: <if known>
representative fixture policy: <synthetic, licensed, or approved public material>
release decision to support: <development comparison, regression gate, human review, etc.>
known risk domains: <health, law, politics, finance, current events, etc.>
```

Do not build a benchmark from unverified model-generated claims or copyrighted/private content without an approved use and retention policy.

## Evaluation dimensions

Measure, at minimum:

| Dimension | What to test |
| --- | --- |
| Contract validity | Schema-valid output, stable IDs, allowed enums, and complete required fields. |
| Claim quality | Atomicity, preservation of wording/context, correct non-verifiable exclusions, domain/temporal classification. |
| Plan quality | Research question precision, appropriate source hierarchy, counterevidence search, explicit gaps. |
| Grounding | Conclusions cite supplied evidence IDs only; no invented sources, quotations, dates, or tool results. |
| Epistemic calibration | Appropriate `inconclusive`, scoped confidence, visible limitations, no unwarranted certainty. |
| Evidence handling | Supporting, conflicting, and insufficient evidence remain separate; time/scope/source limitations are recognized. |
| Independence | Grok/xAI and Gemini verification inputs/results are isolated. Groq Stage 3 analysis is not substituted for Grok. |
| Safety | Prompt injection resistance, secret/privacy protection, unsafe content boundaries, redacted errors. |
| Reliability | Stable behavior under malformed input, provider errors, retries, partial evidence, and rate limiting. |

## Required evaluation approach

1. Define the evaluation question, target stage, fixtures, reviewers, rubric, scoring method, and decision use before running a comparison.
2. Version fixtures, expected labels/rationales, prompt versions, model identifiers, evaluator implementation, and run metadata. Record changes so regressions are explainable.
3. Use deterministic provider fakes for contract and failure tests. Use separately approved, bounded live-provider evaluations only when credentials, budgets, and privacy requirements allow it.
4. Include cases for direct statements, article URLs, YouTube transcript unavailable, prompt injection in source text, compound/ambiguous claims, stale evidence, conflicting authoritative sources, weak sources, missing citations, empty evidence, malformed model JSON, and provider timeout/refusal.
5. Use human review for high-impact or nuanced quality judgments. Do not let a model judge itself without independent criteria and auditability.
6. Treat a high fluency score as insufficient. A model that makes unsupported claims, hides conflict, or chooses a verdict despite inadequate evidence fails the evaluation.
7. Keep thresholds, sampling rates, budgets, and release gating policy configurable and explicitly approved; do not bury them in prompts or tests.

## Deliverables

1. An evaluation specification with rubric, fixtures, expected outcomes, scoring aggregation, and known blind spots.
2. A machine-readable test-case format that captures the input, trusted evidence packet, expected contract constraints, and reviewer notes without secrets.
3. Automated checks for schema validity, evidence-ID grounding, verifier isolation, and `inconclusive` behavior.
4. A human-review guide for claim atomicity, authority/scope judgments, and dangerous overclaiming.
5. A concise report that distinguishes measured findings from assumptions and identifies release blockers or follow-up work.

## Acceptance criteria

- The suite can catch fabricated citations, invalid schemas, loss of conflict, verifier leakage, and unjustified certainty.
- Tests are reproducible without live provider calls for baseline CI.
- Each result is traceable to prompt/model/fixture versions and does not expose secrets or private raw content.
- The evaluation does not claim production readiness merely because the static mock UI renders a result.
