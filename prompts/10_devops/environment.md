# Baatmeedar — Environment Configuration Prompt

Use this prompt to define validated configuration. `.env.example` lists candidate values; it does not establish active services, and real `.env` values must never be read or printed.

## Task

Create a typed configuration schema with environment-specific defaults, validation, owner, sensitivity, and rotation notes. Fail safely at startup or before a dependent operation with a redacted actionable error.

## Classify

Browser-safe values only (for example an intentionally public backend URL or public Firebase/Supabase identifier) versus server-only secrets: database connection, Supabase service role, Gemini/Groq/Grok-xAI/Tavily/transcript/provider keys, SMTP/Resend/Brevo credentials, and deployment tokens. Add `GROK_API_KEY` only when Grok/xAI is actually approved; Groq is not Grok.

## Requirements

- Centralize model IDs, URLs, rate/cost limits, retries, timeouts, CORS origins, feature flags, retention, and logging policy—no hardcoded operational values.
- Define local/test/staging/production sources and secret rotation/revocation. Test config without real secrets.
- Choose one auth/data source of truth; do not configure Supabase and Firebase redundantly.

## Deliverables

Return schema, sanitized example file, validation behavior, deployment inventory, and secret-handling tests. Acceptance requires client builds to contain no server secret and an absent configuration to be honest, not silently mocked as live.
