# Baatmeedar — Debugging Prompt

Use this prompt to diagnose a reproducible issue before proposing a fix.

## Method

Capture expected versus actual behavior, run/claim/correlation ID, environment, inputs sanitized for privacy, stage, timestamps, and recent change. Reproduce with a deterministic fake where possible. Trace the boundary in order: client contract, API validation, orchestration state, provider adapter, evidence/provenance, persistence, and renderer.

## Rules

- Do not inspect, print, or request secrets, `.env` values, private source text, credentials, or raw user data.
- Distinguish current mock behavior (`USE_MOCK = true`) from live integration behavior.
- Do not turn an error into a success or downgrade a validation failure into a final verdict.
- Verify evidence IDs, source attribution, timestamps, stage transitions, and isolation of Grok/xAI from Gemini before attributing an issue to a model.
- Fix root cause with a regression test; document a safe rollback when data/migrations are involved.

## Output

Return evidence, root-cause hypothesis/confidence, minimal fix, tests, security/privacy impact, and any unresolved dependency. Acceptance requires the bug no longer reproduces and no new path exposes misleading evidence or internal errors.
