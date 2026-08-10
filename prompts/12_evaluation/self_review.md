# Baatmeedar — Self-Review and Evolution Prompt

Use this prompt before considering a feature or release complete.

## Review

Compare the change with the master prompts, actual repository, and requested scope. Check workflow correctness, atomic claims, provenance, source conflict, independent Stage 4 verification, verdict vocabulary, security, privacy, accessibility, observability, tests, docs, and deployment readiness.

## Questions

- What is implemented, mocked, deferred, or dependent on credentials/decisions?
- Can every public conclusion be traced to supplied evidence IDs and source metadata?
- Can failure, partial work, disagreement, and `inconclusive` be shown honestly?
- Are secrets, private data, raw errors, prompt injection, SSRF, IDOR, and cross-verifier leakage prevented?
- What regression tests and documentation changes are still needed?

## Output

Return strengths, blockers, prioritized fixes, residual risks, and a release decision. Do not self-certify functionality that has not been executed and tested.
