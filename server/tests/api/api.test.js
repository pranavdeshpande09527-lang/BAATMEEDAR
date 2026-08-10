import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runRepository } from '../../src/repositories/runRepository.js';
import { createConfigurableAdapters } from '../fixtures/configurableFakes.js';
import { Orchestrator } from '../../src/services/orchestrator.js';

describe('Layer 3: HTTP API Contract & Security Tests', () => {
  const dummyConfig = {
    env: 'test',
    port: 3001,
    server: {
      corsOrigins: ['http://localhost:5500'],
      rateLimits: {
        verify: { max: 100, windowMs: 60000 },
        auth: { max: 100, windowMs: 60000 },
      },
    },
    guestSession: { ttlSeconds: 86400 },
  };

  const fakes = createConfigurableAdapters();
  const orchestrator = new Orchestrator(fakes, runRepository);

  const app = createApp({
    config: dummyConfig,
    runRepository,
    orchestrator,
  });

  describe('GET / Root Endpoint', () => {
    it('returns 200 with service metadata and online status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Baatmeedar API');
      expect(res.body.status).toBe('online');
      expect(res.body.endpoints).toBeDefined();
    });
  });

  describe('POST /verify Endpoint', () => {
    it('accepts valid text input and returns 201 with run_id UUID', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          input_type: 'text',
          content: 'The World Health Organization declared mpox a PHEIC in 2024.',
        });

      expect(res.status).toBe(201);
      expect(res.body.run_id).toBeDefined();
      expect(res.body.run_id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('accepts valid article HTTPS URL', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          input_type: 'article',
          content: 'https://www.reuters.com/article/who-mpox-declaration-2024',
        });

      expect(res.status).toBe(201);
      expect(res.body.run_id).toBeDefined();
    });

    it('accepts valid YouTube URL', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          input_type: 'youtube',
          content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });

      expect(res.status).toBe(201);
      expect(res.body.run_id).toBeDefined();
    });

    it('rejects blank text with 400 validation error', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
      expect(res.body.fields).toBeDefined();
      expect(res.body.correlation_id).toBeDefined();
    });

    it('rejects text exceeding 5000 characters', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: 'a'.repeat(5001) });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
      expect(res.body.fields[0].message).toContain('5000');
    });

    it('rejects control characters in text', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: 'Null byte \x00 in content.' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
    });

    it('rejects non-HTTPS article URL', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'article', content: 'http://insecure-domain.com/news' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
    });

    it('rejects invalid YouTube hostname (e.g. Vimeo)', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'youtube', content: 'https://www.vimeo.com/123456' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
    });

    it('rejects unknown input_type enum', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'tiktok', content: 'https://example.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
    });

    it('rejects unknown extra properties in body (strict mode)', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          input_type: 'text',
          content: 'Valid content string here.',
          extra_payload: 'malicious',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
    });

    it('handles malformed JSON body with 400 validation response', async () => {
      const res = await request(app)
        .post('/verify')
        .set('Content-Type', 'application/json')
        .send('{"input_type": "text", content: invalid_json}');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('validation');
      expect(res.body.error).toContain('Invalid JSON');
    });
  });

  describe('GET /verify/:run_id/status Endpoint', () => {
    it('returns run status for authorized owner', async () => {
      // 1. Submit run to create session cookie & run record
      const postRes = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: 'Claim for status test.' });

      const runId = postRes.body.run_id;
      const cookie = postRes.headers['set-cookie'];

      // 2. Query status using same guest cookie
      const statusRes = await request(app)
        .get(`/verify/${runId}/status`)
        .set('Cookie', cookie);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBeDefined();
      expect(statusRes.body.stage).toBeDefined();
    });

    it('returns 404 for non-existent run_id', async () => {
      const res = await request(app).get('/verify/00000000-0000-0000-0000-000000000000/status');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
    });

    it('returns 404 when querying run owned by another session', async () => {
      // Create run under session A
      const postRes = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: 'Session A claim.' });

      const runId = postRes.body.run_id;

      // Query status under fresh session B (no cookie)
      const res = await request(app).get(`/verify/${runId}/status`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /verify/:run_id/results Endpoint', () => {
    it('returns 404 when results are not found or run incomplete', async () => {
      const res = await request(app).get('/verify/00000000-0000-0000-0000-000000000000/results');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
    });
  });

  describe('Security Headers & Error Redaction', () => {
    it('attaches secure HTTP headers to all responses', async () => {
      const res = await request(app).get('/health/live');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('redacts all stack traces and internal errors in client responses', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ input_type: 'text', content: '' });

      expect(res.body.stack).toBeUndefined();
      expect(res.body.diagnostics).toBeUndefined();
      expect(res.body.correlation_id).toBeDefined();
    });
  });
});
