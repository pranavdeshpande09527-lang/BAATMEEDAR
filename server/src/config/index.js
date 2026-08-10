/**
 * Baatmeedar — Centralized Configuration
 *
 * Single point of environment variable access. All modules import config
 * from here; no direct process.env reads anywhere else in the codebase.
 *
 * Validates required vars at startup with actionable, non-sensitive errors.
 */

import 'dotenv/config';
import { z } from 'zod';
import { DEFAULTS } from './defaults.js';

/* ─────────────────────────────────────────────────────────────
   Schema — validates env vars and coerces types
   ───────────────────────────────────────────────────────────── */

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Supabase
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: 'SUPABASE_ANON_KEY is required' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' }),
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),

  // AI Providers
  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required' }),
  GROQ_API_KEY: z.string().min(1, { message: 'GROQ_API_KEY is required' }),

  // Research & Retrieval
  TAVILY_API_KEY: z.string().min(1, { message: 'TAVILY_API_KEY is required' }),
  YOUTUBE_API_KEY: z.string().default(''),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5500'),

  // Rate Limits
  RATE_LIMIT_VERIFY_MAX: z.coerce.number().int().positive().default(DEFAULTS.rateLimits.verify.max),
  RATE_LIMIT_VERIFY_WINDOW_MS: z.coerce.number().int().positive().default(DEFAULTS.rateLimits.verify.windowMs),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(DEFAULTS.rateLimits.auth.max),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(DEFAULTS.rateLimits.auth.windowMs),

  // Guest Sessions
  GUEST_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(DEFAULTS.guestSession.ttlSeconds),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/* ─────────────────────────────────────────────────────────────
   Parse and validate
   ───────────────────────────────────────────────────────────── */

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map(
    (i) => `  • ${i.path.join('.')}: ${i.message}`
  );
  // Actionable error — lists which vars are missing/invalid, but never shows values
  console.error(
    `\n❌ Configuration validation failed:\n${issues.join('\n')}\n\nCopy server/.env.example to server/.env and fill in the required values.\n`
  );
  process.exit(1);
}

const env = parsed.data;

/* ─────────────────────────────────────────────────────────────
   Typed config object
   ───────────────────────────────────────────────────────────── */

export const config = Object.freeze({
  env: env.NODE_ENV,
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProd: env.NODE_ENV === 'production',

  supabase: Object.freeze({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: env.DATABASE_URL,
  }),

  providers: Object.freeze({
    gemini: Object.freeze({ apiKey: env.GEMINI_API_KEY }),
    groq: Object.freeze({ apiKey: env.GROQ_API_KEY }),
    tavily: Object.freeze({ apiKey: env.TAVILY_API_KEY }),
    youtube: Object.freeze({ apiKey: env.YOUTUBE_API_KEY }),
  }),

  server: Object.freeze({
    corsOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    rateLimits: Object.freeze({
      verify: Object.freeze({
        max: env.RATE_LIMIT_VERIFY_MAX,
        windowMs: env.RATE_LIMIT_VERIFY_WINDOW_MS,
      }),
      auth: Object.freeze({
        max: env.RATE_LIMIT_AUTH_MAX,
        windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
      }),
    }),
  }),

  guestSession: Object.freeze({
    ttlSeconds: env.GUEST_SESSION_TTL_SECONDS,
  }),

  logging: Object.freeze({
    level: env.LOG_LEVEL,
  }),
});
