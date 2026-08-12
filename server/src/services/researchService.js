/**
 * Baatmeedar — Stage 3 Research Service
 *
 * Coordinates per-claim research:
 * 1. Hermes creates a full research plan (Gemini) including groq_task and gemini_task
 * 2. Tavily discovers and retrieves sources using plan queries
 * 3. Groq independently analyzes context & logic (assigned by Hermes groq_task)
 * 4. Gemini independently analyzes coverage & ambiguity (assigned by Hermes gemini_task)
 *
 * Groq and Gemini analyze the same evidence packet independently, without
 * seeing each other's conclusions.
 *
 * Research must produce usable retrieved evidence before the claim can be
 * verified. Provider failures and empty retrieval are terminal for the claim.
 */

import { getLogger } from '../logging/logger.js';

export class ResearchService {
  /**
   * @param {object} adapters
   * @param {object} adapters.gemini
   * @param {object} adapters.groq
   * @param {object} adapters.tavily
   */
  constructor(adapters) {
    this.gemini = adapters.gemini;
    this.groq = adapters.groq;
    this.tavily = adapters.tavily;
  }

  async researchClaim(claim) {
    const logger = getLogger();
    logger.info({ claim_id: claim.id }, 'Executing Stage 3 research');

    // 1. Hermes research plan — produces full schema including groq_task and gemini_task
    //    This step is NOT isolated — if Gemini planResearch fails, Stage 3 cannot proceed.
    const hermesPlan = await this.gemini.planResearch(claim);

    // 2. Tavily source discovery
    const queries = hermesPlan.tavily_queries?.length ? hermesPlan.tavily_queries : [claim.text];
    const rawSources = await this.tavily.search(queries);
    const sources = rawSources.map((s, idx) => ({
      id: `src-${String(idx + 1).padStart(3, '0')}`,
      url: s.url,
      title: s.title || 'Web Source',
      publisher: s.publisher || (s.published_date ? `Published ${s.published_date}` : 'Web Publisher'),
      published_date: s.published_date || null,
      source_type: hermesPlan.preferred_source_types?.[0] || 'reputable_reporting',
      authority_rationale: 'Retrieved via Tavily web search, ranked by query relevance.',
      excerpt: s.snippet || s.title || '',
      stance: 'supporting',
    }));

    logger.info({ claim_id: claim.id, sources_count: sources.length }, 'Stage 3 sources retrieved');

    if (sources.length === 0) {
      throw new Error(`Stage 3 research failed: no usable sources were retrieved for claim ${claim.id}`);
    }

    // 3. Groq independent analysis
    const groqAnalysisRes = await this.groq.analyze(claim, sources);

    // 4. Gemini independent analysis
    const geminiAnalysisRes = await this.gemini.analyzeEvidence(claim, sources);

    return {
      claim_id: claim.id,
      hermes_plan: hermesPlan,
      sources,
      groq_analysis: groqAnalysisRes.analysis,
      groq_missing_context: groqAnalysisRes.missing_context,
      groq_counterevidence: groqAnalysisRes.counterevidence,
      gemini_analysis: geminiAnalysisRes.analysis,
      gemini_missing_context: geminiAnalysisRes.missing_context,
    };
  }
}
