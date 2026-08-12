import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/services/orchestrator.js';
import { createAdapters } from '../../src/adapters/adapterFactory.js';
import { runRepository } from '../../src/repositories/runRepository.js';

describe('Final End-to-End Verification Pipeline', () => {
  const adapters = createAdapters({}, true); // deterministic test adapters
  const orchestrator = new Orchestrator(adapters, runRepository);
  const owner = { type: 'guest', id: 'e2e-test-session' };

  it('E2E Flow 1: Direct Statement Ingestion -> Full 5-Stage Output', async () => {
    const runId = 'e2e-text-run-001';
    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'India won the cricket match yesterday.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'India won the cricket match yesterday.',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.run_id).toBe(runId);
    expect(results.input.type).toBe('text');
    expect(results.claims.length).toBeGreaterThan(0);
    expect(results.research.length).toBeGreaterThan(0);
    expect(results.verdicts.length).toBeGreaterThan(0);
    expect(results.verdicts[0].final.verdict).toBeTruthy();
  });

  it('E2E Flow 2: Article URL Ingestion -> Full 5-Stage Output', async () => {
    const runId = 'e2e-article-run-002';
    const articleUrl = 'https://reuters.com/world/sports-victory';
    await runRepository.create({
      id: runId,
      input_type: 'article',
      content: articleUrl,
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'article',
      content: articleUrl,
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.run_id).toBe(runId);
    expect(results.input.type).toBe('article');
    expect(results.claims.length).toBeGreaterThan(0);
  });

  it('E2E Flow 3: YouTube URL Ingestion -> Full 5-Stage Output', async () => {
    const runId = 'e2e-yt-run-003';
    const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await runRepository.create({
      id: runId,
      input_type: 'youtube',
      content: ytUrl,
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'youtube',
      content: ytUrl,
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.run_id).toBe(runId);
    expect(results.input.type).toBe('youtube');
    expect(results.claims.length).toBeGreaterThan(0);
  });
});
