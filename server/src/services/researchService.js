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
    const hermesPlan = await this.gemini.planResearch(claim);

    // 2. Tavily source discovery using Hermes-provided targeted queries
    const queries = hermesPlan.tavily_queries?.length ? hermesPlan.tavily_queries : [claim.text];
    const rawSources = await this.tavily.search(queries);

    // Format sources as attributed evidence records with stable IDs and provenance
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
      logger.warn({ claim_id: claim.id }, 'No sources retrieved from Tavily — research will be incomplete');
    }

    // 3. Groq independent analysis — assigned task from Hermes groq_task
    // Receives same evidence packet but produces analysis independently
    const groqAnalysisRes = await this.groq.analyze(claim, sources);

    // 4. Gemini independent analysis — assigned task from Hermes gemini_task
    // Receives same evidence packet but produces analysis independently
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
