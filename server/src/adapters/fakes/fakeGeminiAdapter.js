/**
 * Baatmeedar — Fake Gemini Adapter for Deterministic Tests
 */

export class FakeGeminiAdapter {
  async extractClaims(inputText) {
    return {
      claims: [
        {
          id: 'clm-001',
          text: 'The WHO declared mpox a Public Health Emergency of International Concern in 2024.',
          domain: 'Health',
          context: 'WHO emergency declaration regarding mpox outbreak.',
          entities: ['WHO', 'mpox'],
          temporal: 'Historical',
        },
      ],
      removed_opinions: ['Immediate global action is required.'],
    };
  }

  async planResearch(claim) {
    return {
      research_question: `Did official authorities confirm: ${claim.text}?`,
      required_facts: ['Official announcement date', 'Authoritative statement'],
      source_strategy: 'Official health agencies and wire reporting.',
      tavily_queries: [`${claim.text} official statement`],
      support_criteria: 'Direct confirmation by primary agency.',
      contradiction_criteria: 'Direct denial by primary agency.',
      follow_up_gaps: [],
    };
  }

  async analyzeEvidence(claim, sources) {
    return {
      analysis: 'Gemini analysis confirms primary source coverage for this claim.',
      missing_context: [],
      logical_issues: [],
      counterevidence: [],
      unanswered_questions: [],
    };
  }

  async verify(claim, evidencePacket) {
    return {
      verdict: 'supported',
      confidence: 95,
      reasoning: 'Primary WHO statement directly verifies this claim.',
      evidence_ids: ['src-001'],
      limitations: 'Historical accuracy as of declaration date.',
      unresolved_questions: [],
    };
  }
}
