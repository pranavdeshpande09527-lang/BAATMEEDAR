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

  it('GET /health/ready returns 200 when database and providers are configured', async () => {
    const app = express();
    const mockDb = {
      pool: {},
      query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    };
    const mockAdapters = {
      gemini: { apiKey: 'valid-gemini-key' },
      groq: { apiKey: 'valid-groq-key' },
      tavily: { apiKey: 'valid-tavily-key' },
      resend: { apiKey: 'valid-resend-key' },
    };
    app.use('/health', healthRoutes({ db: mockDb, adapters: mockAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.checks.providers.gemini).toBe('configured');
  });

  it('GET /health/ready returns 503 when database query fails', async () => {
    const app = express();
    const failingDb = {
      pool: {},
      query: vi.fn().mockRejectedValue(new Error('Connection refused')),
    };
    const mockAdapters = {
      gemini: { apiKey: 'valid-gemini-key' },
      groq: { apiKey: 'valid-groq-key' },
      tavily: { apiKey: 'valid-tavily-key' },
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
    const incompleteAdapters = {
      gemini: { apiKey: 'valid-gemini-key' },
      groq: null, // missing groq
      tavily: { apiKey: 'valid-tavily-key' },
    };
    app.use('/health', healthRoutes({ db: mockDb, adapters: incompleteAdapters, config: { isProd: true } }));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.providers.groq).toBe('unconfigured');
  });
});
