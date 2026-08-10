/**
 * Baatmeedar — Body Limits Middleware
 *
 * Enforces JSON content limits BEFORE parsing expensive bodies.
 * Rejects oversized payloads early to prevent abuse.
 */

import express from 'express';
import { DEFAULTS } from '../config/defaults.js';

export function bodyLimitsMiddleware() {
  return express.json({
    limit: DEFAULTS.body.jsonLimitBytes,
    type: 'application/json',
  });
}
