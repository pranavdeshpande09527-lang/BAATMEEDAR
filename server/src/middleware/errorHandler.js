/**
 * Baatmeedar — Error Handler Middleware
 *
 * Final middleware in the chain. Translates expected AppErrors into
 * documented safe responses. Unknown errors become generic
 * correlation-ID responses with no leaked internals.
 */

import { AppError } from '../schemas/errors.js';
import { getLogger } from '../logging/logger.js';
import { redact } from '../logging/redactor.js';

/**
 * Express error-handling middleware (4 args).
 */
export function errorHandlerMiddleware() {
  return (err, req, res, _next) => {
    const correlationId = req.correlationId || 'unknown';
    const logger = getLogger();

    // Handle CORS errors from the cors middleware
    if (err.message?.includes('not allowed by CORS')) {
      logger.warn({ correlation_id: correlationId, origin: req.headers.origin }, 'CORS rejection');
      return res.status(403).json({
        error: 'Origin not allowed.',
        code: 'authorization_denied',
        correlation_id: correlationId,
      });
    }

    // Handle JSON parse errors
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'Invalid JSON in request body.',
        code: 'validation',
        correlation_id: correlationId,
      });
    }

    // Handle payload too large
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Request body exceeds size limit.',
        code: 'validation',
        correlation_id: correlationId,
      });
    }

    // Known application errors
    if (err instanceof AppError) {
      // Log diagnostics server-side (redacted)
      if (err.diagnostics) {
        logger.error(
          { correlation_id: correlationId, code: err.code, diagnostics: redact(err.diagnostics) },
          `AppError: ${err.message}`
        );
      } else {
        logger.warn({ correlation_id: correlationId, code: err.code }, `AppError: ${err.message}`);
      }

      return res.status(err.statusCode).json(err.toResponse(correlationId));
    }

    // Unknown / unexpected errors — generic response, detailed server log
    logger.error(
      {
        correlation_id: correlationId,
        err: err.message,
        // Never log full stack to structured output in production
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      'Unhandled error'
    );

    res.status(500).json({
      error: 'An internal error occurred. Please try again or contact support.',
      code: 'internal_fault',
      correlation_id: correlationId,
    });
  };
}
