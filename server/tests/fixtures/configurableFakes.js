/**
 * Baatmeedar — Configurable Fake Adapters
 *
 * Parametric test fakes allowing tests to inject failures, configure verifier verdicts,
 * simulate empty evidence, or return malformed output without modifying core logic.
 */

export class ConfigurableFakeGeminiAdapter {
  constructor(opts = {}) {
    this.opts = opts;
  }

  async extractClaims(inputText) {
    if (this.opts.failExtraction) {
      throw new Error('Gemini extraction service unavailable');
    }
    if (this.opts.emptyClaims) {
      return { claims: [], removed_opinions: ['Opinion statement removed.'] };
    }
    if (this.opts.malformedExtraction) {
      return { invalid_field: true };
    }
    return {
      claims: this.opts.claims || [
        {
          id: 'clm-001',
          text: 'The WHO declared mpox a Public Health Emergency of International Concern in 2024.',
          domain: 'Health',
          context: 'WHO emergency declaration context.',
          entities: ['WHO', 'mpox'],
          temporal: 'historical',
        },
      ],
      removed_opinions: this.opts.removed_opinions || ['Immediate action is required.'],
    };
  }

  async planResearch(claim) {
    if (this.opts.failResearch) {
      throw new Error('Gemini research planning failed');
    }
    return {
      claim_id: claim.id,
      research_question: `Did WHO confirm: ${claim.text}?`,
      required_facts: ['Official announcement'],
      source_strategy: 'Official health agencies',
      preferred_source_types: ['official record'],
      tavily_queries: [`${claim.text} official statement`],
      support_criteria: 'Direct confirmation',
      contradiction_criteria: 'Direct denial',
      groq_task: 'Identify missing context, logical gaps, counterevidence, and unanswered questions.',
      gemini_task: 'Define material terms, flag ambiguity/misinformation patterns, and assess evidence coverage.',
      follow_up_gaps: [],
      limitations: [],
    };
  }

  async analyzeEvidence(claim, sources) {
    return {
      analysis: 'Gemini evidence analysis completed.',
      missing_context: [],
      logical_issues: [],
      counterevidence: [],
      unanswered_questions: [],
    };
  }

  async verify(claim, evidencePacket) {
    if (this.opts.failGeminiVerify) {
      throw new Error('Gemini verification timed out');
    }
    return {
      verdict: this.opts.geminiVerdict || 'supported',
      confidence: this.opts.geminiConfidence ?? 92,
      reasoning: this.opts.geminiReasoning || 'Gemini verification result based on evidence.',
      evidence_ids: this.opts.geminiEvidenceIds || ['src-001'],
      limitations: 'Subject to retrieval recency.',
      unresolved_questions: [],
    };
  }
}

export class ConfigurableFakeGroqAdapter {
  constructor(opts = {}) {
    this.opts = opts;
  }

  async analyze(claim, sources) {
    if (this.opts.failGroqAnalyze) {
      throw new Error('Groq analysis rate limit exceeded');
    }
    return {
      analysis: 'Groq analysis completed.',
      missing_context: [],
      logical_issues: [],
      counterevidence: [],
      unanswered_questions: [],
    };
  }

  async verify(claim, evidencePacket) {
    if (this.opts.failGroqVerify) {
      throw new Error('Groq verification provider error');
    }
    return {
      verdict: this.opts.groqVerdict || 'supported',
      confidence: this.opts.groqConfidence ?? 94,
      reasoning: this.opts.groqReasoning || 'Groq verification result based on evidence.',
      evidence_ids: this.opts.groqEvidenceIds || ['src-001'],
      limitations: 'Subject to search coverage.',
      unresolved_questions: [],
    };
  }
}

export class ConfigurableFakeXAIAdapter {
  constructor(opts = {}) {
    this.opts = opts;
  }

  async verify(claim, evidencePacket) {
    if (this.opts.failGrokVerify || this.opts.failGroqVerify) {
      throw new Error('Grok/xAI verification provider error');
    }
    return {
      verdict: this.opts.grokVerdict || this.opts.groqVerdict || 'supported',
      confidence: this.opts.grokConfidence ?? this.opts.groqConfidence ?? 91,
      reasoning: this.opts.grokReasoning || this.opts.groqReasoning || 'Grok independent verification result based on evidence.',
      evidence_ids: this.opts.grokEvidenceIds || this.opts.groqEvidenceIds || ['src-001'],
      limitations: 'Subject to search coverage and provider availability.',
      unresolved_questions: [],
    };
  }
}

export class ConfigurableFakeTavilyAdapter {
  constructor(opts = {}) {
    this.opts = opts;
  }

  async search(queries) {
    if (this.opts.failSearch) {
      throw new Error('Tavily search API network error');
    }
    if (this.opts.emptySearch) {
      return [];
    }
    return [
      {
        url: 'https://www.who.int/news/item/14-08-2024-mpox-declaration',
        title: 'WHO Mpox Declaration',
        snippet: 'WHO declares mpox a public health emergency of international concern.',
        score: 0.98,
        published_date: '2024-08-14',
      },
    ];
  }

  async extract(url) {
    if (this.opts.failExtract) {
      throw new Error('Tavily article extraction failed for URL');
    }
    return {
      url,
      raw_text: 'The World Health Organization declared mpox a PHEIC on August 14, 2024.',
      title: 'WHO Mpox Declaration Article',
      publisher: 'who.int',
      retrieved_at: new Date().toISOString(),
      extraction_status: 'success',
    };
  }
}

export class ConfigurableFakeYoutubeAdapter {
  constructor(opts = {}) {
    this.opts = opts;
  }

  async getTranscript(urlStr) {
    if (this.opts.failTranscript) {
      throw new Error('YouTube transcript unavailable or disabled for video');
    }
    return {
      url: urlStr,
      video_id: 'mockVideoId',
      title: 'Mock Video Emergency Briefing',
      publisher: 'YouTube',
      retrieved_at: new Date().toISOString(),
      extraction_status: 'success',
      raw_text: 'Transcript: Health officials discussed confirmed case counts during the briefing.',
    };
  }
}

export function createConfigurableAdapters(opts = {}) {
  return {
    gemini: new ConfigurableFakeGeminiAdapter(opts),
    groq: new ConfigurableFakeGroqAdapter(opts),
    xai: new ConfigurableFakeXAIAdapter(opts),
    tavily: new ConfigurableFakeTavilyAdapter(opts),
    youtube: new ConfigurableFakeYoutubeAdapter(opts),
  };
}
