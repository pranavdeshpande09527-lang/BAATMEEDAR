import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../../src/services/orchestrator.js';
import { createConfigurableAdapters } from '../fixtures/configurableFakes.js';
import { runRepository } from '../../src/repositories/runRepository.js';

describe('Layer 2: Orchestrator Integration & Boundary Tests', () => {
  const owner = { type: 'guest', id: 'guest-integration-session' };

  beforeEach(async () => {
    await runRepository.reset();
  });

  it('orchestrates complete 5-stage text verification workflow', async () => {
    const fakes = createConfigurableAdapters();
    const orchestrator = new Orchestrator(fakes);
    const runId = '11111111-1111-1111-1111-111111111111';

    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'The World Health Organization declared mpox a PHEIC in 2024.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'The World Health Organization declared mpox a PHEIC in 2024.',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.claims.length).toBe(1);
    expect(results.verdicts[0].final.verdict).toBe('supported');
  });

  it('orchestrates article URL input with Tavily extraction', async () => {
    const fakes = createConfigurableAdapters();
    const orchestrator = new Orchestrator(fakes);
    const runId = '22222222-2222-2222-2222-222222222222';

    await runRepository.create({
      id: runId,
      input_type: 'article',
      content: 'https://www.reuters.com/business/healthcare/who-declares-mpox',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'article',
      content: 'https://www.reuters.com/business/healthcare/who-declares-mpox',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.input.type).toBe('article');
    expect(results.input.source_url).toBe('https://www.reuters.com/business/healthcare/who-declares-mpox');
  });

  it('orchestrates YouTube URL input with YouTube transcript retrieval', async () => {
    const fakes = createConfigurableAdapters();
    const orchestrator = new Orchestrator(fakes);
    const runId = '33333333-3333-3333-3333-333333333333';

    await runRepository.create({
      id: runId,
      input_type: 'youtube',
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'youtube',
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.input.type).toBe('youtube');
  });

  it('short-circuits gracefully when no factual claims are extracted', async () => {
    const fakes = createConfigurableAdapters({ emptyClaims: true });
    const orchestrator = new Orchestrator(fakes);
    const runId = '44444444-4444-4444-4444-444444444444';

    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'I personally think pineapple on pizza is delicious.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'I personally think pineapple on pizza is delicious.',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    const results = await runRepository.getResults(runId, owner);
    expect(results.claims.length).toBe(0);
    expect(results.removed_opinions.length).toBeGreaterThan(0);
    expect(results.verdicts.length).toBe(0);
  });

  it('handles verifier disagreement by producing an inconclusive final verdict', async () => {
    const fakes = createConfigurableAdapters({
      groqVerdict: 'supported',
      geminiVerdict: 'contradicted',
    });
    const orchestrator = new Orchestrator(fakes);
    const runId = '55555555-5555-5555-5555-555555555555';

    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'Controversial statement with conflicting verifier outputs.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'Controversial statement with conflicting verifier outputs.',
    });

    const results = await runRepository.getResults(runId, owner);
    expect(results.verdicts[0].groq.verdict).toBe('supported');
    expect(results.verdicts[0].gemini.verdict).toBe('contradicted');
    expect(results.verdicts[0].final.verdict).toBe('inconclusive');
  });

  it('enforces verifier isolation (Groq verify does NOT receive Gemini output)', async () => {
    const fakes = createConfigurableAdapters();
    const groqSpy = vi.spyOn(fakes.groq, 'verify');
    const geminiSpy = vi.spyOn(fakes.gemini, 'verify');

    const orchestrator = new Orchestrator(fakes);
    const runId = '66666666-6666-6666-6666-666666666666';

    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'Claim to verify isolation.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'Claim to verify isolation.',
    });

    expect(groqSpy).toHaveBeenCalled();
    expect(geminiSpy).toHaveBeenCalled();

    const groqEvidencePacket = groqSpy.mock.calls[0][1];
    expect(groqEvidencePacket.gemini).toBeUndefined();
    expect(groqEvidencePacket.gemini_verdict).toBeUndefined();

    const geminiEvidencePacket = geminiSpy.mock.calls[0][1];
    expect(geminiEvidencePacket.groq).toBeUndefined();
    expect(geminiEvidencePacket.groq_verdict).toBeUndefined();
  });

  it('marks run as failed when provider adapter throws an unexpected error', async () => {
    const fakes = createConfigurableAdapters({ failExtraction: true });
    const orchestrator = new Orchestrator(fakes);
    const runId = '77777777-7777-7777-7777-777777777777';

    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'Failing run claim.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'Failing run claim.',
    });

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('failed');
  });
});
