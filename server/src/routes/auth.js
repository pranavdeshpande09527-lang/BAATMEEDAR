/**
 * Baatmeedar — Auth Routes
 *
 * Account linking and authenticated endpoints.
 * Requires both valid Supabase session + guest session proof.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { LinkGuestRunsRequestSchema } from '../schemas/auth.js';
import { validationError, authorizationError } from '../schemas/errors.js';
import { auditLog } from '../logging/auditLog.js';
import { getLogger } from '../logging/logger.js';

/**
 * @param {object} deps
 * @param {object} deps.guestSessionRepository
 * @param {object} deps.runRepository
 * @param {Function} deps.authRateLimiter
 */
export function authRoutes(deps = {}) {
  const router = Router();
  const { guestSessionRepository, runRepository, authRateLimiter: rateLimiter } = deps;

  const middleware = [requireAuth()];
  if (rateLimiter) middleware.unshift(rateLimiter);

  /**
   * POST /auth/link-guest-runs
   *
   * Links eligible guest runs to the authenticated account.
   * Requires both:
   * 1. Valid Supabase JWT (authenticated principal)
   * 2. Guest session cookie (proof of guest ownership)
   *
   * Atomic, audited, idempotent.
   */
  router.post('/link-guest-runs', ...middleware, async (req, res, next) => {
    try {
      // Validate request body
      const bodyResult = LinkGuestRunsRequestSchema.safeParse(req.body);
      if (!bodyResult.success) {
        const fields = bodyResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw validationError('Invalid link request.', fields);
      }

      // Must have guest session proof
      const guestSessionId = req.guestSession?.id || parseGuestCookie(req);
      if (!guestSessionId) {
        throw authorizationError(
          'Guest session proof required. Sign in from the same browser where guest runs were created.'
        );
      }

      const userId = req.principal.supabase_user_id;
      const requestedRunIds = bodyResult.data.run_ids;

      if (!guestSessionRepository || !runRepository) {
        return res.json({ linked_ids: [], skipped: requestedRunIds.map((id) => ({ run_id: id, reason: 'not_found' })) });
      }

      // Perform atomic link
      const result = await guestSessionRepository.linkToAccount(
        guestSessionId,
        userId,
        requestedRunIds
      );

      // Audit the link event
      await auditLog({
        event: 'account_linked',
        actor: userId,
        details: {
          guest_session_id: guestSessionId,
          linked_count: result.linked_ids.length,
          skipped_count: result.skipped.length,
        },
      });

      getLogger().info(
        { user_id: userId, linked: result.linked_ids.length, skipped: result.skipped.length },
        'Guest runs linked to account'
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Fallback: try to parse guest session cookie from request.
 * The guest session middleware may not set req.guestSession for
 * authenticated users, but we still need the cookie for linking proof.
 */
function parseGuestCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith('baatmeedar_guest='));
  return match ? match.split('=')[1]?.trim() : null;
}
