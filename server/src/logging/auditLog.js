/**
 * Baatmeedar — Audit Log
 *
 * Immutable audit records separate from operational logs.
 * Records evidence IDs and source IDs, never invented summaries.
 */

import { getLogger } from './logger.js';

/**
 * Audit event names — closed set.
 */
export const AUDIT_EVENTS = Object.freeze([
  'run_created',
  'stage_started',
  'stage_completed',
  'stage_failed',
  'run_completed',
  'run_cancelled',
  'run_deletion_requested',
  'account_linked',
  'evidence_added',
  'guest_session_created',
  'guest_session_expired',
  'authorization_denied',
]);

/**
 * Write an immutable audit record.
 *
 * In Phase 1 this writes to the structured logger with a dedicated
 * `audit: true` field. When the database is available, it also persists
 * to the `audit_log` table.
 *
 * @param {object} params
 * @param {string} params.event — one of AUDIT_EVENTS
 * @param {string} [params.run_id]
 * @param {string} [params.claim_id]
 * @param {string} [params.actor] — user_id, guest_session_id, or 'system'
 * @param {object} [params.details] — redacted event-specific details
 * @param {object} [params.db] — database client for persistence (optional)
 */
export async function auditLog({ event, run_id, claim_id, actor, details, db }) {
  const logger = getLogger();
  const record = {
    audit: true,
    event,
    run_id: run_id || null,
    claim_id: claim_id || null,
    actor: actor || 'system',
    details: details || {},
    timestamp: new Date().toISOString(),
  };

  // Always write to structured log
  logger.info(record, `audit: ${event}`);

  // Persist to database if client is available
  if (db) {
    try {
      await db.query(
        `INSERT INTO audit_log (run_id, event, actor, details_redacted, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.run_id, record.event, record.actor, JSON.stringify(record.details), record.timestamp]
      );
    } catch (err) {
      // Audit persistence failure must not crash the request
      logger.error({ err: err.message, event }, 'Failed to persist audit record');
    }
  }
}
