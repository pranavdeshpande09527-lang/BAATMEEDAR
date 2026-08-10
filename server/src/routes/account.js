/**
 * Baatmeedar — Account Routes
 *
 * Authenticated user endpoints for run history and management.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { notFoundError } from '../schemas/errors.js';
import { auditLog } from '../logging/auditLog.js';
import { getLogger } from '../logging/logger.js';
import { DEFAULTS } from '../config/defaults.js';

/**
 * @param {object} deps
 * @param {object} deps.runRepository
 */
export function accountRoutes(deps = {}) {
  const router = Router();
  const { runRepository } = deps;

  // All account routes require authentication
  router.use(requireAuth());

  /**
   * GET /account/runs — Paginated list of user's runs.
   */
  router.get('/runs', async (req, res, next) => {
    try {
      const userId = req.principal.supabase_user_id;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(
        DEFAULTS.pagination.maxPageSize,
        Math.max(1, parseInt(req.query.page_size, 10) || DEFAULTS.pagination.defaultPageSize)
      );

      if (!runRepository) {
        return res.json({ runs: [], page, page_size: pageSize, total: 0 });
      }

      const result = await runRepository.listByOwner(
        { type: 'authenticated', id: userId },
        { page, pageSize }
      );

      res.json({
        runs: result.runs,
        page,
        page_size: pageSize,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /account/runs/:run_id — Request deletion of a run.
   * Preserves a redacted audit trail.
   */
  router.delete('/runs/:run_id', async (req, res, next) => {
    try {
      const userId = req.principal.supabase_user_id;
      const { run_id } = req.params;

      if (!runRepository) {
        throw notFoundError('Run not found.');
      }

      const deleted = await runRepository.requestDeletion(run_id, {
        type: 'authenticated',
        id: userId,
      });

      if (!deleted) {
        throw notFoundError('Run not found or not owned by this account.');
      }

      await auditLog({
        event: 'run_deletion_requested',
        run_id,
        actor: userId,
      });

      getLogger().info({ run_id, user_id: userId }, 'Run deletion requested');

      res.json({ deleted: true, run_id });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
