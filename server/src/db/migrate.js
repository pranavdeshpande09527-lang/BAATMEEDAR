/**
 * Baatmeedar — Migration Runner
 *
 * Runs raw SQL migration files against Postgres in sequential order.
 * Tracks applied migrations in `_migrations` table.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './client.js';
import { getLogger } from '../logging/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations() {
  const logger = getLogger();
  logger.info('Starting database migrations...');

  if (!db.pool) {
    logger.warn('No database pool available. Skipping migration runner.');
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows: applied } = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(applied.map((r) => r.name));

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedNames.has(file)) {
        logger.debug({ file }, 'Migration already applied');
        continue;
      }

      logger.info({ file }, 'Applying migration');
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      logger.info({ file }, 'Migration applied successfully');
    }

    await client.query('COMMIT');
    logger.info('All migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err: err.message }, 'Migration failed, transaction rolled back');
    throw err;
  } finally {
    client.release();
  }
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
