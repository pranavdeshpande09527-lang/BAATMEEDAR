/**
 * Baatmeedar — Closed Enums (Zod)
 *
 * Single source of truth for all domain enums. Used at every trust
 * boundary — routes, services, persistence, model output validation.
 * Unknown values are rejected before they can reach the renderer.
 */

import { z } from 'zod';

/** Input types accepted by POST /verify */
export const InputType = z.enum(['text', 'article', 'youtube']);

/** Run lifecycle status */
export const RunStatus = z.enum([
  'accepted',
  'processing',
  'complete',
  'partial',
  'cancelled',
  'failed',
]);

/** Workflow stage (ordered) */
export const WorkflowStage = z.enum([
  'accepted',
  'input_received',
  'extracting_claims',
  'researching',
  'verifying',
  'synthesizing',
  'complete',
  'failed',
]);

/** Evidence stance toward a claim */
export const EvidenceStance = z.enum(['supporting', 'contradicting', 'insufficient']);

/** Source type classification */
export const SourceType = z.enum([
  'official_body',
  'peer_reviewed',
  'reputable_reporting',
  'government_record',
  'academic',
  'primary_source',
  'other',
]);

/** Final verdict — exactly one of three values */
export const Verdict = z.enum(['supported', 'contradicted', 'inconclusive']);

/** Time sensitivity of a claim */
export const TimeSensitivity = z.enum(['current', 'historical', 'unspecified']);

/** Which verifier produced a result */
export const VerifierId = z.enum(['groq', 'gemini']);

/** Owner type for a run */
export const OwnerType = z.enum(['guest', 'authenticated']);

/** Stable error categories for client responses */
export const ErrorCode = z.enum([
  'validation',
  'blocked_url',
  'timeout',
  'rate_limited',
  'provider_unavailable',
  'database_unavailable',
  'malformed_output',
  'authorization_denied',
  'not_found',
  'conflict',
  'internal_fault',
]);
