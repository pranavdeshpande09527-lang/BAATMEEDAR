# Baatmeedar — Technical Maintainer Documentation

## Overview & Purpose

This technical documentation provides maintainers with a complete reference for the **Baatmeedar Verification Engine & API Server** (`server/src/`). It documents the internal implementation, module interfaces, data validation schemas, error handling, evidence provenance tracking, and operational procedures required to safely maintain and extend the codebase.

---

## 1. Directory & Module Architecture

```
server/src/
├── app.js                 # Express application initialization & middleware setup
├── server.js              # Server HTTP listener & graceful shutdown handling
├── config/
│   └── index.js           # Environment configuration parser & validator
├── schemas/
│   └── verification.js    # Zod schemas for input validation & internal models
├── middleware/
│   ├── auth.js            # Supabase JWT authentication middleware
│   ├── errorHandler.js    # Global error response transformer
│   └── rateLimiter.js     # IP rate limiting middleware
├── adapters/
│   ├── tavilyAdapter.js   # Tavily Web Search & Extraction API adapter
│   ├── youtubeAdapter.js  # YouTube Transcript API adapter
│   ├── geminiAdapter.js   # Gemini LLM adapter (Extraction & Stage 4 Evaluator B)
│   ├── groqAdapter.js     # Groq fast inference adapter (Stage 3 research)
│   └── grokAdapter.js     # Grok xAI adapter (Stage 4 Evaluator A)
├── services/
│   ├── verificationService.js # 5-Stage verification orchestration workflow engine
│   └── runStore.js        # Run status & persistence manager (DB / In-Memory fallback)
├── repositories/
│   └── runRepository.js   # Data access layer for verification runs
└── logging/
    └── logger.js          # Pino structured logger instance
```

---

## 2. Public & Internal Interfaces

### Public REST Endpoints

#### 1. Initiate Verification Run
- **Endpoint**: `POST /api/v1/verify`
- **Authentication**: Optional for public demo, Bearer JWT required for authenticated persistence.
- **Request Body (Zod Validated)**:
```json
{
  "inputType": "statement", // Enum: "statement" | "article_url" | "youtube_url"
  "content": "Global renewable energy capacity increased by 50% in 2023."
}
```
- **Response (`202 Accepted`)**:
```json
{
  "status": "success",
  "data": {
    "runId": "run_941a8b2c-38d1-41e9-a291-764bc5f190e2",
    "status": "pending",
    "createdAt": "2026-08-10T14:30:00.000Z"
  }
}
```

#### 2. Get Verification Run Details
- **Endpoint**: `GET /api/v1/runs/:id`
- **Response (`200 OK`)**:
```json
{
  "status": "success",
  "data": {
    "runId": "run_941a8b2c-38d1-41e9-a291-764bc5f190e2",
    "status": "completed",
    "inputType": "statement",
    "inputContent": "Global renewable energy capacity increased by 50% in 2023.",
    "claims": [
      {
        "claimId": "clm_01",
        "statement": "Global renewable energy capacity increased by 50% in 2023.",
        "domain": "energy_environment",
        "evidence": [
          {
            "evidenceId": "ev_101",
            "sourceUrl": "https://www.iea.org/reports/renewables-2023",
            "sourcePublisher": "International Energy Agency",
            "publishedTimestamp": "2024-01-11T00:00:00Z",
            "retrievedTimestamp": "2026-08-10T14:30:05Z",
            "snippet": "Renewable energy capacity additions reached 510 GW in 2023, a 50% increase over 2022.",
            "relevanceScore": 0.96
          }
        ],
        "verdicts": {
          "grok": {
            "model": "grok-2",
            "verdict": "supported",
            "confidence": 0.95,
            "reasoning": "IEA official report confirms a 50% increase in additions."
          },
          "gemini": {
            "model": "gemini-1.5-pro",
            "verdict": "supported",
            "confidence": 0.94,
            "reasoning": "Data from the International Energy Agency validates the claim."
          }
        },
        "finalVerdict": "supported"
      }
    ],
    "completedAt": "2026-08-10T14:30:12.000Z"
  }
}
```

---

## 3. Data Validation & Schemas

Input and internal schemas are defined using **Zod** (`server/src/schemas/verification.js`).

