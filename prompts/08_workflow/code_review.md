# Baatmeedar — Code Review Prompt

Review `[change]` against the actual repository and the master prompts. Prioritize correctness, safety, evidence integrity, and regressions over style.

## Review checklist

- Does it preserve the five-stage workflow, atomic claims, stable provenance IDs, visible conflict, and `inconclusive`?
- Are routes, services, provider adapters, persistence, and rendering separated and schema-validated?
- Are secrets server-only; URLs SSRF-safe; authorization server/data-layer enforced; errors/logs redacted; rate limits configurable?
- Are Groq and Grok/xAI distinct, and are Stage 4 evaluators isolated?
- Does it avoid presenting the static mock UI or an unconfigured integration as live?
- Are status/result payload changes compatible with the current browser contract or deliberately versioned?
- Are tests included for failure, adversarial input, evidence attribution, and user isolation?

## Output

Report only actionable findings with severity, file/location, impact, concrete remediation, and test gap. Also state residual risks and approval conditions. Do not request unrelated rewrites or expose secrets in review text.
