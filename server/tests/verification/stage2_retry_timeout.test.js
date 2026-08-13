import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from '../../src/utils/retryWithBackoff.js';
import { DeadlineExceededError, RetryExhaustedError } from '../../src/utils/retryErrors.js';
import { Orchestrator } from '../../src/services/orchestrator.js';
import { FakeGeminiAdapter } from '../../src/adapters/fakes/fakeGeminiAdapter.js';

describe('Stage 2 — Gemini Retries, Rate Limit & Deadline Protection', () => {

  it('1. Throws DeadlineExceededError immediately if provider retry delay (60s) exceeds remaining deadline (30s)', async () => {
    const error429 = new Error('Resource has been exhausted (e.g. check quota)');
    error429.status = 429;
    error429.details = [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '60s' }];

    const startTime = Date.now();
    await expect(
      retryWithBackoff(
        async () => { throw error429; },
        { provider: 'gemini', maxRetries: 2, deadlineMs: 30000 }
      )
    ).rejects.toThrow(DeadlineExceededError);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(1000); // Must fail fast (< 1s) instead of sleeping 60 seconds
  });

  it('2. Persists status: failed with safe failure reason when Gemini claim extraction times out', async () => {
    const error429 = new Error('Resource has been exhausted');
    error429.status = 429;
    error429.details = [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '60s' }];

    const failingGemini = {
      async extractClaims() {
        return retryWithBackoff(
          async () => { throw error429; },
          { provider: 'gemini', maxRetries: 2, deadlineMs: 30000 }
        );
      },
    };

    let savedStatus = null;
    const mockRepo = {
      create: vi.fn(),
      saveClaims: vi.fn(),
      saveResearch: vi.fn(),
      saveVerifierResult: vi.fn(),
      saveFinalResult: vi.fn(),
      updateStage: vi.fn(async (runId, stage, status, partial, failure) => {
        savedStatus = { stage, status, failure };
      }),
    };

    const orchestrator = new Orchestrator({ gemini: failingGemini }, mockRepo);
    await orchestrator.startRun('run-timeout-test', { input_type: 'text', content: 'modi is pm of india' });

    expect(savedStatus).not.toBeNull();
    expect(savedStatus.status).toBe('failed');
    expect(savedStatus.stage).toBe('extracting_claims');
    expect(savedStatus.failure).toBeDefined();
    expect(savedStatus.failure.code).toBe('provider_deadline_exceeded');
    expect(savedStatus.failure.message).toContain('Processing timed out waiting for AI provider response');
  });

  it('3. Successfully extracts claims and advances stage for valid statement', async () => {
    const fakeGemini = new FakeGeminiAdapter();
    const fakeGroq = {
      async analyze() { return { analysis: 'Groq analysis', missing_context: [], counterevidence: [] }; },
      async verify() { return { verifier: 'groq', verdict: 'supported', confidence: 90, reasoning: 'Groq reasoning', evidence_ids: ['src-001'], limitations: '' }; },
    };
    const fakeTavily = {
      async search() { return [{ url: 'https://example.com', title: 'Example', snippet: 'Evidence snippet', publisher: 'Example' }]; },
    };

    let publishedStages = [];
    const mockRepo = {
      create: vi.fn(),
      saveClaims: vi.fn(),
      saveResearch: vi.fn(),
      saveVerifierResult: vi.fn(),
      saveFinalResult: vi.fn(),
      updateStage: vi.fn(async (runId, stage, status) => {
        publishedStages.push(stage);
      }),
    };

    const orchestrator = new Orchestrator({ gemini: fakeGemini, groq: fakeGroq, tavily: fakeTavily }, mockRepo);
    await orchestrator.startRun('run-success-test', { input_type: 'text', content: 'Narendra Modi is the Prime Minister of India.' });

    expect(publishedStages).toContain('input_received');
    expect(publishedStages).toContain('extracting_claims');
    expect(publishedStages).toContain('researching');
    expect(publishedStages).toContain('complete');
  });
});
