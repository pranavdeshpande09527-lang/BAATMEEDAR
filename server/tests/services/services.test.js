import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/services/orchestrator.js';
import { createAdapters } from '../../src/adapters/adapterFactory.js';

describe('5-Stage Workflow Orchestration (with test fakes)', () => {
  const fakes = createAdapters(null, true);
  const orchestrator = new Orchestrator(fakes);

  it('runs complete 5-stage pipeline end-to-end and produces renderer-compatible results', async () => {
    const runId = '00000000-0000-0000-0000-000000000001';
    const owner = { type: 'guest', id: 'guest-test-session' };

    // Register run in repository
    await orchestrator.repo.create({
      id: runId,
      input_type: 'text',
      content: 'The World Health Organization declared mpox a Public Health Emergency of International Concern in 2024.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    // Execute 5-stage pipeline
    await orchestrator.startRun(runId, {
      input_type: 'text',
      content: 'The World Health Organization declared mpox a Public Health Emergency of International Concern in 2024.',
    });

    // Check status
    const status = await orchestrator.repo.getStatus(runId, owner);
    expect(status).not.toBeNull();
    expect(status.status).toBe('complete');
    expect(status.current_stage).toBe('complete');

    // Check full renderer-compatible results
    const results = await orchestrator.repo.getResults(runId, owner);
    expect(results.run_id).toBe(runId);
    expect(results.claims.length).toBeGreaterThan(0);
    expect(results.claims[0].text).toContain('mpox');

    expect(results.research.length).toBeGreaterThan(0);
    expect(results.research[0].sources.length).toBeGreaterThan(0);

    expect(results.verdicts.length).toBeGreaterThan(0);
    expect(results.verdicts[0].groq.verdict).toBe('supported');
    expect(results.verdicts[0].gemini.verdict).toBe('supported');
    expect(results.verdicts[0].final.verdict).toBe('supported');
  });
});
