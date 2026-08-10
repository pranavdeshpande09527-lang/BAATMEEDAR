import { describe, it, expect } from 'vitest';
import {
  ClaimExtractionOutputSchema,
  ResearchPlanOutputSchema,
  AnalysisOutputSchema,
  VerifierOutputSchema,
  SynthesisOutputSchema,
  validateModelOutput,
} from '../../src/schemas/modelOutput.js';

describe('Layer 1: Model Output Schema & Validation Unit Tests', () => {
  describe('ClaimExtractionOutputSchema', () => {
    it('validates correct claim extraction JSON output', () => {
      const payload = {
        claims: [
          {
            id: 'clm-001',
            text: 'The WHO declared mpox a PHEIC in 2024.',
            domain: 'Health',
            context: 'WHO briefing',
            entities: ['WHO', 'mpox'],
            temporal: 'historical',
          },
        ],
        removed_opinions: ['Urgent global action is necessary.'],
      };
      const res = ClaimExtractionOutputSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('accepts empty claims array when input contains no factual statements', () => {
      const payload = {
        claims: [],
        removed_opinions: ['This is purely my opinion.'],
      };
      const res = ClaimExtractionOutputSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects claim missing required fields (id or text)', () => {
      const payload = {
        claims: [{ text: 'Claim text without id', domain: 'Health' }],
        removed_opinions: [],
      };
      const res = ClaimExtractionOutputSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  describe('ResearchPlanOutputSchema', () => {
    it('validates complete Hermes research plan', () => {
      const payload = {
        research_question: 'Did WHO issue mpox PHEIC declaration in 2024?',
        required_facts: ['Date of declaration', 'Official agency statement'],
        source_strategy: 'Official WHO press releases',
        tavily_queries: ['WHO mpox declaration 2024'],
        support_criteria: 'Official confirmation by WHO',
        contradiction_criteria: 'Official denial by WHO',
        follow_up_gaps: [],
      };
      const res = ResearchPlanOutputSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects plan with empty tavily_queries array', () => {
      const payload = {
        research_question: 'Did WHO issue declaration?',
        required_facts: ['Fact 1'],
        source_strategy: 'Strategy',
        tavily_queries: [],
      };
      const res = ResearchPlanOutputSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  describe('VerifierOutputSchema', () => {
    it('validates correct verifier output', () => {
      const payload = {
        verdict: 'supported',
        confidence: 95,
        reasoning: 'Primary sources verify the claim text directly.',
        evidence_ids: ['src-001'],
        limitations: 'Limited to sources available up to 2024.',
        unresolved_questions: [],
      };
      const res = VerifierOutputSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects confidence out of range 0..100', () => {
      const payloadHigh = {
        verdict: 'supported',
        confidence: 105,
        reasoning: 'Reasoning string',
        evidence_ids: ['src-001'],
        limitations: 'Limitations string',
      };
      expect(VerifierOutputSchema.safeParse(payloadHigh).success).toBe(false);

      const payloadLow = { ...payloadHigh, confidence: -1 };
      expect(VerifierOutputSchema.safeParse(payloadLow).success).toBe(false);
    });

    it('rejects invalid verdict string (e.g. "true" or "false")', () => {
      const payload = {
        verdict: 'true',
        confidence: 90,
        reasoning: 'Reasoning string',
        evidence_ids: [],
        limitations: 'Limitations string',
      };
      expect(VerifierOutputSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('SynthesisOutputSchema', () => {
    it('validates synthesis output', () => {
      const payload = {
        verdict: 'inconclusive',
        rationale: 'Evaluator disagreement between Groq and Gemini.',
        supporting_evidence_ids: ['src-001'],
        conflicting_evidence_ids: ['src-002'],
        sources_cited: ['src-001', 'src-002'],
        limitations: 'Evidence currency limited to search snapshot.',
      };
      const res = SynthesisOutputSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  describe('validateModelOutput() helper', () => {
    it('returns parsed data on valid input', () => {
      const data = {
        verdict: 'supported',
        confidence: 90,
        reasoning: 'Verified by primary source.',
        evidence_ids: ['src-001'],
        limitations: 'None',
      };
      const parsed = validateModelOutput(VerifierOutputSchema, data, 'Groq verification');
      expect(parsed.verdict).toBe('supported');
    });

    it('throws ModelOutputValidationError on invalid input', () => {
      const badData = { verdict: 'invalid_verdict' };
      expect(() => validateModelOutput(VerifierOutputSchema, badData, 'Groq verification')).toThrow(
        /Malformed Groq verification output/
      );
    });

    it('handles non-object inputs gracefully (null, undefined, primitives)', () => {
      expect(() => validateModelOutput(VerifierOutputSchema, null, 'Test')).toThrow();
      expect(() => validateModelOutput(VerifierOutputSchema, undefined, 'Test')).toThrow();
      expect(() => validateModelOutput(VerifierOutputSchema, 'string output', 'Test')).toThrow();
    });
  });
});
