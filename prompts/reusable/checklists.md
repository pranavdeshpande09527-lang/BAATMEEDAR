# Baatmeedar — Reusable Completion Checklist

Before handoff, confirm:

- Scope, affected workflow stage, assumptions, and dependencies are explicit.
- Input/output schemas, validation, IDs, and status transitions are defined.
- Evidence is attributable to inspectable sources and conflict/limitations remain visible.
- Grok/xAI and Gemini Stage 4 inputs/results remain isolated.
- `inconclusive`, partial, cancelled, and safe error paths work.
- No secret, raw stack trace, private data, untrusted instruction, or unrestricted tool access leaks.
- Authorization/ownership and SSRF/rate-limit protections are tested where relevant.
- Tests use mocks/fakes, include failure/adversarial cases, and pass.
- Docs/demo/readme accurately distinguish mock from live behavior.
- Deployment/migration/rollback implications are documented when applicable.
