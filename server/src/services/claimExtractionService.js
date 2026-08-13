/**
 * Baatmeedar — Stage 2 Claim Extraction Service
 *
 * Uses Gemini to remove non-verifiable opinions and extract atomic claims.
 */

import { getLogger } from '../logging/logger.js';

export class ClaimExtractionService {
  /**
   * @param {object} adapters
   * @param {object} adapters.gemini
   */
  constructor(adapters) {
    this.gemini = adapters.gemini;
  }

  async extractClaims(rawText, runId = null) {
    getLogger().info('Extracting claims with Gemini');
    const result = await this.gemini.extractClaims(rawText);
    const prefix = runId ? `${runId.slice(0, 8)}-` : '';
    return {
      claims: result.claims.map((c, i) => ({
        id: `${prefix}clm-${String(i + 1).padStart(3, '0')}`,
        text: c.text,
        domain: c.domain || 'General',
        context: c.context || '',
        entities: c.entities || [],
        temporal: c.temporal || 'unspecified',
      })),
      removed_opinions: result.removed_opinions || [],
    };
  }
}
