import { describe, it, expect } from 'vitest';
import { ResearchService } from '../../src/services/researchService.js';
import { FakeGeminiAdapter } from '../../src/adapters/fakes/fakeGeminiAdapter.js';
import { FakeGroqAdapter } from '../../src/adapters/fakes/fakeGroqAdapter.js';
import { FakeTavilyAdapter } from '../../src/adapters/fakes/fakeTavilyAdapter.js';

describe('Stage 3 — Claim-by-Claim Evidence Research', () => {
  const fakeGemini = new FakeGeminiAdapter();
  const fakeGroq = new FakeGroqAdapter();
  const fakeTavily = new FakeTavilyAdapter();

  const researchService = new ResearchService({
    gemini: fakeGemini,
    groq: fakeGroq,
    tavily: fakeTavily,
  });

  const sampleClaim = {
    id: 'clm-001',
    text: 'India won the cricket match yesterday.',
    domain: 'Sports',
  };

  it('3.1 Processes single claim with Hermes plan, Tavily search, Groq, and Gemini', async () => {
    const researchData = await researchService.researchClaim(sampleClaim);

    expect(researchData.claim_id).toBe(sampleClaim.id);
    expect(researchData.hermes_plan).toBeDefined();
    expect(researchData.hermes_plan.tavily_queries).toBeDefined();
    expect(researchData.sources.length).toBeGreaterThan(0);
    expect(researchData.sources[0].url).toBeTruthy();
    expect(researchData.groq_analysis).toBeTruthy();
    expect(researchData.gemini_analysis).toBeTruthy();
  });

  it('3.2 Maintains independent claim-to-evidence mapping for multiple claims', async () => {
    const claim1 = { id: 'clm-001', text: 'India won the cricket match.', domain: 'Sports' };
    const claim2 = { id: 'clm-002', text: 'NASA launched Artemis II on Monday.', domain: 'Science' };

    const r1 = await researchService.researchClaim(claim1);
    const r2 = await researchService.researchClaim(claim2);

    expect(r1.claim_id).toBe('clm-001');
    expect(r2.claim_id).toBe('clm-002');
    expect(r1.sources[0].id).toBeDefined();
    expect(r2.sources[0].id).toBeDefined();
  });

  it('3.3 Throws terminal error when Tavily search returns 0 sources', async () => {
    const emptyTavily = {
      async search() {
        return [];
      },
    };
    const emptySvc = new ResearchService({ gemini: fakeGemini, groq: fakeGroq, tavily: emptyTavily });
    await expect(emptySvc.researchClaim(sampleClaim)).rejects.toThrow(/no usable sources/i);
  });

  it('3.4 Fails safely when Tavily API fails', async () => {
    const failingTavily = {
      async search() {
        throw new Error('Tavily API request failed with status 500');
      },
    };
    const failingSvc = new ResearchService({ gemini: fakeGemini, groq: fakeGroq, tavily: failingTavily });
    await expect(failingSvc.researchClaim(sampleClaim)).rejects.toThrow('Tavily API request failed');
  });

  it('3.5 Fails safely when Groq API fails', async () => {
    const failingGroq = {
      async analyze() {
        throw new Error('Groq rate limit exceeded');
      },
    };
    const failingSvc = new ResearchService({ gemini: fakeGemini, groq: failingGroq, tavily: fakeTavily });
    await expect(failingSvc.researchClaim(sampleClaim)).rejects.toThrow('Groq rate limit exceeded');
  });
});
