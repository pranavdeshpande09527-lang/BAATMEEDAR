import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runRepository } from '../../src/repositories/runRepository.js';
import { createConfigurableAdapters } from '../fixtures/configurableFakes.js';
import { Orchestrator } from '../../src/services/orchestrator.js';

describe('Layer 4: End-to-End Workflow Test Matrix (Stage 1 -> Stage 5)', () => {
  beforeEach(async () => {
    await runRepository.reset();
  });
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

  it('Matrix Row 1: Direct statement input -> both supported -> supported verdict', async () => {
    const fakes = createConfigurableAdapters({
      groqVerdict: 'supported',
      geminiVerdict: 'supported',
    });
    const orchestrator = new Orchestrator(fakes, runRepository);
    const app = createApp({ config: dummyConfig, runRepository, orchestrator });

    // 1. Post request
    const postRes = await request(app)
      .post('/verify')
      .send({
        input_type: 'text',
        content: 'The World Health Organization declared mpox a PHEIC in 2024.',
      });

    expect(postRes.status).toBe(201);
    const runId = postRes.body.run_id;
    const cookie = postRes.headers['set-cookie'];

    // Wait briefly for async orchestration to complete
    await new Promise((r) => setTimeout(r, 150));

    // 2. Query status
    const statusRes = await request(app)
      .get(`/verify/${runId}/status`)
      .set('Cookie', cookie);

    expect(statusRes.body.status).toBe('complete');
    expect(statusRes.body.stage).toBe('complete');

    // 3. Query results
    const resultsRes = await request(app)
      .get(`/verify/${runId}/results`)
      .set('Cookie', cookie);

    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.claims.length).toBe(1);
    expect(resultsRes.body.verdicts[0].final.verdict).toBe('supported');
  });

  it('Matrix Row 2: Article URL input -> both contradicted -> contradicted verdict', async () => {
    const fakes = createConfigurableAdapters({
      groqVerdict: 'contradicted',
      geminiVerdict: 'contradicted',
    });
    const orchestrator = new Orchestrator(fakes, runRepository);
    const app = createApp({ config: dummyConfig, runRepository, orchestrator });

    const postRes = await request(app)
      .post('/verify')
      .send({
        input_type: 'article',
        content: 'https://www.reuters.com/article/false-headline-claim',
      });

    expect(postRes.status).toBe(201);
    const runId = postRes.body.run_id;
    const cookie = postRes.headers['set-cookie'];

    await new Promise((r) => setTimeout(r, 150));

    const resultsRes = await request(app)
      .get(`/verify/${runId}/results`)
      .set('Cookie', cookie);

    expect(resultsRes.body.verdicts[0].groq.verdict).toBe('contradicted');
    expect(resultsRes.body.verdicts[0].gemini.verdict).toBe('contradicted');
    expect(resultsRes.body.verdicts[0].final.verdict).toBe('contradicted');
  });

  it('Matrix Row 3: YouTube URL input -> verifier disagreement -> inconclusive verdict', async () => {
    const fakes = createConfigurableAdapters({
      groqVerdict: 'supported',
      geminiVerdict: 'contradicted',
    });
    const orchestrator = new Orchestrator(fakes, runRepository);
    const app = createApp({ config: dummyConfig, runRepository, orchestrator });

    const postRes = await request(app)
      .post('/verify')
      .send({
        input_type: 'youtube',
        content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });

    expect(postRes.status).toBe(201);
    const runId = postRes.body.run_id;
    const cookie = postRes.headers['set-cookie'];

    await new Promise((r) => setTimeout(r, 150));

    const resultsRes = await request(app)
      .get(`/verify/${runId}/results`)
      .set('Cookie', cookie);

    expect(resultsRes.body.verdicts[0].final.verdict).toBe('inconclusive');
  });

  it('Matrix Row 4: Short-circuited run (opinion only) -> 0 verdicts, complete status', async () => {
    const fakes = createConfigurableAdapters({ emptyClaims: true });
    const orchestrator = new Orchestrator(fakes, runRepository);
    const app = createApp({ config: dummyConfig, runRepository, orchestrator });

    const postRes = await request(app)
      .post('/verify')
      .send({
        input_type: 'text',
        content: 'I believe this policy is completely wrong and unfair.',
      });

    expect(postRes.status).toBe(201);
    const runId = postRes.body.run_id;
    const cookie = postRes.headers['set-cookie'];

    await new Promise((r) => setTimeout(r, 150));

    const statusRes = await request(app)
      .get(`/verify/${runId}/status`)
      .set('Cookie', cookie);

    expect(statusRes.body.status).toBe('complete');

    const resultsRes = await request(app)
      .get(`/verify/${runId}/results`)
      .set('Cookie', cookie);

    expect(resultsRes.body.claims.length).toBe(0);
    expect(resultsRes.body.verdicts.length).toBe(0);
  });

  it('Matrix Row 5: Extraction provider failure -> status failed', async () => {
    const fakes = createConfigurableAdapters({ failExtraction: true });
    const orchestrator = new Orchestrator(fakes, runRepository);
    const app = createApp({ config: dummyConfig, runRepository, orchestrator });

    const postRes = await request(app)
      .post('/verify')
      .send({
        input_type: 'text',
        content: 'Statement causing extraction failure.',
      });

    const runId = postRes.body.run_id;
    const cookie = postRes.headers['set-cookie'];

    await new Promise((r) => setTimeout(r, 150));

    const statusRes = await request(app)
      .get(`/verify/${runId}/status`)
      .set('Cookie', cookie);

    expect(statusRes.body.status).toBe('failed');
  });
});
