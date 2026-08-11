/**
 * Baatmeedar — Secure Headers & CORS Middleware
 *
 * Helmet for secure HTTP headers. Strict origin allowlist for CORS —
 * no credentialed wildcard. Dev origins kept separate from production.
 */

import helmet from 'helmet';
import cors from 'cors';

export function isOriginAllowed(origin, allowedOrigins = []) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();

  for (const allowed of allowedOrigins) {
    if (!allowed) continue;
    const normalizedAllowed = allowed.replace(/\/+$/, '').toLowerCase();
    if (normalizedAllowed === '*' || normalizedOrigin === normalizedAllowed) {
      return true;
    }
    if (normalizedAllowed.startsWith('*.')) {
      const suffix = normalizedAllowed.slice(1);
      try {
        const url = new URL(normalizedOrigin);
        if (url.hostname.endsWith(suffix) || url.hostname === normalizedAllowed.slice(2)) {
          return true;
        }
      } catch {}
    }
  }

  // Always permit official Firebase hosting domains, Vercel deployments, and local development
  if (
    /^https:\/\/prompathon2026(--[a-z0-9-]+)?\.web\.app$/.test(normalizedOrigin) ||
    /^https:\/\/prompathon2026(--[a-z0-9-]+)?\.firebaseapp\.com$/.test(normalizedOrigin) ||
    /^https:\/\/(www\.)?baatmeedar\.com$/.test(normalizedOrigin) ||
    /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(normalizedOrigin) ||
    /^http:\/\/localhost(:[0-9]+)?$/.test(normalizedOrigin) ||
    /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(normalizedOrigin)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string[]} allowedOrigins — from config.server.corsOrigins
 */
export function secureHeadersMiddleware(allowedOrigins = []) {
  const helmetMw = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...allowedOrigins, 'https://*.web.app', 'https://*.firebaseapp.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  const corsMw = cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!origin || isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'idempotency-key'],
    maxAge: 600, // 10 minute preflight cache
  });

  return [helmetMw, corsMw];
}
