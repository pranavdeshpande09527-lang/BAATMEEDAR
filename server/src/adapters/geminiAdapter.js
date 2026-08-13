/**
 * Baatmeedar — Gemini Adapter
 *
 * Wraps @google/generative-ai SDK for:
 * 1. Stage 2 claim extraction
 * 2. Stage 3 supporting analysis / Hermes research planning
 * 3. Stage 4 independent verification
 *
 * Enforces structured outputs and validates responses against Zod schemas.
 * Implements telemetry logging and standardized prompt trust boundaries.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  validateModelOutput,
  ClaimExtractionOutputSchema,
  ResearchPlanOutputSchema,
  AnalysisOutputSchema,
  VerifierOutputSchema,
} from '../schemas/modelOutput.js';
import {
  buildClaimExtractionPrompt,
  buildHermesPlanPrompt,
  buildGeminiAnalysisPrompt,
  buildVerifierPrompt,
  PROMPT_VERSIONS,
} from '../schemas/promptTemplates.js';
import { getLogger } from '../logging/logger.js';
import { retryWithBackoff } from '../utils/retryWithBackoff.js';

export class GeminiAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  }

  /**
   * Extract the HTTP status code embedded in a Google GenAI SDK error.
   * The SDK surfaces it as err.status (number) or buries it in err.message
   * as "[400 Bad Request]" or similar. Returns null if not determinable.
   * @param {Error} err
   * @returns {number | null}
   */
  _extractHttpStatus(err) {
    if (err?.status && typeof err.status === 'number') return err.status;
    if (err?.statusCode && typeof err.statusCode === 'number') return err.statusCode;
    const match = typeof err?.message === 'string' && err.message.match(/\b(400|401|403|404|429|500|503)\b/);
    return match ? Number(match[0]) : null;
  }

  /**
   * Stage 2: Extract atomic factual claims from raw input text.
   */
  async extractClaims(inputText) {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = buildClaimExtractionPrompt(inputText);

    try {
      const response = await retryWithBackoff(
        () => model.generateContent(prompt),
        { provider: 'gemini', maxRetries: 2, deadlineMs: 30000 }
      );
      const text = response.response.text();
      const rawJson = JSON.parse(text);
      const validated = validateModelOutput(
        ClaimExtractionOutputSchema,
        rawJson,
        'Gemini claim extraction'
      );

      getLogger().info(
        {
          provider: 'gemini',
          stage: 'stage_2_extraction',
          promptVersion: PROMPT_VERSIONS.STAGE_2_EXTRACTION,
          latencyMs: Date.now() - startTime,
          claimsExtracted: validated.claims.length,
        },
        'Gemini claim extraction completed'
      );

      return validated;
    } catch (err) {
      getLogger().error(
        {
          provider: 'gemini',
          stage: 'stage_2_extraction',
          latencyMs: Date.now() - startTime,
          providerHttpStatus: this._extractHttpStatus(err),
          err: err.message,
        },
        'Gemini claim extraction failed'
      );
      throw err;
    }
  }

  /**
   * Stage 3: Hermes Research Plan creation using Gemini
   */
  async planResearch(claim) {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = buildHermesPlanPrompt(claim);

    try {
      const response = await retryWithBackoff(
        () => model.generateContent(prompt),
        { provider: 'gemini' }
      );
      const rawJson = JSON.parse(response.response.text());
      const validated = validateModelOutput(
        ResearchPlanOutputSchema,
        rawJson,
        'Hermes research plan'
      );

      getLogger().info(
        {
          provider: 'gemini_hermes',
          stage: 'stage_3_planning',
          promptVersion: PROMPT_VERSIONS.STAGE_3_HERMES_PLAN,
          claimId: claim.id,
          latencyMs: Date.now() - startTime,
        },
        'Hermes research plan created'
      );

      return validated;
    } catch (err) {
      getLogger().error(
        {
          provider: 'gemini_hermes',
          stage: 'stage_3_planning',
          claimId: claim.id,
          latencyMs: Date.now() - startTime,
          providerHttpStatus: this._extractHttpStatus(err),
          err: err.message,
        },
        'Gemini Hermes research planning failed'
      );
      throw err;
    }
  }

  /**
   * Stage 3: Gemini supporting analysis
   */
  async analyzeEvidence(claim, sources) {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = buildGeminiAnalysisPrompt(claim, sources);

    try {
      const response = await retryWithBackoff(
        () => model.generateContent(prompt),
        { provider: 'gemini' }
      );
      const rawJson = JSON.parse(response.response.text());
      const validated = validateModelOutput(
        AnalysisOutputSchema,
        rawJson,
        'Gemini Stage 3 analysis'
      );

      getLogger().info(
        {
          provider: 'gemini',
          stage: 'stage_3_analysis',
          promptVersion: PROMPT_VERSIONS.STAGE_3_GEMINI_ANALYSIS,
          claimId: claim.id,
          latencyMs: Date.now() - startTime,
        },
        'Gemini Stage 3 analysis completed'
      );

      return validated;
    } catch (err) {
      getLogger().error(
        {
          provider: 'gemini',
          stage: 'stage_3_analysis',
          claimId: claim.id,
          latencyMs: Date.now() - startTime,
          providerHttpStatus: this._extractHttpStatus(err),
          err: err.message,
        },
        'Gemini Stage 3 analysis failed'
      );
      throw err;
    }
  }

  /**
   * Stage 4: Gemini independent verification
   */
  async verify(claim, evidencePacket) {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = buildVerifierPrompt('Gemini', claim, evidencePacket);

    try {
      const response = await retryWithBackoff(
        () => model.generateContent(prompt),
        { provider: 'gemini' }
      );
      const rawJson = JSON.parse(response.response.text());
      const validated = validateModelOutput(
        VerifierOutputSchema,
        rawJson,
        'Gemini Stage 4 verification'
      );

      getLogger().info(
        {
          provider: 'gemini',
          stage: 'stage_4_verification',
          promptVersion: PROMPT_VERSIONS.STAGE_4_VERIFIER,
          claimId: claim.id,
          verdict: validated.verdict,
          latencyMs: Date.now() - startTime,
        },
        'Gemini Stage 4 verification completed'
      );

      return validated;
    } catch (err) {
      getLogger().error(
        {
          provider: 'gemini',
          stage: 'stage_4_verification',
          claimId: claim.id,
          latencyMs: Date.now() - startTime,
          providerHttpStatus: this._extractHttpStatus(err),
          err: err.message,
        },
        'Gemini Stage 4 verification failed'
      );
      throw err;
    }
  }
}
