/**
 * Baatmeedar — Guest Session Middleware
 *
 * Creates/validates guest sessions via HttpOnly, Secure, SameSite cookie.
 * Server-generated opaque session ID — never relies on user-supplied owner ID.
 */

import { randomUUID } from 'node:crypto';
import { DEFAULTS } from '../config/defaults.js';
import { getLogger } from '../logging/logger.js';

const COOKIE_NAME = DEFAULTS.guestSession.cookieName;

/**
 * Middleware: reads or creates a guest session cookie.
 * Sets req.guestSession with session_id.
 */
export function guestSessionMiddleware(ttlSeconds) {
  const ttl = ttlSeconds || DEFAULTS.guestSession.ttlSeconds;

  return (req, _res, next) => {
    req.guestSession = null;

    // If user is authenticated, skip guest session
    if (req.principal?.type === 'authenticated') {
      return next();
    }

    // Try to read existing guest session cookie or header
    const headerId = typeof req.headers['x-guest-session-id'] === 'string' ? req.headers['x-guest-session-id'].trim() : null;
    const existingId = parseCookie(req.headers.cookie, COOKIE_NAME) || (headerId || null);

    if (existingId) {
      req.guestSession = {
        id: existingId,
        isNew: false,
      };
      _res.setHeader('x-guest-session-id', existingId);
      return next();
    }

    // Create new guest session
    const sessionId = randomUUID();
    const maxAge = ttl * 1000; // ms
    const isDev = process.env.NODE_ENV === 'development';

    _res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: !isDev, // Must be true for sameSite='none' in production/staging
      sameSite: isDev ? 'lax' : 'none',
      maxAge,
      path: '/',
    });
    _res.setHeader('x-guest-session-id', sessionId);

    req.guestSession = {
      id: sessionId,
      isNew: true,
    };

    getLogger().debug({ guest_session_id: sessionId }, 'New guest session created');
    next();
  };
}

/**
 * Simple cookie parser — avoids adding cookie-parser dependency.
 * Extracts a single cookie value by name.
 */
function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.split('=')[1]?.trim() : null;
}
