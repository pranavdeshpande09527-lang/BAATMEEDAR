/**
 * Baatmeedar — Telemetry Express Middleware
 *
 * Middleware recording HTTP request latency, route distribution, and HTTP status counts.
 */

import { telemetry } from '../logging/telemetry.js';

export function telemetryMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    telemetry.recordRequest(req.method, req.path, res.statusCode, durationMs);
  });

  next();
}
