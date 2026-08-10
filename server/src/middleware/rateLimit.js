/**
 * Baatmeedar — Rate Limit Middleware
 *
 * Route-specific configurable rate limits.
 * - /verify — cost abuse protection
 * - Auth routes — brute-force protection with per-IP backoff
 */

import rateLimit from 'express-rate-limit';

/**
 * Creates the rate limiter for the /verify endpoint.
 * @param {{ max: number, windowMs: number }} opts
 */
export function verifyRateLimiter(opts) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Per-IP + per-account if authenticated
      const ip = req.ip;
      const userId = req.principal?.supabase_user_id;
      return userId ? `${ip}:${userId}` : ip;
    },
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many verification requests. Please try again later.',
        code: 'rate_limited',
        correlation_id: _req.correlationId,
      });
    },
  });
}

/**
 * Creates the rate limiter for auth-related endpoints.
 * @param {{ max: number, windowMs: number }} opts
 */
export function authRateLimiter(opts) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'rate_limited',
        correlation_id: _req.correlationId,
      });
    },
  });
}
