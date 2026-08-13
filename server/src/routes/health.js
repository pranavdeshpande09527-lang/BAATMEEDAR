/**
 * Baatmeedar — Health Routes
 *
 * Liveness and readiness endpoints. Reveal no secrets, provider
 * credentials, or internal topology.
 *
 * The /health/ready endpoint performs real canary calls to Gemini and Tavily
 * to detect broken credentials or egress blocks that a key-presence check
 * cannot catch. Results are cached for HEALTH_CANARY_INTERVAL_MS (default
 * 5 minutes) to avoid burning API quota on every Render health poll.
 */

import { Router } from 'express';
import { telemetry } from '../logging/telemetry.js';
import { getLogger } from '../logging/logger.js';

// ─── Canary interval ──────────────────────────────────────────────────────────

const CANARY_INTERVAL_MS = parseInt(process.env.HEALTH_CANARY_INTERVAL_MS || '300000', 10);

/**
 * Run a lightweight real outbound call to each required provider.
 * Errors are caught, logged server-side (never exposed to the HTTP caller),
 * and recorded as { ok: false, error: 'sanitised summary' }.
 *
 * @param {object} adapters
 * @returns {Promise<{ gemini: object, tavily: object, ranAt: string }>}
 */
async function runCanaryChecks(adapters) {
  const logger = getLogger();
  const results = {};

  // ── Gemini canary ──────────────────────────────────────────────────────────
  if (adapters?.gemini && typeof adapters.gemini.extractClaims === 'function') {
    const start = Date.now();
    try {
      await adapters.gemini.extractClaims('The sky is blue.');
      results.gemini = { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      // Extract HTTP status if available from the Google SDK error
      const httpStatus =
        err?.status ||
        err?.statusCode ||
        (typeof err?.message === 'string'
          ? (err.message.match(/\b(400|401|403|404|429|500|503)\b/) || [])[0]
          : null);

      logger.error(
        {
          canary: 'gemini',
          providerHttpStatus: httpStatus ? Number(httpStatus) : undefined,
          err: err.message,
          latencyMs: Date.now() - start,
        },
        'Gemini canary probe failed — real outbound call unsuccessful'
      );
      results.gemini = {
        ok: false,
        // Safe public summary — never expose raw API keys, full stack traces, or exact messages
        error: httpStatus ? `provider_error_${httpStatus}` : 'provider_unreachable',
      };
    }
  } else {
    results.gemini = { ok: false, error: 'adapter_not_configured' };
  }

  // ── Tavily canary ──────────────────────────────────────────────────────────
  if (adapters?.tavily && typeof adapters.tavily.search === 'function') {
    const start = Date.now();
    try {
      await adapters.tavily.search(['baatmeedar health check']);
      results.tavily = { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      const httpStatus =
        err?.status ||
        err?.statusCode ||
        (typeof err?.message === 'string'
          ? (err.message.match(/\b(400|401|403|404|429|500|503)\b/) || [])[0]
          : null);

      logger.error(
        {
          canary: 'tavily',
          providerHttpStatus: httpStatus ? Number(httpStatus) : undefined,
          err: err.message,
          latencyMs: Date.now() - start,
        },
        'Tavily canary probe failed — real outbound call unsuccessful'
      );
      results.tavily = {
        ok: false,
        error: httpStatus ? `provider_error_${httpStatus}` : 'provider_unreachable',
      };
    }
  } else {
    results.tavily = { ok: false, error: 'adapter_not_configured' };
  }

  return { ...results, ranAt: new Date().toISOString() };
}


// ─── Legacy key-presence helper (used for non-canary providers) ───────────────

/**
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

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * @param {object} deps
 * @param {object} [deps.db] — database pool for readiness check
 * @param {object} [deps.adapters] — external provider adapters
 * @param {object} [deps.config] — application configuration
 */
export function healthRoutes(deps = {}) {
  const router = Router();
  // isProd is explicitly set by the caller (e.g. from config) OR derived from NODE_ENV.
  // isTest is only used to skip canary calls when isProd was NOT explicitly forced to true.
  const isProd = deps.config?.isProd ?? (process.env.NODE_ENV === 'production');
  // If the caller has explicitly declared isProd: true we must run canary checks regardless
  // of NODE_ENV (this makes tests that inject isProd:true work correctly).
  const callerForcedProd = deps.config != null && deps.config.isProd === true;
  const isTest = !callerForcedProd && (deps.config?.isTest ?? (process.env.NODE_ENV === 'test'));

  // Per-router-instance canary cache — prevents test pollution between separate
  // express app instances that each call healthRoutes() with different adapters.
  const _canaryCache = { result: null, lastRunAt: 0 };

  async function getCachedCanary(adapters) {
    const now = Date.now();
    if (_canaryCache.result && now - _canaryCache.lastRunAt < CANARY_INTERVAL_MS) {
      return { ..._canaryCache.result, cached: true };
    }
    const fresh = await runCanaryChecks(adapters);
    _canaryCache.result = fresh;
    _canaryCache.lastRunAt = now;
    return { ...fresh, cached: false };
  }

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
   * In production: runs real canary calls to Gemini and Tavily.
   * In test/dev: falls back to key-presence check (no external calls).
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
      checks.database = isProd ? 'unavailable' : 'not_configured';
      if (isProd) ready = false;
    } else {
      checks.database = isProd ? 'unavailable' : 'not_configured';
      if (isProd) ready = false;
    }

    // 2. Provider checks
    const resendStatus = evaluateProviderStatus(deps.adapters?.resend);
    checks.providers = { resend: resendStatus };

    if (isProd && !isTest) {
      // ── Production path: real canary probes ──────────────────────────────
      try {
        const canary = await getCachedCanary(deps.adapters);
        checks.canary = canary;

        if (!canary.gemini?.ok) {
          ready = false;
          checks.providers.gemini = 'not_ready';
        } else {
          checks.providers.gemini = 'ready';
        }

        if (!canary.tavily?.ok) {
          ready = false;
          checks.providers.tavily = 'not_ready';
        } else {
          checks.providers.tavily = 'ready';
        }

        // Groq: key-presence only (no lightweight canary endpoint available)
        const groqStatus = evaluateProviderStatus(deps.adapters?.groq);
        checks.providers.groq = groqStatus;
        if (groqStatus !== 'configured') ready = false;

      } catch (canaryErr) {
        getLogger().error({ err: canaryErr.message }, 'Canary check runner threw unexpectedly');
        checks.canary = { error: 'canary_runner_failed' };
        ready = false;
      }
    } else {
      // ── Dev / test path: key-presence check (no external calls) ──────────
      checks.providers.gemini = evaluateProviderStatus(deps.adapters?.gemini);
      checks.providers.groq = evaluateProviderStatus(deps.adapters?.groq);
      checks.providers.tavily = evaluateProviderStatus(deps.adapters?.tavily);
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
