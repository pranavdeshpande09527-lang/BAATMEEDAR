/**
 * Baatmeedar — Stage 4 Verification Service
 *
 * Runs isolated, independent verifications using Groq and Gemini.
 * Groq and Gemini each evaluate claim against evidence packet separately.
 * Neither verifier sees the other's verdict.
 */

import { getLogger } from '../logging/logger.js';

export class VerificationService {
  /**
   * @param {object} adapters
   * @param {object} adapters.groq
   * @param {object} adapters.gemini
   */
  constructor(adapters) {
    this.groq = adapters.groq;
    this.gemini = adapters.gemini;
  }

  async verifyClaim(claim, researchData) {
    getLogger().info({ claim_id: claim.id }, 'Executing Stage 4 independent verification');

    const evidencePacket = {
      claim: claim.text,
      sources: researchData.sources || [],
    };

    // Run Groq and Gemini in parallel for isolated evaluation
    const [groqVerdict, geminiVerdict] = await Promise.all([
      this.groq.verify(claim, evidencePacket),
      this.gemini.verify(claim, evidencePacket),
    ]);

    return {
      claim_id: claim.id,
      groq: {
        ...groqVerdict,
        verifier: 'groq',
      },
      gemini: {
        ...geminiVerdict,
        verifier: 'gemini',
      },
    };
  }
}
