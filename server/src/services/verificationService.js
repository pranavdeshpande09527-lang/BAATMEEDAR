/**
 * Baatmeedar — Stage 4 Verification Service
 *
 * Runs isolated, independent verifications using Grok/xAI and Gemini.
 * Neither verifier sees the other's verdict, confidence, or reasoning.
 * Both receive the same approved evidence packet, constructed locally.
 *
 * Both verifiers are required. A provider failure is a failed verification,
 * not a usable inconclusive verdict.
 */

import { getLogger } from '../logging/logger.js';

export class VerificationService {
  /**
   * @param {object} adapters
   * @param {object} adapters.xai  — primary verifier (Grok/xAI, fallback to Groq)
   * @param {object} adapters.gemini — secondary verifier
   */
  constructor(adapters) {
    // xai is the primary Stage 4 verifier (Grok/xAI with Groq fallback)
    // gemini is the secondary Stage 4 verifier
    // groq is NOT used for Stage 4 directly (it's a Stage 3 analyzer)
    this.xai = adapters.xai || adapters.groq;  // fallback for test environments
    this.gemini = adapters.gemini;
  }

  async verifyClaim(claim, researchData) {
    getLogger().info({ claim_id: claim.id }, 'Executing Stage 4 independent verification');

    if (!Array.isArray(researchData.sources) || researchData.sources.length === 0) {
      throw new Error(`Stage 4 verification blocked: no research evidence for claim ${claim.id}`);
    }

    // Construct the same evidence packet for both verifiers
    // Neither verifier is passed the other's state
    const evidencePacket = {
      claim: claim.text,
      domain: claim.domain,
      sources: researchData.sources || [],
    };

    // Build two independent evidence packet copies to prevent any cross-contamination
    const evidencePacketForXAI = { ...evidencePacket, sources: [...(researchData.sources || [])] };
    const evidencePacketForGemini = { ...evidencePacket, sources: [...(researchData.sources || [])] };

    // Run both verifiers in parallel — neither sees the other's result.
    // allSettled is used only to capture both errors before failing the stage.
    const [grokSettled, geminiSettled] = await Promise.allSettled([
      this.xai.verify(claim, evidencePacketForXAI),
      this.gemini.verify(claim, evidencePacketForGemini),
    ]);

    if (grokSettled.status === 'rejected') {
      getLogger().error(
        { claim_id: claim.id, err: grokSettled.reason?.message },
        'Grok/xAI Stage 4 verifier failed'
      );
    }
    if (geminiSettled.status === 'rejected') {
      getLogger().error(
        { claim_id: claim.id, err: geminiSettled.reason?.message },
        'Gemini Stage 4 verifier failed'
      );
    }

    const failures = [
      grokSettled.status === 'rejected' ? `Grok/xAI: ${grokSettled.reason?.message || 'unknown provider error'}` : null,
      geminiSettled.status === 'rejected' ? `Gemini: ${geminiSettled.reason?.message || 'unknown provider error'}` : null,
    ].filter(Boolean);
    if (failures.length) {
      throw new Error(`Stage 4 verification failed for claim ${claim.id}: ${failures.join('; ')}`);
    }

    return {
      claim_id: claim.id,
      grok: {
        ...grokSettled.value,
        verifier: 'grok',
      },
      gemini: {
        ...geminiSettled.value,
        verifier: 'gemini',
      },
    };
  }
}
