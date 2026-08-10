# Baatmeedar — Platform Roles

## Firebase Hosting — Frontend deployment

Firebase Hosting deploys and serves the static Baatmeedar frontend: HTML, CSS, JavaScript, public assets, and client-side routing. The browser calls the Render backend over HTTPS. Firebase Hosting must contain only public client configuration, such as the Render API URL and public Supabase project URL/publishable key. It must never store AI keys, database credentials, Supabase service-role keys, Google OAuth secrets, or verification data.

## Render — Backend deployment

Render deploys the protected Baatmeedar backend API and any asynchronous worker. It validates requests, verifies Supabase user sessions, manages protected guest sessions, runs the five-stage verification workflow, calls AI/retrieval providers, applies rate limits and SSRF controls, and returns safe status/results to Firebase Hosting. All provider keys, database credentials, operational configuration, and logs remain server-side in Render; no data, source, verdict, URL, limit, or secret may be hardcoded.

## Supabase — Database and Google authentication

Supabase PostgreSQL is the single source of truth for users, verification runs, claims, evidence, provenance, and results. Supabase Auth handles optional Google sign-in: a visitor can use Baatmeedar as a guest, then select **Continue with Google** later to save history or link eligible guest runs only after explicit consent. Google OAuth returns to an allowlisted Firebase Hosting callback URL; Render verifies the Supabase token server-side and Supabase Row Level Security protects each user's data. Firebase Authentication and Firestore must not duplicate Supabase authentication or database ownership.

## Required connection flow

`Firebase Hosting frontend → Render backend API → Supabase Auth/PostgreSQL and approved AI/retrieval providers`.

Use HTTPS, strict Firebase-origin CORS on Render, approved Supabase redirect URLs, server-only secrets, RLS, backend ownership checks, redacted logs, controlled migrations, backups, health checks, and truthful partial/error states when a dependency is unavailable.
