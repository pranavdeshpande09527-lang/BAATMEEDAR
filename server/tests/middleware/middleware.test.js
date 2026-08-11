import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Middleware Stack & Integration', () => {
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

  const app = createApp({ config: dummyConfig });

  it('attaches x-correlation-id header to every response', async () => {
    const res = await request(app).get('/health/live');
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('sets secure CORS headers for allowed origins', async () => {
    const res = await request(app)
      .get('/health/live')
      .set('Origin', 'http://localhost:5500');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5500');
  });

  it('allows Vercel frontend origins via CORS pattern match', async () => {
    const res = await request(app)
      .get('/health/live')
      .set('Origin', 'https://baatmeedar.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe('https://baatmeedar.vercel.app');
  });

  it('rejects CORS for disallowed origin', async () => {
    const res = await request(app)
      .get('/health/live')
      .set('Origin', 'http://malicious-site.com');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('authorization_denied');
  });

  it('creates guest session cookie for new visitors on /verify', async () => {
    const res = await request(app)
      .post('/verify')
      .send({ input_type: 'text', content: 'Valid claim statement for testing.' });

    expect(res.status).toBe(201);
    expect(res.body.run_id).toBeDefined();

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain('baatmeedar_guest=');
    expect(setCookie[0]).toContain('HttpOnly');
  });

  it('returns formatted safe error response for invalid input', async () => {
    const res = await request(app)
      .post('/verify')
      .send({ input_type: 'text', content: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation');
    expect(res.body.correlation_id).toBeDefined();
    expect(res.body.fields).toBeDefined();
  });
});
