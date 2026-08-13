import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../src/routes/health.js';

describe('Health Routes (/health/live & /health/ready)', () => {
  it('GET /health/live returns 200 OK for process liveness', async () => {
    const app = express();
    app.use('/health', healthRoutes({}));

    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /health/ready returns 200 when database and providers are configured (production with passing canary)', async () => {
    const app = express();
    const mockDb = {
      pool: {},
      query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    };
    const mockAdapters = {
      // Gemini & Tavily adapters with canary-callable methods that succeed
      gemini: {
        apiKey: 'valid-gemini-key',
        extractClaims: vi.fn().mockResolvedValue({ claims: [], removed_opinions: [] }),
      },
      groq: { apiKey: 'valid-groq-key' },
      tavily: {
        apiKey: 'valid-tavily-key',
        search: vi.fn().mockResolvedValue([]),
      },
      resend: { apiKey: 'valid-resend-key' },
    };
    app.use('/health', healthRoutes({ db: mockDb, adapters: mockAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database).toBe('ok');
    // In production canary mode, a passing Gemini canary reports 'ready'
    expect(res.body.checks.providers.gemini).toBe('ready');
  });

  it('GET /health/ready returns 503 when database query fails', async () => {
    const app = express();
    const failingDb = {
      pool: {},
      query: vi.fn().mockRejectedValue(new Error('Connection refused')),
    };
    const mockAdapters = {
      gemini: {
        apiKey: 'valid-gemini-key',
        extractClaims: vi.fn().mockResolvedValue({ claims: [], removed_opinions: [] }),
      },
      groq: { apiKey: 'valid-groq-key' },
      tavily: {
        apiKey: 'valid-tavily-key',
        search: vi.fn().mockResolvedValue([]),
      },
    };
    app.use('/health', healthRoutes({ db: failingDb, adapters: mockAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.database).toBe('unavailable');
  });

  it('GET /health/ready returns 503 when a required provider is unconfigured in production', async () => {
    const app = express();
    const mockDb = {
      pool: {},
      query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    };
    // groq is null — key-presence check will catch it; Gemini canary succeeds
    const incompleteAdapters = {
      gemini: {
        apiKey: 'valid-gemini-key',
        extractClaims: vi.fn().mockResolvedValue({ claims: [], removed_opinions: [] }),
      },
      groq: null,
      tavily: {
        apiKey: 'valid-tavily-key',
        search: vi.fn().mockResolvedValue([]),
      },
    };
    app.use('/health', healthRoutes({ db: mockDb, adapters: incompleteAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.providers.groq).toBe('unconfigured');
  });

  it('GET /health/ready returns 503 when Gemini canary fails in production', async () => {
    const app = express();
    const mockDb = {
      pool: {},
      query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    };
    const brokenAdapters = {
      // Gemini canary throws — simulates invalid key or egress block
      gemini: {
        apiKey: 'bad-key',
        extractClaims: vi.fn().mockRejectedValue(Object.assign(new Error('[GoogleGenerativeAI Error]: 401 API key invalid'), { status: 401 })),
      },
      groq: { apiKey: 'valid-groq-key' },
      tavily: {
        apiKey: 'valid-tavily-key',
        search: vi.fn().mockResolvedValue([]),
      },
    };
    app.use('/health', healthRoutes({ db: mockDb, adapters: brokenAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.providers.gemini).toBe('not_ready');
    // Error detail must NOT be leaked to HTTP response — only sanitised code
    expect(res.body.checks.canary.gemini.ok).toBe(false);
    expect(res.body.checks.canary.gemini.error).toBe('provider_error_401');
  });

  it('GET /health/ready uses key-presence check in non-production (no external calls)', async () => {
    const app = express();
    const mockAdapters = {
      gemini: { apiKey: 'any-key' },
      groq: { apiKey: 'any-key' },
      tavily: { apiKey: 'any-key' },
      resend: { apiKey: 'any-key' },
    };
    // isProd: false — no canary calls, key-presence only
    app.use('/health', healthRoutes({ adapters: mockAdapters, config: { isProd: false } }));

    const res = await request(app).get('/health/ready');
    // Should succeed with key-presence check; no real outbound calls
    expect(res.body.checks.providers.gemini).toBe('configured');
    expect(res.body.checks.providers.tavily).toBe('configured');
  });
});
