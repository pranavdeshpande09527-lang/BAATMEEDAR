/**
 * Baatmeedar — Run & Domain Data Schemas (Zod)
 *
 * Typed schemas matching coding_rules §2 data contract.
 * Used for persistence validation and API response shaping.
 */

import { z } from 'zod';
import {
  InputType,
  RunStatus,
  WorkflowStage,
  EvidenceStance,
  SourceType,
  Verdict,
  TimeSensitivity,
  VerifierId,
  OwnerType,
} from './enums.js';

/* ─────────────────────────────────────────────────────────────
   Claim
   ───────────────────────────────────────────────────────────── */
export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  domain: z.string().min(1),
  context: z.string().default(''),
  entities: z.array(z.string()).default([]),
  temporal: TimeSensitivity.default('unspecified'),
  time_sensitivity: TimeSensitivity.optional(),
});

/* ─────────────────────────────────────────────────────────────
   Research Plan (Hermes)
   ───────────────────────────────────────────────────────────── */
export const ResearchPlanSchema = z.object({
  claim_id: z.string().min(1),
  research_question: z.string().min(1),
  required_facts: z.array(z.string()).default([]),
  source_strategy: z.string().default(''),
  tavily_queries: z.array(z.string()).default([]),
  support_criteria: z.string().optional(),
  contradiction_criteria: z.string().optional(),
  follow_up_gaps: z.array(z.string()).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Source
   ───────────────────────────────────────────────────────────── */
export const SourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().default(''),
  publisher: z.string().default(''),
  published_date: z.string().optional(),
  retrieved_at: z.string().datetime().optional(),
  source_type: SourceType.default('other'),
  authority_rationale: z.string().default(''),
});

/* ─────────────────────────────────────────────────────────────
   Evidence
   ───────────────────────────────────────────────────────────── */
export const EvidenceSchema = z.object({
  id: z.string().min(1),
  source_id: z.string().min(1),
  claim_id: z.string().min(1),
  excerpt: z.string().min(1),
  stance: EvidenceStance,
  relevance: z.string().default(''),
  limitations: z.string().default(''),
});

/* ─────────────────────────────────────────────────────────────
   Verifier Result (Groq or Gemini)
   ───────────────────────────────────────────────────────────── */
export const VerifierResultSchema = z.object({
  id: z.string().min(1),
  claim_id: z.string().min(1),
  verifier: VerifierId,
  verdict: Verdict,
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
  evidence_ids: z.array(z.string()).default([]),
  limitations: z.string().default(''),
  unresolved_questions: z.array(z.string()).default([]),
  model_id: z.string().default(''),
  prompt_version: z.string().default(''),
  invocation_timestamp: z.string().datetime().optional(),
});

/* ─────────────────────────────────────────────────────────────
   Final Result (Editorial Synthesis)
   ───────────────────────────────────────────────────────────── */
export const FinalResultSchema = z.object({
  id: z.string().min(1),
  claim_id: z.string().min(1),
  verdict: Verdict,
  rationale: z.string().min(1),
  supporting_evidence_ids: z.array(z.string()).default([]),
  conflicting_evidence_ids: z.array(z.string()).default([]),
  sources_cited: z.array(z.string()).default([]),
  limitations: z.string().default(''),
});

/* ─────────────────────────────────────────────────────────────
   Input Record (Stage 1)
   ───────────────────────────────────────────────────────────── */
export const InputRecordSchema = z.object({
  type: InputType,
  content: z.string(),
  source_url: z.string().nullable().default(null),
  publisher: z.string().nullable().default(null),
  retrieved_at: z.string().datetime().optional(),
  extraction_status: z.string().default('pending'),
  raw_text_preview: z.string().optional(),
});

/* ─────────────────────────────────────────────────────────────
   Verification Run (top-level)
   ───────────────────────────────────────────────────────────── */
export const VerificationRunSchema = z.object({
  id: z.string().uuid(),
  input: InputRecordSchema,
  owner_type: OwnerType,
  owner_id: z.string().min(1),
  status: RunStatus,
  current_stage: WorkflowStage,
  idempotency_key: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});

/* ─────────────────────────────────────────────────────────────
   Research item — per-claim research output (renderer-compatible)
   ───────────────────────────────────────────────────────────── */
export const ResearchItemSchema = z.object({
  claim_id: z.string().min(1),
  hermes_plan: ResearchPlanSchema.omit({ claim_id: true }).optional(),
  sources: z.array(SourceSchema).default([]),
  groq_analysis: z.string().default(''),
  gemini_analysis: z.string().default(''),
});

/* ─────────────────────────────────────────────────────────────
   Verdict item — per-claim verdict output (renderer-compatible)
   ───────────────────────────────────────────────────────────── */
export const VerdictItemSchema = z.object({
  claim_id: z.string().min(1),
  groq: z.object({
    verdict: Verdict,
    confidence: z.number().int().min(0).max(100),
    reasoning: z.string(),
    limitations: z.string().default(''),
    evidence_ids: z.array(z.string()).default([]),
  }).optional(),
  gemini: z.object({
    verdict: Verdict,
    confidence: z.number().int().min(0).max(100),
    reasoning: z.string(),
    limitations: z.string().default(''),
    evidence_ids: z.array(z.string()).default([]),
  }).optional(),
  final: z.object({
    verdict: Verdict,
    rationale: z.string(),
    sources_cited: z.array(z.string()).default([]),
    limitations: z.string().default(''),
  }).optional(),
});

/* ─────────────────────────────────────────────────────────────
   Full Results Response — compatible with existing renderer
   ───────────────────────────────────────────────────────────── */
export const FullResultsSchema = z.object({
  run_id: z.string(),
  input: InputRecordSchema,
  claims: z.array(ClaimSchema).default([]),
  removed_opinions: z.array(z.string()).default([]),
  research: z.array(ResearchItemSchema).default([]),
  verdicts: z.array(VerdictItemSchema).default([]),
});
