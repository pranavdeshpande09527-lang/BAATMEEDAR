# Baatmeedar — External Tools Inventory & Governance Matrix

This document provides an authoritative inventory of external tools, third-party APIs, database services, operational infrastructure, and CI/CD tools used within the Baatmeedar 5-stage verification system.

---

## 1. Tool Governance Matrix

| Tool / Provider | Stage / Layer | Purpose | Data Sent / Received | Owner / Credential Boundary | Auth Method | Rate / Cost Limit | Retention & Data Privacy | Fallback / Fake |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemini API** | Stage 1 (Extraction) & Stage 5 (Synthesis) | Extract atomic claims from input; synthesize final editorial verdict | Sent: Text/Transcript snippet.<br>Recv: Extracted claims JSON, final synthesis report. | Server-only (`GEMINI_API_KEY`) | API Key (HTTP Header) | Tier/Quota bounded | No retention for model training; payload size bounded | `fakeGeminiAdapter` (Deterministic mock claims/synthesis) |
| **Groq SDK** | Stage 3 (Research Analysis) | Fast LLM inference for claim entity/context extraction | Sent: Claim text.<br>Recv: Entities, search terms. | Server-only (`GROQ_API_KEY`) | API Key (`groq-sdk`) | Provider API limits | Ephemeral request context only | `fakeGroqAdapter` (Fallback to static research entity breakdown) |
| **Tavily API** | Stage 3 (Research) | Web search for evidence retrieval | Sent: Search query string.<br>Recv: External web snippet links & text. | Server-only (`TAVILY_API_KEY`) | API Key | Bounded monthly queries | Ephemeral response caching | `fakeTavilyAdapter` (Mock web research search results) |
| **Grok / xAI API** | Stage 4 (Independent Verification) | Cross-examination verification against independent model | Sent: Claim + retrieved evidence.<br>Recv: Independent claim assessment. | Server-only (`XAI_API_KEY`) | API Key (`xAI`) | Cost/Rate limits per tier | Ephemeral request context only | `fakeXAIAdapter` (Fallback to deterministic verification) |
| **YouTube Data API / Subtitle Parser** | Stage 1 (Input Processing) | Fetch video metadata & transcript subtitles | Sent: YouTube Video ID / URL.<br>Recv: Video metadata & transcript text. | Server-only (`YOUTUBE_API_KEY` optional) | API Key / Public XML endpoint | 10k units/day (Data API) | Public video metadata only | `fakeYoutubeAdapter` (Mock transcript extraction) |
| **Supabase Postgres + Auth** | Persistence & Authentication | Primary user identity, session management, RLS-protected storage of verification runs | Sent: User auth tokens, run records.<br>Recv: User profiles, historical run records. | Server-side Service Role key; Client publishable key | JWT Bearer / RLS | Postgres Pool Limit | Persistent database; user-owned deleted on demand | In-memory Postgres pool (`pg-mem` / local DB) |
| **Resend API** | Communication / Email | Opt-in transactional email (account verification, password reset, completion alert) | Sent: Recipient email, signed action link.<br>Recv: Email ID / status. | Server-only (`RESEND_API_KEY`) | API Key | 100 emails/day (Free tier) | Bounded email log retention (redacted) | `fakeResendAdapter` (In-memory email delivery log) |
| **Docker** | Infrastructure | Containerized runtime environment | Sent: N/A<br>Recv: Reproducible app image. | Local Dev & Production CI/CD | Daemon Unix socket / Dockerhub | N/A | Local / Registry image retention | Direct Node.js runtime process |
| **Render** | Deployment | Hosting environment for backend web service | Sent: N/A<br>Recv: Public HTTPS endpoint. | Deployment configuration secrets | Deploy Key / Environment secrets | Instance CPU/RAM limits | Ephemeral instance disk | Local Express server (`npm start`) |
| **GitHub Actions** | CI/CD | Continuous Integration & Security Scanning | Sent: Git commit / PR diff.<br>Recv: Build/test status. | Repository secret vault (`GITHUB_TOKEN`) | Scoped GitHub App JWT | 2,000 minutes/month | Artifacts retained 90 days max | Local `npm test` script execution |

---

## 2. Explicit Architecture Decisions

1. **Primary Persistence & Auth**: **Supabase** is the single source of truth for user authentication and Postgres database storage with Row-Level Security (RLS). **Firebase** is cataloged as non-overlapping/inactive to prevent duplicate authentication state.
2. **YouTube Transcript Retrieval**: YouTube Data API is supplemented by a robust subtitle parser adapter fallback. When official API quota is exceeded or transcripts are missing, the adapter safely degrades without failing the verification run.
3. **Groq vs. Grok Isolation**: Groq (Stage 3 research analysis) and Grok/xAI (Stage 4 independent verification) operate under distinct adapter contracts with separate API keys and timeout configurations.
4. **Resend Email Delivery**: Resend is selected as the primary transactional email provider. Email links use HMAC-SHA256 signed, short-lived tokens. Sender credentials remain strictly server-side.

---

## 3. Security & Governance Guardrails

- **Least-Privilege Credentials**: Third-party API keys reside exclusively in server environment variables (`.env`). No secret is ever exposed in client code or browser bundles.
- **Redacted Error Logging**: Third-party API response bodies, authorization headers, and raw user prompts are scrubbed before logging.
- **Deterministic Fakes**: Every external provider adapter implements a corresponding fake adapter to enable isolated offline testing.
- **Health Checks & Circuit Breakers**: The backend periodically verifies provider status via health probes without leaking topology or API credentials.
