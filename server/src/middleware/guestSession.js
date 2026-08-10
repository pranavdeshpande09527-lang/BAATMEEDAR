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

    // Try to read existing guest session cookie
    const existingId = parseCookie(req.headers.cookie, COOKIE_NAME);

    if (existingId) {
      req.guestSession = {
        id: existingId,
        isNew: false,
      };
      return next();
    }

    // Create new guest session
    const sessionId = randomUUID();
    const maxAge = ttl * 1000; // ms

    _res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // HTTPS in prod/staging
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

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
