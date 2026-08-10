/**
 * Baatmeedar — Secure Headers & CORS Middleware
 *
 * Helmet for secure HTTP headers. Strict origin allowlist for CORS —
 * no credentialed wildcard. Dev origins kept separate from production.
 */

import helmet from 'helmet';
import cors from 'cors';

/**
 * @param {string[]} allowedOrigins — from config.server.corsOrigins
 */
export function secureHeadersMiddleware(allowedOrigins) {
  const helmetMw = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  const corsMw = cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600, // 10 minute preflight cache
  });

  return [helmetMw, corsMw];
}
