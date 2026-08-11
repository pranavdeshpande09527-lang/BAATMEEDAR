# BAATMEEDAR — The Evidence-Transparent AI Newsroom

> **Baatmeedar** (बातमीदार — *The Reporter/Newsroom*) is an evidence-transparent AI verification engine designed to combat misinformation, verify conflicting claims, and deliver balanced, traceable news analysis.

---

## Table of Contents

- [Overview & Purpose](#overview--purpose)
- [The Five-Stage Verification Workflow](#the-five-stage-verification-workflow)
- [Current Implementation Status](#current-implementation-status)
- [Input Collection UX](#input-collection-ux)
- [Quick Start & Setup](#quick-start--setup)
  - [Frontend (Static / Mock Mode)](#1-frontend-static--mock-mode)
  - [Backend Server (Node.js REST API)](#2-backend-server-nodejs-rest-api)
- [API Contract Summary](#api-contract-summary)
- [Environment & Security Configuration](#environment--security-configuration)
- [AI Providers & System Roles](#ai-providers--system-roles)
- [Testing](#testing)
- [Deployment Status](#deployment-status)
- [System Limitations & Integrity Notice](#system-limitations--integrity-notice)
- [Contributing](#contributing)
- [Demo Instructions](#demo-instructions)

---

## Overview & Purpose

Modern journalism faces an overwhelming influx of unverified claims across text statements, digital news articles, and video content. Existing automated fact-checking tools often act as "black boxes"—delivering verdicts without transparent reasoning or clear source attribution.

**Baatmeedar** restructures verification into an open, auditable newsroom workflow. Every claim is broken down into atomic factual statements, independently researched across domain-specific sources, evaluated by isolated AI panel verifiers, and presented with complete evidence provenance.

---

## The Five-Stage Verification Workflow

Baatmeedar processes information through a strict 5-stage sequential pipeline:

```
[ Stage 1: Input Collection ]
  ├── Direct Text Statement
  ├── News Article URL (via Tavily extraction)
  └── YouTube Video URL (via Transcript API)
          │
          ▼
[ Stage 2: Claim Extraction & Classification ]
  └── Gemini extracts atomic factual claims & assigns domains (Health, Science, Politics, Tech, Finance)
          │
          ▼
[ Stage 3: Domain-Specific Evidence Research ]
  └── Hermes Orchestration + Tavily Search + Groq/Gemini context search -> Structured Evidence Cards
          │
          ▼
[ Stage 4: Independent Dual Verification ]
  ├── Evaluator A: Grok (xAI) independent claim vs. evidence analysis
  └── Evaluator B: Gemini independent claim vs. evidence analysis
          │
          ▼
[ Stage 5: Evidence-Transparent Verdict ]
  └── Final Consensus & Verdict Assignment: [ supported | contradicted | inconclusive ]
```

1. **Stage 1: Input Collection** — Raw content ingested via direct text, web article extraction, or YouTube transcripts.
2. **Stage 2: Claim Extraction & Classification** — Non-verifiable opinions are filtered out. Atomic factual statements are extracted and categorized by domain.
3. **Stage 3: Domain-Specific Research** — Orchestrated research collects primary sources, metadata, timestamps, and quotes for each claim.
4. **Stage 4: Independent Dual Verification** — Two independent evaluator models (**Grok** by xAI and **Gemini** by Google) analyze claims against gathered evidence without seeing each other's outputs.
5. **Stage 5: Final Result & Evidence Ledger** — Produces a transparent summary for every claim with source citations, evaluator reasoning, and an final determination (`supported`, `contradicted`, or `inconclusive`).

---

## Current Implementation Status

> [!NOTE]
> **Mock-Mode Caveat**: The committed static web client (`src/`) operates with `USE_MOCK = true` by default. Browser demonstrations render rich mock data representing full 5-stage pipeline outputs. The Node.js Express service (`server/`) implements the production REST API endpoints, schema validations, and adapter interfaces.

- **Frontend Browser Client (`src/`)**: Pure HTML5, CSS3 (Newspaper visual aesthetic), and Vanilla JS. Fully responsive, includes dynamic workflow progress animations, claim decomposition panels, and evidence modal inspection.
- **Backend API Service (`server/`)**: Express.js, Vitest, Zod validation, Pino structured logging, security headers (Helmet), rate limiting, and provider adapter abstractions.

---

## Input Collection UX

Baatmeedar supports three primary input modalities:

| Input Type | Handling & Pipeline Ingestion |
| :--- | :--- |
| **Direct Statement** | User submits raw claim text directly into the research workflow. |
| **Article URL** | Ingested via Tavily Web Extract API to obtain full-text body and metadata. |
| **YouTube URL** | Ingested via YouTube Transcript API to extract timestamped closed captions. |

---

## Quick Start & Setup

### Prerequisites
- Node.js v18+ and `npm`
- Python 3.10+ (if running transcript tools locally)

### 1. Frontend (Static / Mock Mode)

No build step required for the frontend. You can serve it using any HTTP server:

```bash
# Serve static frontend directly using npx serve or python http.server
npx serve src -p 3000
```
Open `http://localhost:3000` in your browser.

### 2. Backend Server (Node.js REST API)

```bash
# Navigate to backend server directory
cd server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```
The server will start on `http://localhost:5000` (or specified `PORT`).

---

## API Contract Summary

The backend exposes the following standardized REST endpoints:

- `POST /api/v1/verify` — Initiates a new verification run.
  - **Body**: `{ "inputType": "statement" | "article_url" | "youtube_url", "content": "string" }`
- `GET /api/v1/runs/:id` — Fetches status and results of a verification run.
- `GET /api/v1/runs` — Lists past verification runs.
- `GET /api/v1/health` — System health and dependency check endpoint.

---

## Environment & Security Configuration

Create a `.env` file based on `.env.example`. **Never commit secrets to repository control.**

```env
# Server Configuration
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000

# API Keys (Backend Only)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
XAI_API_KEY=your_grok_xai_api_key

# Supabase (Database & Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## AI Providers & System Roles

To ensure clarity and avoid confusion:

| Provider / Model | Distinct Role in Baatmeedar Pipeline |
| :--- | :--- |
| **Gemini (Google)** | Stage 2 Claim Extraction, Stage 3 Research Analysis, and Stage 4 Evaluator B. |
| **Tavily API** | Stage 1 Article Extraction & Stage 3 Web Evidence Discovery. |
| **Groq** | Fast Llama-based LLM inference acceleration engine for Stage 3 processing. |
| **Grok (xAI)** | Stage 4 Independent Evaluator A (analyzes claims against Stage 3 evidence). |

---

## Testing

Run the automated test suite in the backend server directory:

```bash
cd server
npm test
```

This runs Vitest integration tests verifying request validation, mock run handling, endpoint responses, and error handlers.

---

## Deployment Status

- **GitHub Pages**: Automated frontend deployment workflow available in `.github/workflows/deploy-gh-pages.yml`.
- **Docker Containerization**: Available via root `Dockerfile` and `docker-compose.yml`.
- **Render Deployment**: Supported via `render.yaml` for containerized backend hosting (`https://baatmeedar.onrender.com`).
- **Firebase Hosting**: Static frontend hosting configuration available in `firebase.json`.

---

## System Limitations & Integrity Notice

- **Evidence Transparency over Absolute Truth**: Baatmeedar does not claim omniscient factual truth. Verdicts represent automated synthesis based strictly on retrieved, traceable evidence.
- **Handling Inconclusive Outcomes**: When retrieved evidence is insufficient, ambiguous, or contradictory without clear resolution, the system returns `inconclusive` rather than hallucinating or guessing.
- **Model Isolation**: Stage 4 evaluators (Grok & Gemini) operate independently without cross-model contamination.

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/amazing-feature`).
2. Adhere to project guidelines in `prompts/00_master/coding_rules.md`.
3. Run tests before submitting a Pull Request (`npm test`).

---

## Demo Instructions

1. Start the frontend application or open `src/index.html`.
2. Select an input mode (Direct Statement, News Article URL, or YouTube URL).
3. Click **Verify Claim**.
4. Observe the real-time stage progression through Stage 1 -> Stage 5.
5. Inspect individual claim cards, source links, and side-by-side Grok/Gemini independent evaluation breakdowns.
