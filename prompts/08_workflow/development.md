# Baatmeedar — Development Workflow Prompt

Use this prompt for any implementation task. First read the master prompts and relevant docs, then inspect the actual static frontend. It is a prototype with mock API results, not a completed service.

## Workflow

1. Restate the requested outcome, affected workflow stage, assumptions, dependencies, and non-goals.
2. Inspect existing code and preserve unrelated changes. Identify whether the task needs an architecture decision (runtime, database, auth, provider, transcript service) before coding.
3. Define typed contracts and acceptance tests before wiring UI, provider, storage, or background work.
4. Implement the smallest vertical slice with separated route, domain, adapter, persistence, and presentation boundaries.
5. Test successful, invalid, unavailable, adversarial, contradictory, stale, rate-limited, and partial-failure paths using fakes.
6. Update docs and report exactly what is live, mocked, deferred, or credential-dependent.

## Guardrails

Preserve the five stages, source/evidence provenance, verifier isolation, `supported|contradicted|inconclusive` vocabulary, secret boundaries, and honest failures. Do not replace Groq with Grok/xAI or expose provider keys in the static client.

## Completion

A task is complete only when the affected path is tested end to end, failures are actionable and redacted, evidence can be inspected, and implementation claims match the repository.
