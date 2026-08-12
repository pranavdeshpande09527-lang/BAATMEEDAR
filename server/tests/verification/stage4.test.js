import { describe, it, expect } from 'vitest';
import { VerificationService } from '../../src/services/verificationService.js';
import { FakeGeminiAdapter } from '../../src/adapters/fakes/fakeGeminiAdapter.js';
import { FakeGroqAdapter } from '../../src/adapters/fakes/fakeGroqAdapter.js';
import { FakeXAIAdapter } from '../../src/adapters/fakes/fakeXAIAdapter.js';

describe('Stage 4 — Stage 2 vs Stage 3 Verification', () => {
  const fakeGemini = new FakeGeminiAdapter();
  const fakeXAI = new FakeXAIAdapter();

  const verifierService = new VerificationService({
    xai: fakeXAI,
    gemini: fakeGemini,
  });

  const claim = {
    id: 'clm-001',
    text: 'India won the cricket match yesterday.',
    domain: 'Sports',
  };

  const researchData = {
    claim_id: 'clm-001',
    sources: [
      {
        id: 'src-001',
        url: 'https://reuters.com/sports/india-match',
        title: 'India wins cricket match',
        publisher: 'Reuters',
        excerpt: 'India defeated rival team in yesterday match.',
        stance: 'supporting',
      },
    ],
  };

  it('4.1 Executes dual independent verification (Grok and Gemini)', async () => {
    const result = await verifierService.verifyClaim(claim, researchData);

    expect(result.claim_id).toBe(claim.id);
    expect(result.grok).toBeDefined();
    expect(result.gemini).toBeDefined();
    expect(result.grok.verdict).toBeTruthy();
    expect(result.gemini.verdict).toBeTruthy();
    expect(result.grok.reasoning).toBeTruthy();
    expect(result.gemini.reasoning).toBeTruthy();
  });

  it('4.2 Blocks verification when research data contains no sources', async () => {
    const emptyResearch = { claim_id: 'clm-001', sources: [] };
    await expect(verifierService.verifyClaim(claim, emptyResearch)).rejects.toThrow(
      /no research evidence/i
    );
  });

  it('4.3 Fails Stage 4 when one of the verifier APIs fails', async () => {
    const failingXAI = {
      async verify() {
        throw new Error('xAI connection refused');
      },
    };
    const svc = new VerificationService({ xai: failingXAI, gemini: fakeGemini });
    await expect(svc.verifyClaim(claim, researchData)).rejects.toThrow(/Stage 4 verification failed/i);
  });

  it('4.4 Enforces verifier isolation — verifiers receive independent copies of evidence packet', async () => {
    let capturedPacketXAI = null;
    let capturedPacketGemini = null;

    const spyXAI = {
      async verify(c, packet) {
        capturedPacketXAI = packet;
        return { verdict: 'supported', confidence: 90, reasoning: 'XAI ok', evidence_ids: ['src-001'] };
      },
    };
    const spyGemini = {
      async verify(c, packet) {
        capturedPacketGemini = packet;
        return { verdict: 'supported', confidence: 92, reasoning: 'Gemini ok', evidence_ids: ['src-001'] };
      },
    };

    const isolatedSvc = new VerificationService({ xai: spyXAI, gemini: spyGemini });
    await isolatedSvc.verifyClaim(claim, researchData);

    expect(capturedPacketXAI).not.toBe(capturedPacketGemini); // Distinct object reference
    expect(capturedPacketXAI).toEqual(capturedPacketGemini);   // Same data structure
  });
});
