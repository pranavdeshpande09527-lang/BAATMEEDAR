/**
 * Baatmeedar — Stage 3 Research Service
 *
 * Coordinates per-claim research:
 * 1. Hermes creates research plan (Gemini)
 * 2. Tavily discovers and retrieves sources
 * 3. Groq independently analyzes context & logic
 * 4. Gemini independently analyzes coverage & ambiguity
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
    getLogger().info({ claim_id: claim.id }, 'Executing Stage 3 research');

    // 1. Hermes research plan
    const hermesPlan = await this.gemini.planResearch(claim);

    // 2. Tavily search
    const rawSources = await this.tavily.search(hermesPlan.tavily_queries || [`${claim.text}`]);

    // Format sources as attributed evidence records
    const sources = rawSources.map((s, idx) => ({
      id: `src-${String(idx + 1).padStart(3, '0')}`,
      url: s.url,
      title: s.title || 'Web Source',
      publisher: s.published_date ? `Published ${s.published_date}` : 'Web Publisher',
      published_date: s.published_date || null,
      source_type: 'reputable_reporting',
      authority_rationale: 'Retrieved via Tavily web search.',
      excerpt: s.snippet || s.title,
      stance: 'supporting',
    }));

    // 3. Groq independent supporting analysis
    const groqAnalysisRes = await this.groq.analyze(claim, sources);

    // 4. Gemini independent supporting analysis
    const geminiAnalysisRes = await this.gemini.analyzeEvidence(claim, sources);

    return {
      claim_id: claim.id,
      hermes_plan: hermesPlan,
      sources,
      groq_analysis: groqAnalysisRes.analysis,
      gemini_analysis: geminiAnalysisRes.analysis,
    };
  }
}
