/**
 * Baatmeedar — Guest Session Repository
 *
 * Manages guest sessions and atomic guest-to-account run linking.
 */

import { db } from '../db/client.js';
import { getLogger } from '../logging/logger.js';

class InMemoryGuestSessionStore {
  constructor() {
    this.sessions = new Map();
  }

  create(id, ttlSeconds = 86400) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const session = { id, allowed_run_ids: [], expires_at: expiresAt };
    this.sessions.set(id, session);
    return session;
  }

  get(id) {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (new Date(s.expires_at) < new Date()) {
      this.sessions.delete(id);
      return null;
    }
    return s;
  }

  addRunId(sessionId, runId) {
    let s = this.get(sessionId);
    if (!s) s = this.create(sessionId);
    if (!s.allowed_run_ids.includes(runId)) {
      s.allowed_run_ids.push(runId);
    }
    return s;
  }

  linkToAccount(guestSessionId, userId, requestedRunIds) {
    const linkedIds = [];
    const skipped = [];
    const s = this.get(guestSessionId);

    for (const runId of requestedRunIds) {
      if (s && s.allowed_run_ids.includes(runId)) {
        linkedIds.push(runId);
      } else {
        skipped.push({ run_id: runId, reason: 'not_owned_by_guest_session' });
      }
    }
    return { linked_ids: linkedIds, skipped };
  }
}

const memoryStore = new InMemoryGuestSessionStore();

export const guestSessionRepository = {
  async get(id) {
    if (!db.pool) return memoryStore.get(id);
    try {
      const { rows } = await db.query(
        'SELECT * FROM guest_sessions WHERE id = $1 AND expires_at > NOW()',
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      return memoryStore.get(id);
    }
  },

  async addRunId(sessionId, runId, ttlSeconds = 86400) {
    if (!db.pool) return memoryStore.addRunId(sessionId, runId);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    try {
      await db.query(
        `INSERT INTO guest_sessions (id, allowed_run_ids, expires_at)
         VALUES ($1, jsonb_build_array($2::text), $3)
         ON CONFLICT (id) DO UPDATE SET
           allowed_run_ids = CASE
             WHEN guest_sessions.allowed_run_ids @> jsonb_build_array($2::text) THEN guest_sessions.allowed_run_ids
             ELSE guest_sessions.allowed_run_ids || jsonb_build_array($2::text)
           END;`,
        [sessionId, runId, expiresAt]
      );
      return this.get(sessionId);
    } catch (err) {
      return memoryStore.addRunId(sessionId, runId);
    }
  },

  /**
   * Atomically transfers guest runs to an authenticated account.
   */
  async linkToAccount(guestSessionId, userId, requestedRunIds) {
    if (!db.pool) return memoryStore.linkToAccount(guestSessionId, userId, requestedRunIds);

    const linkedIds = [];
    const skipped = [];

    for (const runId of requestedRunIds) {
      try {
        const { rows } = await db.query(
          `UPDATE verification_runs
           SET owner_type = 'authenticated', owner_id = $1, updated_at = NOW()
           WHERE id = $2 AND owner_type = 'guest' AND owner_id = $3
           RETURNING id;`,
          [userId, runId, guestSessionId]
        );

        if (rows.length > 0) {
          linkedIds.push(runId);
        } else {
          skipped.push({ run_id: runId, reason: 'not_owned_by_guest_session' });
        }
      } catch (err) {
        getLogger().error({ err: err.message, runId }, 'Failed to link run to account');
        skipped.push({ run_id: runId, reason: 'not_found' });
      }
    }

    return { linked_ids: linkedIds, skipped };
  },
};
