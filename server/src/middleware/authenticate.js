/**
 * Baatmeedar — Authentication Middleware
 *
 * Optional auth: extracts and verifies Supabase JWT from the
 * Authorization header. Sets req.principal for downstream use.
 * Does NOT block unauthenticated requests on public routes.
 */

import { createClient } from '@supabase/supabase-js';
import { getLogger } from '../logging/logger.js';

let _supabase = null;

/**
 * Initialize the Supabase client for auth verification.
 * Must be called after config is loaded.
 */
export function initAuth(supabaseUrl, supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Middleware: extracts Supabase JWT, verifies it, sets req.principal.
 * Non-blocking — if no token is present, req.principal stays null.
 */
export function authenticateMiddleware() {
  return async (req, _res, next) => {
    req.principal = null;

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    if (!token) return next();

    if (!_supabase) {
      getLogger().warn('Auth middleware called before Supabase client initialized');
      return next();
    }

    try {
      const { data, error } = await _supabase.auth.getUser(token);
      if (error || !data?.user) {
        getLogger().debug({ error: error?.message }, 'JWT verification failed');
        return next(); // Invalid token — treat as unauthenticated, don't block
      }

      // Set immutable principal context
      req.principal = Object.freeze({
        type: 'authenticated',
        supabase_user_id: data.user.id,
        email: data.user.email, // Minimal — only used for ownership, never logged
      });
    } catch (err) {
      getLogger().error({ err: err.message }, 'Auth verification exception');
      // Auth failure should not crash the request pipeline
    }

    next();
  };
}

/**
 * Route guard — requires authenticated principal.
 * Use on routes that must have a logged-in user.
 */
export function requireAuth() {
  return (req, res, next) => {
    if (!req.principal || req.principal.type !== 'authenticated') {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'authorization_denied',
        correlation_id: req.correlationId,
      });
    }
    next();
  };
}
