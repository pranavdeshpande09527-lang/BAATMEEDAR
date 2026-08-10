/**
 * Baatmeedar — Health Routes
 *
 * Liveness and readiness endpoints. Reveal no secrets, provider
 * credentials, or internal topology.
 */

import { Router } from 'express';
import { telemetry } from '../logging/telemetry.js';

/**
 * @param {object} deps
 * @param {object} [deps.db] — database pool for readiness check
 * @param {object} [deps.adapters] — external provider adapters
 */
export function healthRoutes(deps = {}) {
  const router = Router();

  /**
   * GET /health/live — Liveness probe.
   * Always returns OK if the process is running.
   */
  router.get('/live', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
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

    // Provider check
    checks.providers = {
      gemini: deps.adapters?.gemini ? 'configured' : 'mock/unconfigured',
      resend: deps.adapters?.resend ? 'configured' : 'mock/unconfigured',
    };

    const statusCode = ready ? 200 : 503;
    res.status(statusCode).json({ status: ready ? 'ready' : 'not_ready', checks });
  });

  /**
   * GET /health/metrics — Privacy-safe operational telemetry metrics.
   */
  router.get('/metrics', (_req, res) => {
    res.json(telemetry.getMetricsSummary());
  });

  return router;
}

