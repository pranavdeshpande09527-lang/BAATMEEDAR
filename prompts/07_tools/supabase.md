# Baatmeedar — Supabase Integration Prompt

Use this prompt only if Supabase is selected as the primary persistence/authentication path. It is listed in configuration examples but is not connected to the current prototype.

## Task

Define the Supabase role: Postgres persistence, authentication, storage, or a clearly bounded combination. Do not duplicate Firebase ownership for the same identity or verification data.

## Requirements

- Keep service-role and direct database credentials strictly server-side. The browser may use only intentionally public URL/publishable configuration.
- Create a provenance-aware schema and Row Level Security policies for every table/storage object. Test all CRUD operations with anon/authenticated/non-owner/admin identities.
- Use server-side migrations, transaction-aware run creation/job dispatch, configurable pooling/timeouts, and redacted database errors.
- Define retention, deletion/export, backup/restore, and audit behavior before persisting input/source text.
- Treat RLS as defense in depth alongside backend ownership checks; never use a service role for ordinary user requests.

## Deliverables

Return an architecture decision, schema/migrations, RLS policies, configuration list, local test strategy, and security tests. Acceptance requires an authenticated user to access only their own permitted runs and no secret key to reach browser code.
