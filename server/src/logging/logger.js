/**
 * Baatmeedar — Structured Logger
 *
 * Pino-based structured logging with automatic redaction of sensitive fields.
 * Operational logs are separate from audit records (see auditLog.js).
 */

import pino from 'pino';

/* ─────────────────────────────────────────────────────────────
   Redaction paths — secrets are removed before serialization
   ───────────────────────────────────────────────────────────── */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-supabase-auth"]',
  'apiKey',
  'api_key',
  'password',
  'secret',
  'token',
  'service_role_key',
  'database_url',
  'connection_string',
];

/**
 * Creates the application logger.
 * @param {string} level — log level from config
 * @returns {pino.Logger}
 */
export function createLogger(level = 'info') {
  return pino({
    level,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req) => ({
        method: req.method,
        url: req.url,
        correlation_id: req.correlationId,
        // Intentionally omit headers beyond what pino-http provides
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // In production, use default JSON output for log aggregation
    // In development, pretty-print for readability
    ...(process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino/file', options: { destination: 1 } } }
      : {}),
  });
}

/** Singleton logger instance — initialized by server.js after config loads */
let _logger = null;

export function initLogger(level) {
  _logger = createLogger(level);
  return _logger;
}

export function getLogger() {
  if (!_logger) {
    // Fallback for early startup before config is loaded
    _logger = createLogger('info');
  }
  return _logger;
}
