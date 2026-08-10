## Baatmeedar — Supabase Google Authentication Prompt

Use this prompt to implement Baatmeedar authentication with **Google OAuth through Supabase Auth**. Google is the selected sign-in method for the current scope. The application must also let a person verify a claim without creating an account, then choose to sign in later.

## Product behavior

1. A visitor may submit and view a verification run as a guest. Do not block the core fact-checking flow behind a sign-in wall.
2. Show a clear, optional **“Continue with Google”** action in suitable places: the header, after submission, and when the visitor wants to save history, export results, receive notifications, or access the run on another device.
3. When the visitor chooses Google sign-in, redirect through Supabase Auth and return only to an allowlisted application callback URL.
4. After successful sign-in, restore the visitor to the intended screen. Offer to attach eligible guest runs to the signed-in account; never transfer them silently.
5. If the visitor declines, dismisses, or fails sign-in, preserve the guest experience and show a safe, actionable message. Do not imply that guest runs are permanently saved.

## Guest-run policy

- Create guest runs with a server-generated opaque ID and a temporary, HttpOnly, Secure, SameSite session/cookie or equivalent protected guest token. Never rely on a user-supplied owner ID.
- Guest users may view, cancel, or retry only runs associated with their own protected guest session. They must not be able to enumerate or access another guest's run.
- Define a short, documented retention period for guest data. Display the retention limitation before a guest leaves or starts authentication.
- On account linking, require both a valid Supabase user session and proof of control of the guest session. Perform the transfer atomically, audit it, and make it idempotent.
- Do not merge data from a different browser/device merely because the same person later signs in. Only explicitly linked, eligible guest runs move to the account.

## Supabase implementation requirements

- Configure Google as an enabled provider in Supabase and use approved redirect/callback URLs for local, staging, and production environments.
- Browser code may use only intentionally public Supabase configuration (project URL and publishable/anon key). Keep the Supabase service-role key, database connection, and any provider secrets server-side.
- Verify Supabase access tokens on the backend for every authenticated route. Do not trust browser claims, role values, or a client-provided user ID.
- Use the authenticated Supabase user ID as the account owner. Apply Row Level Security and backend ownership checks to runs, claims, evidence, results, exports, and account-linked guest runs.
- Keep Google identity data minimal. Store only fields needed for the product, define retention/deletion/export behavior, and avoid logging tokens, email addresses, or full profile payloads.
- Support sign-out, expired/revoked session handling, OAuth callback failure, denied consent, and account-linking conflicts. Use generic user-facing errors and redacted server diagnostics.
- Apply configurable rate limits to account-linking and protected actions. OAuth itself should not reveal whether a particular Google account already exists in the product.

## Required API and state design

Define typed, versioned contracts for:

```text
GuestSession: guest_session_id, expiry, allowed run IDs
AuthenticatedOwner: supabase_user_id
RunOwner: guest session OR authenticated owner, never both ambiguously
LinkGuestRuns request: selected eligible run IDs, authenticated session, guest-session proof
LinkGuestRuns result: linked IDs, skipped IDs and safe reason codes
```

The existing client contract remains:

```text
POST /verify
GET  /verify/{run_id}/status
GET  /verify/{run_id}/results
```

Preserve it for guest and signed-in users. Add account/history/linking endpoints only with server-side authorization and a documented client migration.

## Deliverables

1. Google OAuth/Supabase configuration checklist and callback/redirect policy.
2. Guest-session, authenticated-owner, and guest-to-account-linking schemas/state transitions.
3. UI copy and states for optional sign-in, return-from-OAuth, linking consent, guest expiry, sign-out, and failure.
4. Supabase RLS policies and backend authorization rules.
5. Deterministic tests for guest isolation, OAuth callback validation, expired/revoked sessions, cross-user access, optional linking, duplicate linking, sign-out, and token/error redaction.

## Acceptance criteria

- A visitor can use the core verification flow without an account.
- Google sign-in occurs only through Supabase and approved redirect URLs.
- Signing in later is optional, explicit, and safely links only the visitor's eligible guest runs.
- No service-role credential, OAuth secret, access token, or private run data reaches browser logs, URLs, or another user.
- All saved/account-linked data is protected by verified Supabase identity plus RLS and backend ownership checks.
