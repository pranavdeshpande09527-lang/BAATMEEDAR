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
   * Start asynchronous verification run execution
   * @param {string} runId
   * @param {{ input_type: string, content: string }} inputPayload
   */
  async startRun(runId, inputPayload) {
    const logger = getLogger();
    logger.info({ runId, inputType: inputPayload.input_type }, 'Starting 5-stage verification run');

    try {
      // Stage 1: Input Collection & Ingestion
      await this.statusPublisher.publishStage(runId, 'input_received', 'processing');
      const inputRecord = await this.inputService.processInput(inputPayload.input_type, inputPayload.content);

      // Stage 2: Claim Extraction
      await this.statusPublisher.publishStage(runId, 'extracting_claims', 'processing');
      const extraction = await this.claimExtractor.extractClaims(inputRecord.raw_text_preview || inputPayload.content);

      await this.repo.saveClaims(runId, extraction.claims, extraction.removed_opinions);
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'extracting_claims', claims_count: extraction.claims.length } });

      if (!extraction.claims.length) {
        logger.warn({ runId }, 'No factual claims extracted from input');
        await this.statusPublisher.publishStage(runId, 'complete', 'complete');
        return;
      }

      // Stage 3: Research per claim
      await this.statusPublisher.publishStage(runId, 'researching', 'processing');
      const researchDataList = [];
      for (const claim of extraction.claims) {
        const researchData = await this.researcher.researchClaim(claim);
        researchDataList.push(researchData);
        await this.repo.saveResearch(claim.id, researchData.hermes_plan, researchData.sources);
      }
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'researching' } });

      // Stage 4: Independent Verification per claim
      await this.statusPublisher.publishStage(runId, 'verifying', 'processing');
      const verificationList = [];
      for (let i = 0; i < extraction.claims.length; i++) {
        const claim = extraction.claims[i];
        const researchData = researchDataList[i];
        const verifierRes = await this.verifier.verifyClaim(claim, researchData);
        verificationList.push(verifierRes);

        await this.repo.saveVerifierResult(claim.id, verifierRes.grok);
        await this.repo.saveVerifierResult(claim.id, verifierRes.gemini);
      }
      await auditLog({ event: 'stage_completed', run_id: runId, details: { stage: 'verifying' } });

      // Stage 5: Editorial Synthesis
      await this.statusPublisher.publishStage(runId, 'synthesizing', 'processing');
      for (let i = 0; i < extraction.claims.length; i++) {
        const claim = extraction.claims[i];
        const researchData = researchDataList[i];
        const verifierRes = verificationList[i];

        const finalResult = await this.synthesizer.synthesizeVerdict(claim, researchData, verifierRes);
        await this.repo.saveFinalResult(claim.id, finalResult.final);
      }

      // Complete run
      await this.statusPublisher.publishStage(runId, 'complete', 'complete');
      await auditLog({ event: 'run_completed', run_id: runId });
      logger.info({ runId }, 'Verification run completed successfully');

    } catch (err) {
      logger.error({ runId, err: err.message }, 'Verification run failed');
      await this.statusPublisher.publishStage(runId, 'failed', 'failed');
      await auditLog({ event: 'stage_failed', run_id: runId, details: { error: err.message } });
    }
  }
}

export const orchestrator = new Orchestrator();
