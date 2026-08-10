/**
 * Baatmeedar — Stage 4 Verification Service
 *
 * Runs isolated, independent verifications using Grok/xAI and Gemini.
 * Neither verifier sees the other's verdict, confidence, or reasoning.
 * Both receive the same approved evidence packet, constructed locally.
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

    // Run both verifiers in parallel — neither sees the other's result
    const [grokVerdict, geminiVerdict] = await Promise.all([
      this.xai.verify(claim, evidencePacketForXAI),
      this.gemini.verify(claim, evidencePacketForGemini),
    ]);

    return {
      claim_id: claim.id,
      grok: {
        ...grokVerdict,
        verifier: 'grok',
      },
      gemini: {
        ...geminiVerdict,
        verifier: 'gemini',
      },
    };
  }
}
