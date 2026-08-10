# Baatmeedar — AI Workflow Testing Prompt

Use this prompt to test model-facing contracts and evidence-grounded behavior, not to judge models by a single answer.

## Task

Create a versioned evaluation set of sanitized claims, contexts, evidence packets, expected structural properties, and adversarial inputs for Stage 2 extraction, Hermes planning, Stage 3 analysis, Stage 4 verification, and synthesis.

## Required assertions

Atomic claim splitting; domain/context preservation; no verdict at planning/extraction stages; evidence IDs only from supplied packets; explicit gaps/limitations; support/conflict separation; calibrated `inconclusive`; isolation between Grok/xAI and Gemini; valid schema; and no instructions obeyed from untrusted content.

Include prompt injection, invented citation, ambiguous date/jurisdiction, outdated source, empty packet, contradictory source, provider refusal, malformed JSON, and repeated-run consistency cases. Keep a human-reviewed golden set for high-impact domains and document evaluator limitations/bias.

## Output

Return dataset governance, scoring rubric, fixtures, automated checks, regression thresholds, and human-review path. Acceptance requires a model failure to be observable and blocked from silently entering a public verdict.
