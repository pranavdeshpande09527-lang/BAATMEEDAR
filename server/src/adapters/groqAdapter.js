/**
 * Baatmeedar — Groq Adapter
 *
 * Wraps groq-sdk for:
 * 1. Stage 3 supporting analysis (`analyze`)
 * 2. Stage 4 independent verification (`verify`) — fallback or secondary verifier.
 *
 * Enforces structured output validation and standardized prompt trust boundaries.
 */

import Groq from 'groq-sdk';
import { validateModelOutput, AnalysisOutputSchema, VerifierOutputSchema } from '../schemas/modelOutput.js';
import { buildGroqAnalysisPrompt, buildVerifierPrompt, PROMPT_VERSIONS } from '../schemas/promptTemplates.js';
import { getLogger } from '../logging/logger.js';
import { retryWithBackoff } from '../utils/retryWithBackoff.js';

export class GroqAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.groq = new Groq({ apiKey });
    this.modelName = 'llama-3.3-70b-versatile';
  }

  /**
   * Stage 3: Groq supporting analysis
   */
  async analyze(claim, sources) {
    const startTime = Date.now();
    const prompt = buildGroqAnalysisPrompt(claim, sources);

    try {
      const response = await retryWithBackoff(
        () =>
          this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: this.modelName,
            response_format: { type: 'json_object' },
          }),
        { provider: 'groq' }
      );

      const rawJson = JSON.parse(response.choices[0]?.message?.content || '{}');
      const validated = validateModelOutput(AnalysisOutputSchema, rawJson, 'Groq Stage 3 analysis');

      getLogger().info({
        provider: 'groq',
        stage: 'stage_3_analysis',
        promptVersion: PROMPT_VERSIONS.STAGE_3_GROQ_ANALYSIS,
        claimId: claim.id,
        latencyMs: Date.now() - startTime,
      }, 'Groq Stage 3 analysis completed');

      return validated;
    } catch (err) {
      getLogger().error({
        provider: 'groq',
        stage: 'stage_3_analysis',
        claimId: claim.id,
        latencyMs: Date.now() - startTime,
        err: err.message,
      }, 'Groq Stage 3 analysis failed');
      throw err;
    }
  }

  /**
   * Stage 4: Groq independent verification
   */
  async verify(claim, evidencePacket) {
    const startTime = Date.now();
    const prompt = buildVerifierPrompt('Groq', claim, evidencePacket);

    try {
      const response = await retryWithBackoff(
        () =>
          this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: this.modelName,
            response_format: { type: 'json_object' },
          }),
        { provider: 'groq' }
      );

      const rawJson = JSON.parse(response.choices[0]?.message?.content || '{}');
      const validated = validateModelOutput(VerifierOutputSchema, rawJson, 'Groq Stage 4 verification');

      getLogger().info({
        provider: 'groq',
        stage: 'stage_4_verification',
        promptVersion: PROMPT_VERSIONS.STAGE_4_VERIFIER,
        claimId: claim.id,
        verdict: validated.verdict,
        latencyMs: Date.now() - startTime,
      }, 'Groq Stage 4 verification completed');

      return validated;
    } catch (err) {
      getLogger().error({
        provider: 'groq',
        stage: 'stage_4_verification',
        claimId: claim.id,
        latencyMs: Date.now() - startTime,
        err: err.message,
      }, 'Groq Stage 4 verification failed');
      throw err;
    }
  }
}