```javascript
// Example schema definition (Zod)
const VerificationInputSchema = z.object({
  inputType: z.enum(['statement', 'article_url', 'youtube_url']),
  content: z.string().min(5).max(10000),
});
```

- Invalid payloads return a `400 Bad Request` containing structured field-level validation errors.
- URLs submitted for article/YouTube processing undergo URL format and protocol check (`http`/`https`).

---

## 4. Environment & Secrets Management

Configuration parameters are managed in `server/src/config/index.js`. 

| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `PORT` | Server | HTTP port (default: 5000) |
| `NODE_ENV` | Server | Environment string (`development` \| `production` \| `test`) |
| `LOG_LEVEL` | Logging | Pino log level (`trace` \| `debug` \| `info` \| `warn` \| `error`) |
| `CORS_ORIGIN` | Security | Allowed client origin domain |
| `GEMINI_API_KEY` | Backend Secret | Google Gemini LLM API authorization |
| `GROQ_API_KEY` | Backend Secret | Groq fast inference engine authorization |
| `TAVILY_API_KEY` | Backend Secret | Tavily search & extraction API authorization |
| `XAI_API_KEY` | Backend Secret | xAI Grok API authorization |
| `SUPABASE_URL` | Infrastructure | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Secret | Administrative database access key |

> [!CAUTION]
> Never hardcode or log raw API secret keys. Environment variables are loaded at startup and checked for presence; missing keys in live mode log a warning and fall back to mock adapters.

---

## 5. Provenance Ledger & Auditability

Every verification record maintains strict metadata fields for auditability:

1. `evidenceId`: Unique hash identifier for each retrieved quote/source.
2. `retrievedTimestamp`: ISO 8601 UTC timestamp of retrieval.
3. `sourceUrl` & `sourcePublisher`: Origin metadata for primary verification sources.
4. `model` & `promptVersion`: Exact evaluator model name and prompt template identifier recorded in evaluator verdicts.

---

## 6. Verifier Isolation Guardrails

Stage 4 evaluators (**Grok** and **Gemini**) are invoked independently in parallel:

- **Isolated Inputs**: Evaluators receive an isolated JSON payload containing `claim` and `evidence[]`.
- **Zero Cross-Talk**: Evaluator A output is never passed to Evaluator B.
- **Independent Failure Handling**: If one evaluator encounters an API timeout or error, the remaining evaluator's output is recorded, and the claim's final verdict resolves gracefully or marks the missing evaluator as `unavailable`.

---

## 7. Observability & Logging

Logging is handled via **Pino** (`server/src/logging/logger.js`), producing structured JSON output:

```json
{
  "level": 30,
  "time": 1723300205000,
  "pid": 1204,
  "hostname": "baatmeedar-api-1",
  "requestId": "req_550e8400-e29b-41d4-a716-446655440000",
  "runId": "run_941a8b2c",
  "stage": 3,
  "msg": "Stage 3 research completed for 2 claims in 1420ms"
}
```

- Each request assigns a unique `x-request-id` header for trace propagation across async log outputs.

---

## 8. Testing Suite

The project includes an integration test suite powered by **Vitest** and **Supertest**:

```bash
# Run tests synchronously
cd server
npm test

# Run tests in watch mode
npm run test:watch
```

Test files located in `server/tests/`:
- `verification.test.js`: Validates API request parsing, error returns, mock run transitions, and health check endpoints.

---

## 9. Operational Runbook & Troubleshooting

### Scenario A: Third-Party Provider Outage (e.g., Tavily / Gemini)
- **Symptom**: Runs linger in `researching` or fail with provider error messages.
- **Action**: Check `/api/v1/health` status. The system will log provider failures in Pino. Fall back to secondary web adapters or check provider status pages.

### Scenario B: High Rate of `inconclusive` Verdicts
- **Symptom**: Large number of runs ending in `inconclusive`.
- **Action**: Inspect Stage 3 retrieved evidence count. If Tavily return rate is zero, verify `TAVILY_API_KEY` quota and search parameters.

### Scenario C: Local Development with Mock Adapter
- Set `USE_MOCK=true` or leave API keys unconfigured to trigger built-in mock responses, enabling full local pipeline testing without active provider credits.
