/**
 * Baatmeedar — Workflow Orchestrator
 *
 * Coordinates the full 5-stage newsroom claim verification pipeline:
 * 1. Input Collection & Ingestion
 * 2. Gemini Claim Extraction & Opinion Removal
 * 3. Domain Research (Hermes Plan + Tavily Search + Groq/Gemini Analysis)
 * 4. Independent Verification (Grok/xAI & Gemini in parallel; Groq as fallback)
 * 5. Editorial Synthesis & Result Publishing
 *
 * Observable, retry-safe, cancellation-aware, and time-bounded.
 * A claim may reach synthesis only after research and both verifiers return
 * usable, evidence-backed results.
 */

import { InputService } from './inputService.js';
import { ClaimExtractionService } from './claimExtractionService.js';
import { ResearchService } from './researchService.js';
import { VerificationService } from './verificationService.js';
import { SynthesisService } from './synthesisService.js';
import { StatusPublisher } from './statusPublisher.js';
import { createAdapters } from '../adapters/adapterFactory.js';
import { runRepository } from '../repositories/runRepository.js';
import { config } from '../config/index.js';
import { getLogger } from '../logging/logger.js';
import { auditLog } from '../logging/auditLog.js';

export class Orchestrator {
  constructor(adapters = null, repo = null) {
    const providerAdapters = adapters || createAdapters(config);
    this.repo = repo || runRepository;
    this.statusPublisher = new StatusPublisher(this.repo);

    this.inputService = new InputService(providerAdapters);
    this.claimExtractor = new ClaimExtractionService(providerAdapters);
    this.researcher = new ResearchService(providerAdapters);
    this.verifier = new VerificationService(providerAdapters);
    this.synthesizer = new SynthesisService();
  }

  /**
   * Classify pipeline errors into safe, client-facing failure objects.
   * Internal details (stack traces, API keys) are logged server-side only.
   */
  #classifyError(err, stage) {
    const msg = err?.message || '';

    if (err?.name === 'RetryExhaustedError') {
      return {
        stage,
        code: 'provider_rate_limited',
        message: `Research or verification is temporarily unavailable because an AI provider rate limit was reached (${err.provider || 'provider'}).`,
        retryable: true,
      };
    }

    if (err?.name === 'DeadlineExceededError') {
      return {
        stage,
        code: 'provider_deadline_exceeded',
        message: 'Processing timed out waiting for AI provider response. Please try again.',
        retryable: true,
      };
    }

    if (err?.code === 'database_unavailable' || err?.name === 'DatabaseUnavailableError') {
      return {
        stage,
        code: 'database_unavailable',
        message: 'A database storage error occurred while processing this request.',
        retryable: false,
      };
    }

    if (stage === 'researching' || /no usable sources|search failed/i.test(msg)) {
      return {
        stage: 'researching',
        code: 'research_failed',
        message: 'No reliable web sources could be retrieved to evaluate the claims.',
        retryable: true,
      };
    }

    if (stage === 'verifying' || /verification/i.test(msg)) {
      return {
        stage: 'verifying',
        code: 'verification_failed',
        message: 'Independent AI verification could not be completed for the retrieved evidence.',
        retryable: true,
      };
    }

    if (stage === 'extracting_claims') {
      return {
        stage: 'extracting_claims',
        code: 'extraction_failed',
        message: 'Factual claims could not be extracted from the provided input.',
        retryable: true,
      };
    }

    return {
      stage,
      code: 'internal_error',
      message: 'Verification failed due to an internal system error.',
      retryable: false,
    };
  }

  /**
   * Start asynchronous verification run execution
   * @param {string} runId
   * @param {{ input_type: string, content: string }} inputPayload
   */
  async startRun(runId, inputPayload) {
    const logger = getLogger();
    logger.info({ runId, inputType: inputPayload.input_type }, 'Starting 5-stage verification run');
    let activeStage = 'accepted';

    try {
      // Stage 1: Input Collection & Ingestion
      activeStage = 'input_received';
      await this.statusPublisher.publishStage(runId, 'input_received', 'processing');
      const inputRecord = await this.inputService.processInput(inputPayload.input_type, inputPayload.content);

      // Stage 2: Claim Extraction — not fault-tolerant; no claims = nothing to verify
      activeStage = 'extracting_claims';
      await this.statusPublisher.publishStage(runId, 'extracting_claims', 'processing');
      const extraction = await this.claimExtractor.extractClaims(inputRecord.raw_text_preview || inputPayload.content);

      await this.repo.saveClaims(runId, extraction.claims, extraction.removed_opinions);
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'extracting_claims', claims_count: extraction.claims.length } });

      if (!extraction.claims.length) {
        logger.warn({ runId }, 'No factual claims extracted from input');
        await this.statusPublisher.publishStage(runId, 'complete', 'complete');
        return;
      }

      // Stage 3: Research per claim. Missing research is terminal.
      activeStage = 'researching';
      await this.statusPublisher.publishStage(runId, 'researching', 'processing');
      const researchDataList = [];
      for (const claim of extraction.claims) {
        const researchData = await this.researcher.researchClaim(claim);
        await this.repo.saveResearch(claim.id, researchData.hermes_plan, researchData.sources);
        researchDataList.push(researchData);
      }
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'researching' } });

      // Stage 4: both independent verifiers are required before synthesis.
      activeStage = 'verifying';
      await this.statusPublisher.publishStage(runId, 'verifying', 'processing');
      const verificationList = [];
      for (let i = 0; i < extraction.claims.length; i++) {
        const claim = extraction.claims[i];
        const researchData = researchDataList[i];
        const verifierRes = await this.verifier.verifyClaim(claim, researchData);
        await this.repo.saveVerifierResult(claim.id, verifierRes.grok);
        await this.repo.saveVerifierResult(claim.id, verifierRes.gemini);
        verificationList.push(verifierRes);
      }
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'verifying' } });

      // Stage 5: Editorial Synthesis
      activeStage = 'synthesizing';
      await this.statusPublisher.publishStage(runId, 'synthesizing', 'processing');
      for (let i = 0; i < extraction.claims.length; i++) {
        const claim = extraction.claims[i];
        const researchData = researchDataList[i];
        const verifierRes = verificationList[i];

        const finalResult = await this.synthesizer.synthesizeVerdict(claim, researchData, verifierRes);
        await this.repo.saveFinalResult(claim.id, finalResult.final);
      }

      // Complete run
      activeStage = 'complete';
      await this.statusPublisher.publishStage(runId, 'complete', 'complete');
      await auditLog({ event: 'run_completed', run_id: runId });
      logger.info({ runId }, 'Verification run completed successfully');

    } catch (err) {
      const failureInfo = this.#classifyError(err, activeStage);
      logger.error({ runId, activeStage, err: err.message, failureInfo }, 'Verification run failed');
      await this.statusPublisher.publishStage(runId, 'failed', 'failed', null, failureInfo);
      await auditLog({ event: 'stage_failed', run_id: runId, details: { error: err.message, failure: failureInfo } });
    }
  }
}

export const orchestrator = new Orchestrator();
