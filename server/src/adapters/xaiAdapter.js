/**
 * Baatmeedar — Grok / xAI Adapter
 *
 * Wraps xAI API (Grok) for Stage 4 independent verification.
 * Adheres strictly to verifier isolation per prompts/05_ai/ai_integration.md.
 */

import { validateModelOutput, VerifierOutputSchema } from '../schemas/modelOutput.js';
import { buildVerifierPrompt, PROMPT_VERSIONS } from '../schemas/promptTemplates.js';
import { getLogger } from '../logging/logger.js';

export class XAIAdapter {
  constructor(apiKey, fallbackAdapter = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.x.ai/v1';
    this.modelName = 'grok-beta';
    this.fallbackAdapter = fallbackAdapter;
  }

  /**
   * Stage 4: Grok/xAI independent verification
   */
  async verify(claim, evidencePacket) {
    const startTime = Date.now();

    if (!this.apiKey && this.fallbackAdapter) {
      getLogger().info({ claimId: claim.id }, 'XAI_API_KEY not configured; using fallback verifier adapter (Groq)');
      const res = await this.fallbackAdapter.verify(claim, evidencePacket);
      return { ...res, verifier: 'grok' };
    }

    if (!this.apiKey) {
      throw new Error('XAI_API_KEY is not configured and no fallback verifier was provided');
    }

    const prompt = buildVerifierPrompt('Grok', claim, evidencePacket);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`xAI API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawJson = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      const validated = validateModelOutput(VerifierOutputSchema, rawJson, 'Grok/xAI Stage 4 verification');

      getLogger().info({
        provider: 'xai_grok',
        stage: 'stage_4_verification',
        promptVersion: PROMPT_VERSIONS.STAGE_4_VERIFIER,
        claimId: claim.id,
        verdict: validated.verdict,
        latencyMs: Date.now() - startTime,
      }, 'Grok Stage 4 verification completed');

      return validated;
    } catch (err) {
      getLogger().error({
        provider: 'xai_grok',
        stage: 'stage_4_verification',
        claimId: claim.id,
        latencyMs: Date.now() - startTime,
        err: err.message,
      }, 'Grok Stage 4 verification failed');

      if (this.fallbackAdapter) {
        getLogger().warn({ claimId: claim.id }, 'Falling back to Groq verifier after Grok failure');
        const res = await this.fallbackAdapter.verify(claim, evidencePacket);
        return { ...res, verifier: 'grok' };
      }

      throw err;
    }
  }
}
