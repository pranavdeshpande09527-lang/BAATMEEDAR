/**
 * Baatmeedar — Request ID Middleware
 *
 * Generates a unique correlation ID per request. Attaches it to req
 * and the response header for tracing across logs and error responses.
 */

import { randomUUID } from 'node:crypto';

const HEADER_NAME = 'x-correlation-id';

export function requestIdMiddleware() {
  return (req, _res, next) => {
    // Accept an existing correlation ID from trusted proxy, or generate one
    const correlationId = req.headers[HEADER_NAME] || randomUUID();
    req.correlationId = correlationId;
    _res.setHeader(HEADER_NAME, correlationId);
    next();
  };
}
