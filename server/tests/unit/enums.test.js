import { describe, it, expect } from 'vitest';
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
  ErrorCode,
} from '../../src/schemas/enums.js';

describe('Layer 1: Domain Enums Schema Unit Tests', () => {
  it('validates InputType accepts exact allowed values and rejects unknown', () => {
    expect(InputType.safeParse('text').success).toBe(true);
    expect(InputType.safeParse('article').success).toBe(true);
    expect(InputType.safeParse('youtube').success).toBe(true);

    expect(InputType.safeParse('audio').success).toBe(false);
    expect(InputType.safeParse('pdf').success).toBe(false);
    expect(InputType.safeParse('').success).toBe(false);
  });

  it('validates Verdict enum accepts strictly supported, contradicted, inconclusive', () => {
    expect(Verdict.safeParse('supported').success).toBe(true);
    expect(Verdict.safeParse('contradicted').success).toBe(true);
    expect(Verdict.safeParse('inconclusive').success).toBe(true);

    expect(Verdict.safeParse('true').success).toBe(false);
    expect(Verdict.safeParse('false').success).toBe(false);
    expect(Verdict.safeParse('verified').success).toBe(false);
    expect(Verdict.safeParse('unverified').success).toBe(false);
  });

  it('validates RunStatus enum values', () => {
    const valid = ['accepted', 'processing', 'complete', 'partial', 'cancelled', 'failed'];
    for (const status of valid) {
      expect(RunStatus.safeParse(status).success).toBe(true);
    }
    expect(RunStatus.safeParse('finished').success).toBe(false);
  });

  it('validates WorkflowStage enum maintains complete stage order', () => {
    const stages = [
      'accepted',
      'input_received',
      'extracting_claims',
      'researching',
      'verifying',
      'synthesizing',
      'complete',
    ];
    for (const stage of stages) {
      expect(WorkflowStage.safeParse(stage).success).toBe(true);
    }
    expect(WorkflowStage.safeParse('done').success).toBe(false);
  });

  it('validates EvidenceStance enum', () => {
    expect(EvidenceStance.safeParse('supporting').success).toBe(true);
    expect(EvidenceStance.safeParse('contradicting').success).toBe(true);
    expect(EvidenceStance.safeParse('insufficient').success).toBe(true);
    expect(EvidenceStance.safeParse('neutral').success).toBe(false);
  });

  it('validates SourceType enum', () => {
    const types = [
      'official_body',
      'peer_reviewed',
      'reputable_reporting',
      'government_record',
      'academic',
      'primary_source',
      'other',
    ];
    for (const t of types) {
      expect(SourceType.safeParse(t).success).toBe(true);
    }
    expect(SourceType.safeParse('blog').success).toBe(false);
  });

  it('validates VerifierId enum strictly identifies groq and gemini', () => {
    expect(VerifierId.safeParse('groq').success).toBe(true);
    expect(VerifierId.safeParse('gemini').success).toBe(true);
    expect(VerifierId.safeParse('grok').success).toBe(false);
    expect(VerifierId.safeParse('openai').success).toBe(false);
  });

  it('validates OwnerType enum', () => {
    expect(OwnerType.safeParse('guest').success).toBe(true);
    expect(OwnerType.safeParse('authenticated').success).toBe(true);
    expect(OwnerType.safeParse('admin').success).toBe(false);
  });

  it('validates ErrorCode enum closed set', () => {
    const codes = [
      'validation',
      'blocked_url',
      'timeout',
      'rate_limited',
      'provider_unavailable',
      'malformed_output',
      'authorization_denied',
      'not_found',
      'conflict',
      'internal_fault',
    ];
    for (const c of codes) {
      expect(ErrorCode.safeParse(c).success).toBe(true);
    }
    expect(ErrorCode.safeParse('unknown_error').success).toBe(false);
  });
});
