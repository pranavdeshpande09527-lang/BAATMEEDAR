# Baatmeedar — Authentication Prompt

Use this prompt when adding authentication to saved verification runs or user features. Authentication is not currently implemented; Supabase and Firebase are only configuration candidates. Select one primary identity system before implementation—do not create duplicate sources of truth.

## Task

Design a minimal auth boundary for Baatmeedar that allows anonymous public verification only if explicitly approved, and otherwise reliably associates private runs, history, exports, and notifications with an authenticated principal.

## Requirements

- Define supported flows (sign-up, sign-in, sign-out, refresh, reset, email verification, optional guest-to-account migration) and the UX for expired or unavailable sessions.
- Verify tokens on the server for every protected route. Never use a client-provided user ID or role as proof of identity.
- Store provider secrets and privileged keys on the server. Use secure, HttpOnly, Secure, SameSite cookies or the approved equivalent; document CSRF protections for cookie sessions.
- Rate-limit authentication by IP and account with configurable backoff, generic errors, and audit events that exclude secrets and full personal data.
- Use short-lived access credentials, safe session revocation, and least-privilege scopes. Avoid exposing whether an email address exists.
- Keep public runs deliberately separate from private account data, with an explicit retention policy and a secure migration path if guests later register.

## Deliverables

Provide the approved provider decision, identity/session schema, route contract, middleware boundary, configuration list, and deterministic tests for invalid, expired, revoked, replayed, rate-limited, and cross-account sessions. Acceptance requires server-side verification, no secrets in browser code, no account enumeration, and no unapproved access to another user's run.
