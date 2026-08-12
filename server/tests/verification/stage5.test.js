import { describe, it, expect } from 'vitest';
import { SynthesisService } from '../../src/services/synthesisService.js';

describe('Stage 5 — Final Result Generation & Lineage Preservation', () => {
  const synthesisService = new SynthesisService();

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
      },
    ],
  };

  it('5.1 Synthesizes supported verdict when both evaluators agree on support', async () => {
    const verifiers = {
      grok: { verdict: 'supported', evidence_ids: ['src-001'], verifier: 'grok' },
      gemini: { verdict: 'supported', evidence_ids: ['src-001'], verifier: 'gemini' },
    };

    const res = await synthesisService.synthesizeVerdict(claim, researchData, verifiers);

    expect(res.claim_id).toBe(claim.id);
    expect(res.final.verdict).toBe('supported');
    expect(res.final.sources_cited).toContain('src-001');
    expect(res.final.rationale).toBeTruthy();
  });

  it('5.2 Synthesizes contradicted verdict when both evaluators confirm contradiction', async () => {
    const verifiers = {
      grok: { verdict: 'contradicted', evidence_ids: ['src-001'], verifier: 'grok' },
      gemini: { verdict: 'contradicted', evidence_ids: ['src-001'], verifier: 'gemini' },
    };

    const res = await synthesisService.synthesizeVerdict(claim, researchData, verifiers);

    expect(res.final.verdict).toBe('contradicted');
    expect(res.final.sources_cited).toContain('src-001');
  });

  it('5.3 Returns inconclusive verdict when evaluators disagree', async () => {
    const verifiers = {
      grok: { verdict: 'supported', evidence_ids: ['src-001'], verifier: 'grok' },
      gemini: { verdict: 'contradicted', evidence_ids: ['src-001'], verifier: 'gemini' },
    };

    const res = await synthesisService.synthesizeVerdict(claim, researchData, verifiers);

    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toMatch(/disagreement/i);
  });

  it('5.4 Blocks synthesis if required verifier result is missing or uncited', async () => {
    const incompleteVerifiers = {
      grok: { verdict: 'supported', evidence_ids: [], verifier: 'grok' }, // no valid source cited
      gemini: { verdict: 'supported', evidence_ids: ['src-001'], verifier: 'gemini' },
    };

    await expect(
      synthesisService.synthesizeVerdict(claim, researchData, incompleteVerifiers)
    ).rejects.toThrow(/without valid evidence/i);
  });
});
