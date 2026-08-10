/**
 * Baatmeedar — Auth Schemas
 *
 * Typed contracts for guest sessions, authenticated owners, run ownership,
 * and the guest-to-account linking flow per authentication.md.
 */

import { z } from 'zod';
import { OwnerType } from './enums.js';

/* ─────────────────────────────────────────────────────────────
   Guest Session
   ───────────────────────────────────────────────────────────── */
export const GuestSessionSchema = z.object({
  guest_session_id: z.string().min(1),
  expires_at: z.string().datetime(),
  allowed_run_ids: z.array(z.string()).default([]),
});

/* ─────────────────────────────────────────────────────────────
   Authenticated Owner
   ───────────────────────────────────────────────────────────── */
export const AuthenticatedOwnerSchema = z.object({
  supabase_user_id: z.string().uuid(),
});

/* ─────────────────────────────────────────────────────────────
   Run Owner — guest OR authenticated, never both ambiguously
   ───────────────────────────────────────────────────────────── */
export const RunOwnerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('guest'),
    guest_session_id: z.string().min(1),
  }),
  z.object({
    type: z.literal('authenticated'),
    supabase_user_id: z.string().uuid(),
  }),
]);

/* ─────────────────────────────────────────────────────────────
   Link Guest Runs Request
   ───────────────────────────────────────────────────────────── */
export const LinkGuestRunsRequestSchema = z.object({
  /** IDs of guest runs the user wants to attach to their account */
  run_ids: z.array(z.string().uuid()).min(1, {
    message: 'At least one run ID is required.',
  }),
});

/* ─────────────────────────────────────────────────────────────
   Link Guest Runs Result
   ───────────────────────────────────────────────────────────── */
export const LinkGuestRunsResultSchema = z.object({
  linked_ids: z.array(z.string()),
  skipped: z.array(
    z.object({
      run_id: z.string(),
      reason: z.enum([
        'not_found',
        'not_owned_by_guest_session',
        'already_linked',
        'expired',
      ]),
    })
  ),
});
