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

  it('yields supported when both Groq and Gemini return supported', async () => {
    const verifierResults = {
      groq: makeVerifierResult('groq', 'supported'),
      gemini: makeVerifierResult('gemini', 'supported'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.claim_id).toBe(claim.id);
    expect(res.final.verdict).toBe('supported');
    expect(res.final.rationale).toContain('Both independent AI evaluators confirm strong evidence support');
    expect(res.final.sources_cited).toEqual(['src-001', 'src-002']);
  });

  it('yields contradicted when both Groq and Gemini return contradicted', async () => {
    const verifierResults = {
      groq: makeVerifierResult('groq', 'contradicted'),
      gemini: makeVerifierResult('gemini', 'contradicted'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('contradicted');
    expect(res.final.rationale).toContain('Both independent AI evaluators confirm direct conflict');
  });

  it('yields inconclusive when Groq and Gemini disagree (supported vs contradicted)', async () => {
    const verifierResults = {
      groq: makeVerifierResult('groq', 'supported'),
      gemini: makeVerifierResult('gemini', 'contradicted'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toContain('Evaluator disagreement between Groq (supported) and Gemini (contradicted)');
  });

  it('yields inconclusive when Groq and Gemini disagree (contradicted vs inconclusive)', async () => {
    const verifierResults = {
      groq: makeVerifierResult('groq', 'contradicted'),
      gemini: makeVerifierResult('gemini', 'inconclusive'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toContain('Evaluator disagreement');
  });

  it('yields inconclusive when both verifiers return inconclusive', async () => {
    const verifierResults = {
      groq: makeVerifierResult('groq', 'inconclusive'),
      gemini: makeVerifierResult('gemini', 'inconclusive'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResults);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toContain('convergent consensus: inconclusive');
  });

  it('handles missing or undefined verifier results without throwing', async () => {
    const verifierResultsPartial = {
      groq: makeVerifierResult('groq', 'supported'),
    };

    const res = await synthesizer.synthesizeVerdict(claim, researchData, verifierResultsPartial);
    expect(res.final.verdict).toBe('inconclusive');
    expect(res.final.rationale).toBeDefined();

    const resEmpty = await synthesizer.synthesizeVerdict(claim, researchData, {});
    expect(resEmpty.final.verdict).toBe('inconclusive');
  });
});
