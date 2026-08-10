/**
 * Baatmeedar — Verify Routes
 *
 * Core verification API preserving the existing client contract:
 *   POST /verify                   → { run_id }
 *   GET  /verify/:run_id/status    → { status, stage, partial? }
 *   GET  /verify/:run_id/results   → full results
 *
 * Ownership check: guest session or authenticated user must own the run.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateSubmission } from '../schemas/submission.js';
import { validationError, notFoundError, authorizationError } from '../schemas/errors.js';
import { auditLog } from '../logging/auditLog.js';
import { getLogger } from '../logging/logger.js';

/**
 * @param {object} deps
 * @param {object} deps.runRepository — persistence layer
 * @param {object} deps.orchestrator — workflow orchestrator
 * @param {Function} deps.verifyRateLimiter — rate limiter middleware
 */
export function verifyRoutes(deps = {}) {
  const router = Router();
  const { runRepository, orchestrator, verifyRateLimiter: rateLimiter } = deps;

  /* ─────────────────────────────────────────────────────────
     POST /verify — Submit a verification request
     ───────────────────────────────────────────────────────── */
  const postMiddleware = rateLimiter ? [rateLimiter] : [];

  router.post('/', ...postMiddleware, async (req, res, next) => {
    try {
      // Validate input at the route boundary
      const validation = validateSubmission(req.body);
      if (!validation.success) {
        throw validationError('Invalid submission.', validation.errors);
      }

      const { input_type, content } = validation.data;
      const runId = randomUUID();

      // Determine owner
      const owner = req.principal
        ? { type: 'authenticated', id: req.principal.supabase_user_id }
        : req.guestSession
          ? { type: 'guest', id: req.guestSession.id }
          : null;

      if (!owner) {
        throw authorizationError('A valid session is required to submit verifications.');
      }

      // Create the run in persistence
      if (runRepository) {
        await runRepository.create({
          id: runId,
          input_type,
          content,
          owner_type: owner.type,
          owner_id: owner.id,
          idempotency_key: req.headers['idempotency-key'] || null,
        });
      }

      // Audit
      await auditLog({
        event: 'run_created',
        run_id: runId,
        actor: owner.id,
        details: { input_type, owner_type: owner.type },
      });

      // Start async orchestration (non-blocking)
      if (orchestrator) {
        orchestrator.startRun(runId, { input_type, content }).catch((err) => {
          getLogger().error({ run_id: runId, err: err.message }, 'Orchestration failed to start');
        });
      }

      getLogger().info({ run_id: runId, input_type, owner_type: owner.type }, 'Verification submitted');

      res.status(201).json({ run_id: runId });
    } catch (err) {
      next(err);
    }
  });

  /* ─────────────────────────────────────────────────────────
     GET /verify/:run_id/status — Poll for run status
     ───────────────────────────────────────────────────────── */
  router.get('/:run_id/status', async (req, res, next) => {
    try {
      const { run_id } = req.params;
      const owner = getOwner(req);

      if (!runRepository) {
        // No persistence layer — return mock-like response for development
        return res.json({ status: 'processing', stage: 'accepted' });
      }

      const run = await runRepository.getStatus(run_id, owner);
      if (!run) {
        throw notFoundError('Run not found.');
      }

      const response = {
        status: run.status,
        stage: run.current_stage,
      };

      if (run.partial) {
        response.partial = run.partial;
      }

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  /* ─────────────────────────────────────────────────────────
     GET /verify/:run_id/results — Fetch full results
     ───────────────────────────────────────────────────────── */
  router.get('/:run_id/results', async (req, res, next) => {
    try {
      const { run_id } = req.params;
      const owner = getOwner(req);

      if (!runRepository) {
        return res.status(404).json({
          error: 'Results not available.',
          code: 'not_found',
          correlation_id: req.correlationId,
        });
      }

      const results = await runRepository.getResults(run_id, owner);
      if (!results) {
        throw notFoundError('Results not found or run is not complete.');
      }

      res.json(results);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/* ─────────────────────────────────────────────────────────────
   Helper — extract owner from request
   ───────────────────────────────────────────────────────────── */
function getOwner(req) {
  if (req.principal?.type === 'authenticated') {
    return { type: 'authenticated', id: req.principal.supabase_user_id };
  }
  if (req.guestSession) {
    return { type: 'guest', id: req.guestSession.id };
  }
  return null;
}
