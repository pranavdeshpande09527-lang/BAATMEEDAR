/**
 * Baatmeedar — Fake Gemini Adapter for Deterministic Tests
 */

export class FakeGeminiAdapter {
  async extractClaims(inputText) {
    if (!inputText || !inputText.trim()) {
      return { claims: [], removed_opinions: [] };
    }

    const sentences = inputText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const claims = [];
    const removed_opinions = [];

    for (let i = 0; i < sentences.length; i++) {
      let s = sentences[i].trim();
      if (/and i (think|believe|feel|hope)|i think it will/i.test(s)) {
        const parts = s.split(/,\s*and i (think|believe|feel|hope)|,\s*and i think it/i);
        if (parts[0] && parts[0].trim()) {
          claims.push({
            id: `clm-${String(claims.length + 1).padStart(3, '0')}`,
            text: parts[0].trim(),
            domain: 'Government / Policy',
            context: 'Factual statement extracted from input.',
            entities: [],
            temporal: 'unspecified',
          });
        }
        removed_opinions.push('I think it will completely solve unemployment.');
      } else if (/^i (think|believe|feel|hope)|in my opinion|should be/i.test(s)) {
        removed_opinions.push(s);
      } else {
        claims.push({
          id: `clm-${String(claims.length + 1).padStart(3, '0')}`,
          text: s,
          domain: /game|match|cricket|sport/i.test(s) ? 'Sports' : /program|government|policy|unemployment/i.test(s) ? 'Government / Policy' : 'General',
          context: 'Factual statement extracted from input.',
          entities: [],
          temporal: 'unspecified',
        });
      }
    }

    if (claims.length === 0 && sentences.length > 0 && removed_opinions.length === 0) {
      claims.push({
        id: 'clm-001',
        text: inputText,
        domain: 'General',
        context: 'Factual claim extracted from input.',
        entities: [],
        temporal: 'unspecified',
      });
    }

    return { claims, removed_opinions };
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
