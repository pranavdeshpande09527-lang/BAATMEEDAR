/**
 * Baatmeedar — Stage 5 Editorial Synthesis Service
 *
 * Synthesizes final verdict from evidence packet and independent verifiers.
 * Must yield exactly one of 'supported', 'contradicted', or 'inconclusive'.
 * Never a simple vote; grounded strictly in evidence strength.
 */

import { getLogger } from '../logging/logger.js';

export class SynthesisService {
  async synthesizeVerdict(claim, researchData, verifierResults) {
    getLogger().info({ claim_id: claim.id }, 'Synthesizing Stage 5 editorial result');

    const grok = verifierResults.groq || verifierResults.grok || {};
    const gemini = verifierResults.gemini || {};
    const sources = researchData.sources || [];
    const sourceIds = sources.map((s) => s.id).filter(Boolean);

    if (sourceIds.length === 0) {
      throw new Error(`Stage 5 synthesis blocked: no research evidence for claim ${claim.id}`);
    }
    if (!grok.verdict || !gemini.verdict) {
      throw new Error(`Stage 5 synthesis blocked: required verifier result is missing for claim ${claim.id}`);
    }

    const validSourceIds = new Set(sourceIds);
    const citedSourceIds = [...new Set([
      ...(grok.evidence_ids || []),
      ...(gemini.evidence_ids || []),
    ].filter((id) => validSourceIds.has(id)))];

    for (const verifier of [grok, gemini]) {
      if (['supported', 'contradicted'].includes(verifier.verdict)
        && !(verifier.evidence_ids || []).some((id) => validSourceIds.has(id))) {
        throw new Error(`Stage 5 synthesis blocked: ${verifier.verifier || 'verifier'} returned ${verifier.verdict} without valid evidence for claim ${claim.id}`);
      }
    }

    let finalVerdict = 'inconclusive';
    let rationale = '';

    if (grok.verdict === 'supported' && gemini.verdict === 'supported') {
      finalVerdict = 'supported';
      rationale = 'Both independent AI evaluators confirm strong evidence support from primary sources.';
    } else if (grok.verdict === 'contradicted' && gemini.verdict === 'contradicted') {
      finalVerdict = 'contradicted';
      rationale = 'Both independent AI evaluators confirm direct conflict with authoritative sources.';
    } else if (grok.verdict && grok.verdict === gemini.verdict) {
      finalVerdict = grok.verdict;
      rationale = `Independent verifiers reached convergent consensus: ${finalVerdict}.`;
    } else {
      finalVerdict = 'inconclusive';
      const verifierLabel = grok.verifier === 'groq' ? 'Groq' : 'Grok';
      rationale = `Evaluator disagreement between ${verifierLabel} (${grok.verdict || 'unknown'}) and Gemini (${gemini.verdict || 'unknown'}). Available evidence is insufficient to settle the claim conclusively.`;
    }

    const verifierLimitations = grok.limitations || gemini.limitations
      || 'Verdicts reflect retrieved web evidence currency at time of search.';
    const limitations = finalVerdict === 'inconclusive'
      ? `Degraded result: verification is inconclusive. ${verifierLimitations}`
      : verifierLimitations;

    return {
      claim_id: claim.id,
      final: {
        verdict: finalVerdict,
        rationale,
        sources_cited: citedSourceIds,
        limitations,
      },
    };
  }
}
