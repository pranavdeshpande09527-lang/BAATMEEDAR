/**
 * Baatmeedar — Groq Adapter
 *
 * Wraps groq-sdk for:
 * 1. Stage 3 supporting analysis (`analyze`)
 * 2. Stage 4 independent verification (`verify`) — replaces Grok/xAI as second verifier.
 *
 * Maintains complete prompt and invocation isolation between Stage 3 and Stage 4.
 */

import Groq from 'groq-sdk';
import { validateModelOutput, AnalysisOutputSchema, VerifierOutputSchema } from '../schemas/modelOutput.js';
import { getLogger } from '../logging/logger.js';

export class GroqAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.groq = new Groq({ apiKey });
    this.modelName = 'llama-3.3-70b-versatile';
  }

  /**
   * Stage 3: Groq supporting analysis
   */
  async analyze(claim, sources) {
    const prompt = `You are Groq Stage 3 supporting analyzer.
Task: Independently identify missing context, logical issues, counterevidence, and unanswered questions in the gathered evidence.

Claim: "${claim.text}"
Sources:
${JSON.stringify(sources, null, 2)}

Return JSON matching:
{
  "analysis": "Detailed analysis text",
  "missing_context": ["Missing context 1"],
  "logical_issues": ["Issue 1"],
  "counterevidence": ["Counterevidence 1"],
  "unanswered_questions": ["Question 1"]
}`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.modelName,
        response_format: { type: 'json_object' },
      });

      const rawJson = JSON.parse(response.choices[0]?.message?.content || '{}');
      return validateModelOutput(AnalysisOutputSchema, rawJson, 'Groq Stage 3 analysis');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Groq Stage 3 analysis failed');
      throw err;
    }
  }

  /**
   * Stage 4: Groq independent verification (replaces Grok/xAI)
   */
  async verify(claim, evidencePacket) {
    const prompt = `You are Groq, acting as an independent Stage 4 evaluator in a newsroom claim verification system.

Task:
Compare the original claim against the attributed Stage 3 evidence packet.
Determine if the claim is supported, contradicted, or inconclusive based strictly on the evidence.

Claim: "${claim.text}"
Evidence Packet:
${JSON.stringify(evidencePacket, null, 2)}

Rules:
1. Verdict MUST be exactly 'supported', 'contradicted', or 'inconclusive'.
2. Calibrate confidence score between 0 and 100.
3. Cite evidence_ids directly from the supplied sources array.
4. State explicit limitations of your verdict.

Return JSON matching:
{
  "verdict": "supported",
  "confidence": 92,
  "reasoning": "Clear reasoning citing evidence IDs",
  "evidence_ids": ["src-001"],
  "limitations": "Limitations of verdict",
  "unresolved_questions": []
}`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.modelName,
        response_format: { type: 'json_object' },
      });

      const rawJson = JSON.parse(response.choices[0]?.message?.content || '{}');
      return validateModelOutput(VerifierOutputSchema, rawJson, 'Groq Stage 4 verification');
    } catch (err) {
      getLogger().error({ err: err.message }, 'Groq Stage 4 verification failed');
      throw err;
    }
  }
}
