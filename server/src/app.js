/**
 * Baatmeedar — Express Application Assembly
 *
 * Assembles middleware stack in strict order per middleware.md specification:
 * 1. Request ID (correlation_id)
 * 2. Secure headers & CORS
 * 3. Body limits & JSON parsing
 * 4. Guest session (cookie management)
 * 5. Authenticate (optional JWT extraction)
 * 6. Routes (verify, health, auth, account)
 * 7. Error handler (error translation & redaction)
 */

import express from 'express';
import { requestIdMiddleware } from './middleware/requestId.js';
import { secureHeadersMiddleware } from './middleware/secureHeaders.js';
import { bodyLimitsMiddleware } from './middleware/bodyLimits.js';
import { guestSessionMiddleware } from './middleware/guestSession.js';
import { authenticateMiddleware } from './middleware/authenticate.js';
import { errorHandlerMiddleware } from './middleware/errorHandler.js';
import { verifyRateLimiter, authRateLimiter } from './middleware/rateLimit.js';
import { telemetryMiddleware } from './middleware/telemetryMiddleware.js';

import { healthRoutes } from './routes/health.js';
import { verifyRoutes } from './routes/verify.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/account.js';

/**
 * Express app factory for flexible testing and production assembly.
 *
 * @param {object} opts
 * @param {object} opts.config
 * @param {object} [opts.db]
 * @param {object} [opts.runRepository]
 * @param {object} [opts.guestSessionRepository]
 * @param {object} [opts.orchestrator]
 * @param {object} [opts.adapters]
 */
export function createApp(opts = {}) {
  const { config, db, runRepository, guestSessionRepository, orchestrator, adapters } = opts;
  const app = express();

  const corsOrigins = config?.server?.corsOrigins || ['http://localhost:5500'];
  const verifyLimitOpts = config?.server?.rateLimits?.verify || { max: 10, windowMs: 60000 };
  const authLimitOpts = config?.server?.rateLimits?.auth || { max: 5, windowMs: 60000 };
  const guestTtl = config?.guestSession?.ttlSeconds || 86400;

  // 1. Request ID
  app.use(requestIdMiddleware());

  // 2. Telemetry metrics recording
  app.use(telemetryMiddleware);

  // 3. Secure headers & CORS
  app.use(secureHeadersMiddleware(corsOrigins));

  // 4. Body limits
  app.use(bodyLimitsMiddleware());

  // 5. Guest session
  app.use(guestSessionMiddleware(guestTtl));

  // 6. Authentication (non-blocking JWT extraction)
  app.use(authenticateMiddleware());

  // Rate limiters
  const vRateLimiter = verifyRateLimiter(verifyLimitOpts);
  const aRateLimiter = authRateLimiter(authLimitOpts);

  // 7. Routes
  app.get('/', (_req, res) => {
    res.json({
      name: 'Baatmeedar API',
      description: 'The Gatekeeper of Truth verification service',
      version: '0.1.0',
      status: 'online',
      endpoints: {
        health: '/health/live',
        ready: '/health/ready',
        verify: '/verify',
        auth: '/auth',
        account: '/account',
      },
    });
  });

  app.use('/health', healthRoutes({ db, adapters }));
  app.use('/verify', verifyRoutes({ runRepository, orchestrator, verifyRateLimiter: vRateLimiter }));
  app.use('/auth', authRoutes({ guestSessionRepository, runRepository, authRateLimiter: aRateLimiter }));
  app.use('/account', accountRoutes({ runRepository }));

  // 8. Error handler
  app.use(errorHandlerMiddleware());

  return app;
}

