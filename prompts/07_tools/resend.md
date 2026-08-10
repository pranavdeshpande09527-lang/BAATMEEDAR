# Baatmeedar — Transactional Email Prompt

Use this prompt to add transactional email after choosing Resend or the documented Brevo/SMTP alternative. Neither is implemented; choose one sender path and document why.

## Task

Implement a server-side, opt-in email adapter for account verification, password reset, verification-complete notifications, or exports where approved.

## Requirements

- Store sender credentials server-side, validate recipient/tenant authorization, rate-limit sends, and use provider-supported idempotency when available.
- Send privacy-minimal templates: no secret, full claim text, full evidence packet, or sensitive verdict in email unless the user explicitly requested it and policy allows it.
- Use signed, short-lived, single-use links for account actions; never put credentials or raw database IDs in links.
- Handle bounces, complaints, unsubscribe/preferences, delivery failure, and retries. Log only redacted message metadata.
- Keep template content clear that a result is evidence-based and may be inconclusive; do not imply human or professional certification.

## Deliverables

Provide provider decision, adapter, configuration, templates, consent/preference model, fake tests, and delivery/error metrics. Acceptance requires sending only from backend with no account enumeration or leakage of private run data.
