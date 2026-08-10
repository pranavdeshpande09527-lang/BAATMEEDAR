# Baatmeedar — Presentation Deck Outline

> **Visual Theme**: Newspaper-inspired UI aesthetic (classic typography, clean high-contrast layouts, vintage masthead styling)  
> **Target Audience**: Hackathon Judges, Journalists, AI Researchers & Engineers  
> **Key Message**: Evidence transparency over black-box AI certainty.

---

## Slide 1: Title Slide & Product Vision
- **Visual**: Baatmeedar Newspaper Masthead header graphic.
- **Headline**: BAATMEEDAR (बातमीदार) — The Gatekeeper of Truth
- **Subtitle**: An Evidence-Transparent AI Newsroom for Verifiable News & Claim Analysis
- **Footer**: Presentation Version 1.0 | Open Source AI Journalism Project

---

## Slide 2: The Problem — Misinformation & Black-Box AI
- **Bullet Points**:
  - **Information Overload**: Misinformation propagates rapidly across text, articles, and social video feeds.
  - **The Black-Box Flaw**: Existing AI fact-checkers output opinions or unsupported binary verdicts without audit trails.
  - **Source Blindness**: Users cannot inspect where claims originated, when data was retrieved, or how conflicting sources were handled.
- **Graphic**: Split comparison — Opaque LLM output vs. Baatmeedar Evidence Ledger.

---

## Slide 3: The Solution & Product Promise
- **Bullet Points**:
  - **Structured Workflow**: Deconstruct complex inputs into single, atomic factual claims.
  - **Primary Source Evidence**: Every claim is anchored to verifiable primary web sources and timestamped quotes.
  - **Dual Independent Verifiers**: Eliminates single-model bias by evaluating evidence concurrently through isolated AI models (**Grok by xAI** & **Google Gemini**).
  - **Embracing Ambiguity**: Explicitly reports `inconclusive` when evidence is missing or contradictory.

---

## Slide 4: The Five-Stage Verification Pipeline
- **Diagram**:
  ```
  Stage 1: Input Collection (Text / Article URL / YouTube Transcript)
     │
  Stage 2: Claim Extraction & Domain Classification (Gemini API)
     │
  Stage 3: Domain-Specific Evidence Research (Hermes + Tavily + Groq)
     │
  Stage 4: Independent Dual Verification (Grok xAI + Gemini)
     │
  Stage 5: Consensus & Evidence-Transparent Verdict (supported | contradicted | inconclusive)
  ```
- **Key Takeaway**: Multi-stage separation prevents hallucinated context from corrupting claim extraction.

---

## Slide 5: Input Flexibility & Ingestion UX
- **Card 1: Direct Statement Ingestion** — Direct text evaluation for breaking headlines or user submissions.
- **Card 2: Article URL Extraction** — Ingested via Tavily Extract API to isolate article body text from website clutter.
- **Card 3: YouTube Video Transcript** — Automated transcript parsing to evaluate spoken claims in video content.
- **Badge**: *Currently Demonstrated via Browser Client (`src/index.html`)*

---

## Slide 6: Evidence Provenance & Independent Verifier Design
- **Key Features**:
  - **Source Provenance ID**: Every evidence snippet maintains an immutable hash (`ev_3a19b882`), publisher ID, and ISO timestamp.
  - **Model Isolation Guardrails**: Evaluator A (**Grok**) and Evaluator B (**Gemini**) receive identical evidence packages independently without cross-model visibility.
  - **Consensus Engine**: If evaluators agree, verdict is `supported` or `contradicted`. If they disagree or sources conflict, verdict resolves to `inconclusive`.

---

## Slide 7: Technical Architecture & Provider Matrix
- **Component Overview**:
  - **Frontend**: Vanilla HTML5/CSS3/JS with Newspaper design tokens. Operates in mock mode when `USE_MOCK = true`.
  - **Backend Server**: Express.js REST API (`server/`) with Zod request schemas, Pino structured logging, and Vitest test suite.
  - **Storage & Auth**: Supabase PostgreSQL database integration with Row-Level Security (RLS).
- **Provider Clarification**:
  - **Groq**: Fast Llama inference acceleration engine for Stage 3 research processing.
  - **Grok**: Frontier LLM by xAI serving as Stage 4 Evaluator A.

---

## Slide 8: Safety, Isolation & Anti-Hallucination Controls
- **Bullet Points**:
  - **Prompt Injection Shields**: Strict Zod validation and input sanitization before sending payloads to LLM APIs.
  - **Strict Citation Requirements**: Evaluators cannot issue `supported` verdicts without referencing specific retrieved `evidenceId` hashes.
  - **Controlled Failure Modes**: Rate limiting, API key encapsulation, and zero secret leakage to browser clients.

---

## Slide 9: Current Status — Implemented vs. Planned Roadmap
- **Implemented & Verified**:
  - [x] Responsive Newspaper UI Dashboard (`src/index.html`).
  - [x] Full 5-stage simulated workflow client state machine.
  - [x] Express.js REST API backend with `/api/v1/verify` and `/api/v1/runs` endpoints.
  - [x] Zod schemas, Pino logging, and Vitest test suite.
- **Planned Backend Integrations**:
  - [ ] Live third-party provider API key orchestration in production server deployment.
  - [ ] Multi-tenant Supabase auth & user dashboard persistence.

---

## Slide 10: Summary & Vision
- **Summary**: Baatmeedar transforms fact-checking from opaque opinions into an open, auditable newsroom ledger.
- **Call to Action**: Explore the code on GitHub, review the documentation in `/docs`, or test the live prototype!
