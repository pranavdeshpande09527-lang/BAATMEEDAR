/**
 * Baatmeedar — Database Client
 *
 * Provides PostgreSQL connection pooling via `pg` and direct Supabase admin client.
 * Server-only module — credentials remain strictly server-side.
 */

import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { getLogger } from '../logging/logger.js';

let pool = null;

// Initialize Postgres connection pool if DATABASE_URL is present
if (config.supabase.databaseUrl) {
  pool = new Pool({
    connectionString: config.supabase.databaseUrl,
    ssl: config.isProd || config.supabase.databaseUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    getLogger().error({ err: err.message }, 'Unexpected PostgreSQL pool error');
  });
}

// Supabase Admin Client (bypasses RLS using Service Role Key)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

/**
 * DB interface helper for SQL queries
 */
export const db = {
  pool,
  /**
   * Execute a query against PostgreSQL pool.
   * @param {string} text
   * @param {any[]} [params]
   */
  async query(text, params) {
    if (!pool) {
      throw new Error('Database connection pool is not configured.');
    }
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      getLogger().trace({ text, duration, rows: res.rowCount }, 'Executed DB query');
      return res;
    } catch (err) {
      getLogger().error({ err: err.message, text }, 'Database query error');
      throw err;
    }
  },
  /**
   * Acquire a transaction client from the pool.
   */
  async getClient() {
    if (!pool) {
      throw new Error('Database connection pool is not configured.');
    }
    return pool.connect();
  },
};
