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
          temporal: 'historical',
        },
      ],
      removed_opinions: ['Immediate global action is required.'],
    };
  }

  async planResearch(claim) {
    return {
      claim_id: claim.id,
      research_question: `Did official authorities confirm: ${claim.text}?`,
      required_facts: ['Official announcement date', 'Authoritative statement from WHO'],
      source_strategy: 'Official health agencies and wire reporting.',
      preferred_source_types: ['official record', 'peer-reviewed journal'],
      tavily_queries: [`${claim.text} official statement`, `WHO mpox emergency declaration 2024`],
      support_criteria: 'Direct confirmation by primary agency with a dated official statement.',
      contradiction_criteria: 'Direct denial or retraction by primary agency.',
      groq_task: 'Identify missing context, logical gaps, counterevidence, and unanswered questions.',
      gemini_task: 'Define material terms, flag ambiguity/misinformation patterns, and assess evidence coverage.',
      follow_up_gaps: [],
      limitations: [],
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
