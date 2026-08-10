/**
 * Baatmeedar — Fake Groq Adapter for Deterministic Tests
 */

export class FakeGroqAdapter {
  async analyze(claim, sources) {
    return {
      analysis: 'Groq analysis identified strong alignment with primary evidence and no logical contradictions.',
      missing_context: [],
      logical_issues: [],
      counterevidence: [],
      unanswered_questions: [],
    };
  }

  async verify(claim, evidencePacket) {
    return {
      verdict: 'supported',
      confidence: 94,
      reasoning: 'Independent Groq evaluation corroborates support from cited sources.',
      evidence_ids: ['src-001'],
      limitations: 'Subject to source retrieval recency.',
      unresolved_questions: [],
    };
  }
}
