/**
 * Baatmeedar — Submission Validation Schema
 *
 * Validates POST /verify request body at the route boundary.
 * Frontend validation is a usability aid only; this is the real boundary.
 */

import { z } from 'zod';
import { InputType } from './enums.js';
import { DEFAULTS } from '../config/defaults.js';

/* ─────────────────────────────────────────────────────────────
   Control character regex — rejects null bytes, C0/C1 except
   whitespace (tab, newline, carriage return)
   ───────────────────────────────────────────────────────────── */
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;

/* ─────────────────────────────────────────────────────────────
   URL validation helpers
   ───────────────────────────────────────────────────────────── */

/**
 * Validates a URL string using the built-in URL parser.
 * Rejects non-HTTPS schemes.
 */
function isValidHttpsUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks if a URL hostname is in the allowed YouTube hostnames list.
 */
function isYoutubeHostname(str) {
  try {
    const url = new URL(str);
    return DEFAULTS.youtube.allowedHostnames.includes(url.hostname);
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   Text content validation
   ───────────────────────────────────────────────────────────── */
const TextContent = z
  .string()
  .min(DEFAULTS.input.minTextLength, {
    message: `Statement must be at least ${DEFAULTS.input.minTextLength} character(s).`,
  })
  .max(DEFAULTS.input.maxTextLength, {
    message: `Statement exceeds ${DEFAULTS.input.maxTextLength} character limit.`,
  })
  .refine((s) => s.trim().length > 0, {
    message: 'Statement cannot be blank or whitespace only.',
  })
  .refine((s) => !CONTROL_CHAR_REGEX.test(s), {
    message: 'Statement contains invalid control characters.',
  });

/* ─────────────────────────────────────────────────────────────
   URL content validation (article + youtube)
   ───────────────────────────────────────────────────────────── */
const UrlContent = z
  .string()
  .min(1, { message: 'URL is required.' })
  .max(DEFAULTS.input.maxUrlLength, {
    message: `URL exceeds ${DEFAULTS.input.maxUrlLength} character limit.`,
  })
  .refine((s) => s.trim().length > 0, {
    message: 'URL cannot be blank.',
  })
  .refine((s) => isValidHttpsUrl(s.trim()), {
    message: 'URL must use HTTPS protocol (e.g. https://example.com).',
  });

/* ─────────────────────────────────────────────────────────────
   Full submission schema with discriminated union
   ───────────────────────────────────────────────────────────── */
export const SubmissionSchema = z
  .object({
    input_type: InputType,
    content: z.string(),
  })
  .strict() // reject unknown fields
  .superRefine((data, ctx) => {
    const type = data.input_type;
    const content = data.content;

    if (type === 'text') {
      const result = TextContent.safeParse(content);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({ ...issue, path: ['content'] });
        });
      }
      return;
    }

    // Article or YouTube — validate as URL first
    const urlResult = UrlContent.safeParse(content);
    if (!urlResult.success) {
      urlResult.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ['content'] });
      });
      return;
    }

    // YouTube-specific hostname validation
    if (type === 'youtube' && !isYoutubeHostname(content.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...).',
        path: ['content'],
      });
    }
  });

/**
 * Parses and validates a submission request body.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateSubmission(body) {
  const result = SubmissionSchema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { success: false, errors };
}
