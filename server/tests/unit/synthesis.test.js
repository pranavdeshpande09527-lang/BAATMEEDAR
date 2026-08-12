import { describe, it, expect } from 'vitest';
import { SynthesisService } from '../../src/services/synthesisService.js';
import { makeClaim, makeSource, makeVerifierResult } from '../fixtures/fixtures.js';

describe('Layer 1: Stage 5 Synthesis Service Unit Tests', () => {
  const synthesizer = new SynthesisService();
  const claim = makeClaim();
  const source1 = makeSource({ id: 'src-001' });
  const source2 = makeSource({ id: 'src-002', url: 'https://example.com/source2' });

  const researchData = {
    claim_id: claim.id,
    sources: [source1, source2],
  };

  it('yields supported when both Grok and Gemini return supported', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'supported'),
      gemini: makeVerifierResult('gemini', 'supported'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.claim_id).toBe(claim.id);
    expect(res.final.verdict).toBe('supported');
    expect(res.final.rationale).toContain('Both independent AI evaluators confirm strong evidence support');
    expect(res.final.sources_cited).toEqual(['src-001']);
  });

  it('yields contradicted when both Grok and Gemini return contradicted', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'contradicted'),
      gemini: makeVerifierResult('gemini', 'contradicted'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('contradicted');
    expect(res.final.rationale).toContain('Both independent AI evaluators confirm direct conflict');
  });

  it('yields inconclusive when Grok and Gemini disagree (supported vs contradicted)', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'supported'),
      gemini: makeVerifierResult('gemini', 'contradicted'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toContain('Evaluator disagreement between Grok (supported) and Gemini (contradicted)');
    expect(res.final.limitations).toContain('Degraded result: verification is inconclusive.');
  });

  it('yields inconclusive when Grok and Gemini disagree (contradicted vs inconclusive)', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'contradicted'),
      gemini: makeVerifierResult('gemini', 'inconclusive'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.limitations).toContain('Degraded result: verification is inconclusive.');
    expect(res.final.rationale).toContain('Evaluator disagreement');
  });

  it('yields inconclusive when both verifiers return inconclusive', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'inconclusive'),
      gemini: makeVerifierResult('gemini', 'inconclusive'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    // Both inconclusive → divergent path (not 'convergent consensus') since inconclusive !== inconclusive
    // check for Evaluator disagreement message OR inconclusive
    expect(['inconclusive']).toContain(res.final.verdict);
  });

  it('blocks synthesis when a required verifier result is missing', async () => {
    const verifierResultsPartial = {
      grok: makeVerifierResult('grok', 'supported'),
    };

    await expect(synthesizer.synthesizeVerdict(claim, researchData, verifierResultsPartial))
      .rejects.toThrow('required verifier result is missing');
    await expect(synthesizer.synthesizeVerdict(claim, researchData, {}))
      .rejects.toThrow('required verifier result is missing');
  });

  it('blocks synthesis with no retrieved evidence', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'inconclusive', { evidence_ids: [] }),
      gemini: makeVerifierResult('gemini', 'inconclusive', { evidence_ids: [] }),
    };

    await expect(synthesizer.synthesizeVerdict(claim, { sources: [] }, verifierResults))
      .rejects.toThrow('no research evidence');
  });

  it('blocks a confident verdict that cites no retrieved evidence', async () => {
    const verifierResults = {
      grok: makeVerifierResult('grok', 'supported', { evidence_ids: ['src-unknown'] }),
      gemini: makeVerifierResult('gemini', 'supported', { evidence_ids: ['src-unknown'] }),
    };

    await expect(synthesizer.synthesizeVerdict(claim, researchData, verifierResults))
      .rejects.toThrow('without valid evidence');
  });
});
