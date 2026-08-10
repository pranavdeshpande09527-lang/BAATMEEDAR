/**
 * Baatmeedar — Configuration Defaults & Domain Constants
 *
 * Safe defaults and named constants. No env-specific, security-sensitive,
 * or policy values here — only structural defaults used as fallbacks
 * when env vars are absent.
 */

/** Supported input types — closed enum, source of truth */
export const INPUT_TYPES = Object.freeze(['text', 'article', 'youtube']);

/** Run status lifecycle — closed enum */
export const RUN_STATUSES = Object.freeze([
  'accepted',
  'processing',
  'complete',
  'partial',
  'cancelled',
  'failed',
]);

/** Workflow stages in order — closed enum */
export const WORKFLOW_STAGES = Object.freeze([
  'accepted',
  'input_received',
  'extracting_claims',
  'researching',
  'verifying',
  'synthesizing',
  'complete',
]);

/** Terminal stages — no further transitions allowed */
export const TERMINAL_STAGES = Object.freeze(['complete', 'partial', 'cancelled', 'failed']);

/** Evidence stances — closed enum */
export const EVIDENCE_STANCES = Object.freeze(['supporting', 'contradicting', 'insufficient']);

/** Final verdict values — closed enum */
export const VERDICTS = Object.freeze(['supported', 'contradicted', 'inconclusive']);

/** Time sensitivity classification — closed enum */
export const TIME_SENSITIVITIES = Object.freeze(['current', 'historical', 'unspecified']);

/** Source type classification — closed enum */
export const SOURCE_TYPES = Object.freeze([
  'official_body',
  'peer_reviewed',
  'reputable_reporting',
  'government_record',
  'academic',
  'primary_source',
  'other',
]);

/** Verifier identifiers — closed enum */
export const VERIFIER_IDS = Object.freeze(['groq', 'gemini']);

/** Default configuration values */
export const DEFAULTS = Object.freeze({
  /** Input constraints */
  input: Object.freeze({
    maxTextLength: 5000,
    minTextLength: 1,
    maxUrlLength: 2048,
  }),

  /** HTTP body limits */
  body: Object.freeze({
    jsonLimitBytes: '50kb',
  }),

  /** Rate limit defaults */
  rateLimits: Object.freeze({
    verify: Object.freeze({ max: 10, windowMs: 60_000 }),
    auth: Object.freeze({ max: 5, windowMs: 60_000 }),
    general: Object.freeze({ max: 100, windowMs: 60_000 }),
  }),

  /** Guest session defaults */
  guestSession: Object.freeze({
    ttlSeconds: 86_400, // 24 hours
    cookieName: 'baatmeedar_guest',
  }),

  /** Provider timeouts (ms) */
  providerTimeouts: Object.freeze({
    gemini: 60_000,
    groq: 30_000,
    tavily: 30_000,
    youtube: 15_000,
  }),

  /** Retry configuration */
  retry: Object.freeze({
    maxAttempts: 3,
    baseDelayMs: 1_000,
    maxDelayMs: 10_000,
  }),

  /** Pagination */
  pagination: Object.freeze({
    defaultPageSize: 20,
    maxPageSize: 100,
  }),

  /** Run limits */
  run: Object.freeze({
    maxConcurrent: 5,
    timeoutMs: 600_000, // 10 minutes
  }),

  /** Allowed YouTube hostnames */
  youtube: Object.freeze({
    allowedHostnames: ['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'],
  }),
});
