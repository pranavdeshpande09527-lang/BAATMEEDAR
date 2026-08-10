# Baatmeedar — Firebase Integration Prompt

Use this prompt only if Firebase is selected as the primary approved service for a defined responsibility. It is currently an environment-template option, not an active integration.

## Task

Decide whether Firebase owns authentication, storage, notifications, or other scoped capabilities. Do not make it a duplicate database/authentication source beside Supabase without a documented boundary.

## Requirements

- Separate browser-safe Firebase configuration from Admin SDK credentials, which remain server-only.
- Define authenticated user identity, security rules, ownership checks, storage path rules, retention, and emulator-based tests.
- Enforce rules server-side/in Firebase policy; do not trust client UI checks. Restrict uploads and media by type/size/content if introduced.
- Record how verification runs and provenance are owned, exported, deleted, and audited. Avoid storing provider secrets, raw prompts, or unneeded source text.
- Use feature flags and mocks/emulators; return generic errors to the UI.

## Deliverables

Provide an architecture decision, rules/policy, configuration list, emulator tests for cross-user access and denial, and a migration/rollback plan. Acceptance requires no overlapping source of truth and no privileged credential in the browser bundle.
