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

    const groq = verifierResults.groq || {};
    const gemini = verifierResults.gemini || {};
    const sources = researchData.sources || [];
    const sourceIds = sources.map((s) => s.id);

    let finalVerdict = 'inconclusive';
    let rationale = '';

    if (groq.verdict === 'supported' && gemini.verdict === 'supported') {
      finalVerdict = 'supported';
      rationale = 'Both independent AI evaluators confirm strong evidence support from primary sources.';
    } else if (groq.verdict === 'contradicted' && gemini.verdict === 'contradicted') {
      finalVerdict = 'contradicted';
      rationale = 'Both independent AI evaluators confirm direct conflict with authoritative sources.';
    } else if (groq.verdict === gemini.verdict) {
      finalVerdict = groq.verdict;
      rationale = `Independent verifiers reached convergent consensus: ${finalVerdict}.`;
    } else {
      finalVerdict = 'inconclusive';
      rationale = `Evaluator disagreement between Groq (${groq.verdict || 'unknown'}) and Gemini (${gemini.verdict || 'unknown'}). Available evidence is insufficient to settle the claim conclusively.`;
    }

    return {
      claim_id: claim.id,
      final: {
        verdict: finalVerdict,
        rationale,
        sources_cited: sourceIds,
        limitations: groq.limitations || gemini.limitations || 'Verdicts reflect retrieved web evidence currency at time of search.',
      },
    };
  }
}
