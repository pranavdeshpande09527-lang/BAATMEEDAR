/**
 * Baatmeedar — Error Response Schema & Factory
 *
 * Standardized error response shape for all API endpoints.
 * Expected errors get documented safe messages; unknown errors get
 * a generic correlation-ID response with no leaked internals.
 */

import { z } from 'zod';
import { ErrorCode } from './enums.js';

/* ─────────────────────────────────────────────────────────────
   Error response shape
   ───────────────────────────────────────────────────────────── */

/** Field-level validation error */
export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/** Standard API error response */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: ErrorCode,
  correlation_id: z.string(),
  fields: z.array(FieldErrorSchema).optional(),
});

/* ─────────────────────────────────────────────────────────────
   AppError — typed application error class
   ───────────────────────────────────────────────────────────── */

export class AppError extends Error {
  /**
   * @param {string} message — safe, user-facing message
   * @param {z.infer<typeof ErrorCode>} code — stable error category
   * @param {number} statusCode — HTTP status code
   * @param {Array<{field: string, message: string}>} [fields] — field-level errors
   * @param {object} [diagnostics] — internal details for server logs (never sent to client)
   */
  constructor(message, code, statusCode, fields = undefined, diagnostics = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    this.diagnostics = diagnostics;
  }

  /**
   * Build the safe client response (no internals leaked).
   * @param {string} correlationId
   */
  toResponse(correlationId) {
    const body = {
      error: this.message,
      code: this.code,
      correlation_id: correlationId,
    };
    if (this.fields?.length) {
      body.fields = this.fields;
    }
    return body;
  }
}

/* ─────────────────────────────────────────────────────────────
   Error factories
   ───────────────────────────────────────────────────────────── */

export function validationError(message, fields) {
  return new AppError(message, 'validation', 400, fields);
}

export function blockedUrlError(message) {
  return new AppError(message, 'blocked_url', 400);
}

export function notFoundError(message = 'Resource not found.') {
  return new AppError(message, 'not_found', 404);
}

export function authorizationError(message = 'Access denied.') {
  return new AppError(message, 'authorization_denied', 403);
}

export function rateLimitError(message = 'Too many requests. Please try again later.') {
  return new AppError(message, 'rate_limited', 429);
}

export function timeoutError(message = 'Request timed out.') {
  return new AppError(message, 'timeout', 504);
}

export function providerUnavailableError(message = 'A required service is temporarily unavailable.') {
  return new AppError(message, 'provider_unavailable', 503);
}

export function malformedOutputError(message = 'Unexpected response from a processing step.', diagnostics) {
  return new AppError(message, 'malformed_output', 502, undefined, diagnostics);
}

export function conflictError(message = 'Conflict with existing resource.') {
  return new AppError(message, 'conflict', 409);
}

export function internalError(diagnostics) {
  return new AppError(
    'An internal error occurred. Please try again or contact support.',
    'internal_fault',
    500,
    undefined,
    diagnostics
  );
}
