# Baatmeedar — Reusable Best Practices Prompt

Apply these practices to every change:

- Inspect existing code and preserve unrelated work.
- Define typed contracts before connecting UI, storage, tools, or models.
- Separate routes, domain orchestration, adapters, persistence, configuration, and rendering.
- Preserve IDs, timestamps, exact evidence excerpts, source metadata, prompt/model versions, and redacted errors.
- Make provider calls replaceable with deterministic fakes; handle timeout, rate limit, malformed output, cancellation, retry, and partial result explicitly.
- Enforce server-side validation, SSRF-safe retrieval, authorization, rate limits, least privilege, and redacted logging.
- Seek and display credible counterevidence; a search snippet or model memory is not evidence.
- Test and document what is implemented, mocked, deferred, and credential-dependent.
