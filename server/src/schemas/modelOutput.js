/**
 * Baatmeedar — Model Output Validation Schemas
 *
 * Strict schemas for validating AI provider outputs before they enter
 * the next pipeline stage. Bounded repair/retry is allowed; silent
 * coercion is not.
 */

import { z } from 'zod';
import { Verdict, EvidenceStance, TimeSensitivity } from './enums.js';

/* ─────────────────────────────────────────────────────────────
   Stage 2 — Gemini Claim Extraction Output
   ───────────────────────────────────────────────────────────── */
export const ClaimExtractionOutputSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string().min(1),
      domain: z.string().min(1),
      context: z.string().default(''),
      entities: z.array(z.string()).default([]),
      temporal: TimeSensitivity.default('unspecified'),
    })
  ).min(0),
  removed_opinions: z.array(z.string()).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Stage 3 — Hermes Research Plan Output
   ───────────────────────────────────────────────────────────── */
export const ResearchPlanOutputSchema = z.object({
  claim_id: z.string().optional(),
  research_question: z.string().min(1),
  required_facts: z.array(z.string()).min(1),
  source_strategy: z.string().min(1),
  preferred_source_types: z.array(z.string()).default(['official record', 'peer-reviewed journal', 'credible reporting']),
  tavily_queries: z.array(z.string()).min(1),
  support_criteria: z.union([z.string(), z.array(z.string())]).default([]),
  contradiction_criteria: z.union([z.string(), z.array(z.string())]).default([]),
  groq_task: z.string().default('Identify missing context, logical gaps, counterevidence, and unanswered questions.'),
  gemini_task: z.string().default('Define material terms, flag ambiguity/misinformation patterns, and assess evidence coverage.'),
  follow_up_gaps: z.array(z.string()).default([]),
  limitations: z.union([z.string(), z.array(z.string())]).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Tool Calling Schemas — Function Calling Runtime
   ───────────────────────────────────────────────────────────── */
export const ToolCallRequestSchema = z.object({
  tool_name: z.enum(['tavily_search', 'tavily_extract', 'youtube_transcript']),
  arguments: z.record(z.unknown()),
  run_id: z.string().min(1),
  claim_id: z.string().optional(),
});

export const ToolCallResultSchema = z.object({
  tool_name: z.string(),
  status: z.enum(['success', 'error', 'blocked']),
  data: z.unknown().optional(),
  execution_ms: z.number().nonnegative(),
  error_message: z.string().optional(),
});

/* ─────────────────────────────────────────────────────────────
   Stage 3 — Groq/Gemini Analysis Output
   ───────────────────────────────────────────────────────────── */
export const AnalysisOutputSchema = z.object({
  analysis: z.string().min(1),
  missing_context: z.array(z.string()).default([]),
  logical_issues: z.array(z.string()).default([]),
  counterevidence: z.array(z.string()).default([]),
  unanswered_questions: z.array(z.string()).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Stage 4 — Groq/Gemini Verifier Output
   ───────────────────────────────────────────────────────────── */
export const VerifierOutputSchema = z.object({
  verdict: Verdict,
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
  evidence_ids: z.array(z.string()).min(0),
  limitations: z.string().min(1),
  unresolved_questions: z.array(z.string()).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Stage 5 — Editorial Synthesis Output
   ───────────────────────────────────────────────────────────── */
export const SynthesisOutputSchema = z.object({
  verdict: Verdict,
  rationale: z.string().min(1),
  supporting_evidence_ids: z.array(z.string()).default([]),
  conflicting_evidence_ids: z.array(z.string()).default([]),
  sources_cited: z.array(z.string()).default([]),
  limitations: z.string().min(1),
});

/* ─────────────────────────────────────────────────────────────
   Validation helper — validates and returns parsed or error
   ───────────────────────────────────────────────────────────── */

/**
 * Validate model output against a schema. Returns parsed data on success,
 * throws a descriptive error on failure (for bounded retry logic).
 *
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} data
 * @param {string} context — e.g. "Gemini claim extraction"
 * @returns {T}
 */
export function validateModelOutput(schema, data, context) {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');

  const error = new Error(`Malformed ${context} output: ${issues}`);
  error.name = 'ModelOutputValidationError';
  error.issues = result.error.issues;
  throw error;
}
