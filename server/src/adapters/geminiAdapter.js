/**
 * Baatmeedar — Gemini Adapter
 *
 * Wraps @google/generative-ai SDK for:
 * 1. Stage 2 claim extraction
 * 2. Stage 3 supporting analysis / Hermes research planning
 * 3. Stage 4 independent verification
 *
 * Enforces structured outputs and validates responses against Zod schemas.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateModelOutput, ClaimExtractionOutputSchema, ResearchPlanOutputSchema, AnalysisOutputSchema, VerifierOutputSchema } from '../schemas/modelOutput.js';
import { getLogger } from '../logging/logger.js';

export class GeminiAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = 'gemini-1.5-flash';
  }

  /**
   * Stage 2: Extract atomic factual claims from raw input text.
   */
  async extractClaims(inputText) {
    const model = this.genAI.getGenerativeAIModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are an expert newsroom editor extracting factual claims from submitted text.

Task:
1. Remove all opinions, predictions, advice, and non-verifiable rhetoric.
2. Split factual content into atomic, independently verifiable claims.
3. Assign each claim a domain (e.g. Health, Law, Science, Politics, Finance, Technology, History, General).
4. Assign time_sensitivity: 'current', 'historical', or 'unspecified'.

Return JSON matching:
{
  "claims": [
    {
      "id": "clm-001",
      "text": "The claim as written",
      "domain": "Health",
      "context": "Context from input",
      "entities": ["Entity1"],
      "temporal": "Historical"
    }
  ],
  "removed_opinions": ["Opinion text removed"]
}

Input text:
"""
${inputText}
"""`;

    try {
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const rawJson = JSON.parse(text);
      return validateModelOutput(ClaimExtractionOutputSchema, rawJson, 'Gemini claim extraction');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Gemini claim extraction failed');
      throw err;
    }
  }

  /**
   * Stage 3: Hermes Research Plan creation using Gemini
   */
  async planResearch(claim) {
    const model = this.genAI.getGenerativeAIModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are Hermes, the research-planning agent in a newsroom.

Claim ID: ${claim.id}
Claim Text: "${claim.text}"
Domain: ${claim.domain}
Context: ${claim.context || ''}

Create a precise research plan to gather primary evidence.
Return JSON matching:
{
  "research_question": "Precise question to test claim",
  "required_facts": ["Fact 1", "Fact 2"],
  "source_strategy": "Authoritative source types needed",
  "tavily_queries": ["query 1", "query 2"],
  "support_criteria": "What proves this claim",
  "contradiction_criteria": "What disproves this claim",
  "follow_up_gaps": []
}`;

    try {
      const response = await model.generateContent(prompt);
      const rawJson = JSON.parse(response.response.text());
      return validateModelOutput(ResearchPlanOutputSchema, rawJson, 'Hermes research plan');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Gemini Hermes research planning failed');
      throw err;
    }
  }

  /**
   * Stage 3: Gemini supporting analysis
   */
  async analyzeEvidence(claim, sources) {
    const model = this.genAI.getGenerativeAIModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are Gemini Stage 3 analyzer. Define material terms, flag ambiguity, and judge whether gathered sources address the claim.

Claim: "${claim.text}"
Sources: ${JSON.stringify(sources)}

Return JSON matching:
{
  "analysis": "Detailed analysis summary",
  "missing_context": [],
  "logical_issues": [],
  "counterevidence": [],
  "unanswered_questions": []
}`;

    try {
      const response = await model.generateContent(prompt);
      const rawJson = JSON.parse(response.response.text());
      return validateModelOutput(AnalysisOutputSchema, rawJson, 'Gemini Stage 3 analysis');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Gemini Stage 3 analysis failed');
      throw err;
    }
  }

  /**
   * Stage 4: Gemini independent verification
   */
  async verify(claim, evidencePacket) {
    const model = this.genAI.getGenerativeAIModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are Gemini, an independent Stage 4 verifier.
Compare the claim against the complete attributed evidence packet.

Claim: "${claim.text}"
Evidence Packet:
${JSON.stringify(evidencePacket, null, 2)}

Rules:
1. Return verdict: 'supported', 'contradicted', or 'inconclusive'.
2. Calibrate confidence (0-100).
3. Cite evidence_ids directly from the supplied sources.
4. State explicit limitations.

Return JSON matching:
{
  "verdict": "supported",
  "confidence": 95,
  "reasoning": "Reasoning tied to evidence IDs",
  "evidence_ids": ["src-001"],
  "limitations": "Limitations of verdict",
  "unresolved_questions": []
}`;

    try {
      const response = await model.generateContent(prompt);
      const rawJson = JSON.parse(response.response.text());
      return validateModelOutput(VerifierOutputSchema, rawJson, 'Gemini Stage 4 verification');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Gemini Stage 4 verification failed');
      throw err;
    }
  }
}
