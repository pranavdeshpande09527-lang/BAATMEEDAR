/**
 * Baatmeedar — Health Routes
 *
 * Liveness and readiness endpoints. Reveal no secrets, provider
 * credentials, or internal topology.
 */

import { Router } from 'express';
import { telemetry } from '../logging/telemetry.js';

/**
 * Helper to assess whether a provider adapter is properly configured
 * @param {object} adapter
 * @returns {'configured' | 'mock' | 'unconfigured'}
 */
function evaluateProviderStatus(adapter) {
  if (!adapter) return 'unconfigured';
  if (adapter.constructor?.name?.startsWith('Fake')) {
    return 'mock';
  }
  if (adapter.apiKey && typeof adapter.apiKey === 'string' && adapter.apiKey.trim().length > 0) {
    return 'configured';
  }
  return 'unconfigured';
}

/**
 * @param {object} deps
 * @param {object} [deps.db] — database pool for readiness check
 * @param {object} [deps.adapters] — external provider adapters
 * @param {object} [deps.config] — application configuration
 */
export function healthRoutes(deps = {}) {
  const router = Router();
  const isProd = deps.config?.isProd || process.env.NODE_ENV === 'production';

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

    // 1. Database check
    if (deps.db?.pool) {
      try {
        await deps.db.query('SELECT 1');
        checks.database = 'ok';
      } catch {
        checks.database = 'unavailable';
        ready = false;
      }
    } else if (deps.db) {
      // If DB interface exists but no connection pool is initialized
      checks.database = isProd ? 'unavailable' : 'not_configured';
      if (isProd) ready = false;
    } else {
      checks.database = isProd ? 'unavailable' : 'not_configured';
      if (isProd) ready = false;
    }

    // 2. Provider checks
    const geminiStatus = evaluateProviderStatus(deps.adapters?.gemini);
    const groqStatus = evaluateProviderStatus(deps.adapters?.groq);
    const tavilyStatus = evaluateProviderStatus(deps.adapters?.tavily);
    const resendStatus = evaluateProviderStatus(deps.adapters?.resend);

    checks.providers = {
      gemini: geminiStatus,
      groq: groqStatus,
      tavily: tavilyStatus,
      resend: resendStatus,
    };

    // In production, required providers (gemini, groq, tavily) must be 'configured'
    if (isProd) {
      if (geminiStatus !== 'configured' || groqStatus !== 'configured' || tavilyStatus !== 'configured') {
        ready = false;
      }
    }

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
