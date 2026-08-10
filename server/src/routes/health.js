/**
 * Baatmeedar — Health Routes
 *
 * Liveness and readiness endpoints. Reveal no secrets, provider
 * credentials, or internal topology.
 */

import { Router } from 'express';

/**
 * @param {object} deps
 * @param {object} [deps.db] — database pool for readiness check
 */
export function healthRoutes(deps = {}) {
  const router = Router();

  /**
   * GET /health/live — Liveness probe.
   * Always returns OK if the process is running.
   */
  router.get('/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * GET /health/ready — Readiness probe.
   * Checks only dependencies required to accept work.
   */
  router.get('/ready', async (_req, res) => {
    const checks = {};
    let ready = true;

    // Database check
    if (deps.db) {
      try {
        await deps.db.query('SELECT 1');
        checks.database = 'ok';
      } catch {
        checks.database = 'unavailable';
        ready = false;
      }
    } else {
      checks.database = 'not_configured';
    }

    const statusCode = ready ? 200 : 503;
    res.status(statusCode).json({ status: ready ? 'ready' : 'not_ready', checks });
  });

  return router;
}
