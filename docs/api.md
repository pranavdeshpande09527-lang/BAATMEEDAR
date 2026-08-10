# Baatmeedar — API Keys & Configuration Roles

# Database and user data
Supabase URL — Connects Baatmeedar to its Supabase project.
Supabase Anon Key — Allows the frontend to access data under the current user’s permissions.
Supabase Publishable Key — Client-safe Supabase key for browser-side authentication and data requests.
Supabase Service Role Key — Gives the backend full administrative database access. Keep secret.
Database URL / PostgreSQL Connection String — Lets the backend connect directly to the Baatmeedar database. Keep secret.

# Backend deployment

Backend URL — Connects the Baatmeedar frontend to the backend API.
Render Service ID — Identifies the deployed backend service on Render.
Render Service Name — Human-readable name of the Render backend service.
Render API Key — Lets deployment tools manage or monitor the Render service. Keep secret.

# Firebase services

Firebase API Key — Initializes Firebase for the Baatmeedar frontend.
Firebase Auth Domain — Supports sign-in and authentication redirects.
Firebase Project ID — Identifies the Firebase project.
Firebase Storage Bucket — Stores uploaded files and media.
Firebase Messaging Sender ID — Enables push notifications.
Firebase App ID — Identifies the Baatmeedar web app in Firebase.
Firebase Measurement ID — Enables analytics and usage tracking.
VITE_FIREBASE_* keys — The same Firebase configuration for a Vite-based frontend.

# AI and research

Gemini API Key — Generates AI responses and supports analysis.
Groq API Key — Provides fast AI inference and response generation.
Tavily API Key — Searches the web and finds current sources for research.

# Email notifications
Brevo SMTP Server and Port — Route outgoing emails through Brevo.
SMTP Login and SMTP Key — Authenticate emails such as verification, password-reset, and notification messages. Keep secret.
Brevo API Key — Sends and manages transactional emails through Brevo. Keep secret.

# Video content
YouTube API Key — Searches and retrieves relevant YouTube videos or recommendations. Keep secret.

Keep all service-role, database, Render, AI, search, SMTP, Brevo, and YouTube credentials on the backend. Only client-safe Supabase and Firebase configuration should be exposed to the frontend.

# API Key Instructions

- Store all API keys in `.env.local`; never commit this file to GitHub.
- Never share secret keys in chat, screenshots, frontend code, or public repositories.
- Keep these keys on the backend only: Supabase Service Role, database connection, Render, Gemini, Groq, Tavily, Brevo, SMTP, and YouTube.
- Only use `NEXT_PUBLIC_*` or `VITE_*` for values that are intentionally safe to expose in the browser, such as Firebase configuration and Supabase publishable keys.
- Restrict API keys by domain, IP address, or API permissions whenever the provider supports it.
- Rotate a key immediately if it is accidentally exposed.
- Use separate API keys for local development, testing, and production.
- Apply Supabase Row Level Security and Firebase security rules; client-side configuration alone does not secure user data.