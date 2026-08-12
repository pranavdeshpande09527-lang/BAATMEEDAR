/**
 * Baatmeedar — Server Entry Point
 *
 * Initializes configuration, logger, auth client, db connection, and HTTP server.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 */

import { config } from './config/index.js';
import { initLogger, getLogger } from './logging/logger.js';
import { initAuth } from './middleware/authenticate.js';
import { createApp } from './app.js';
import { db } from './db/client.js';
import { runRepository } from './repositories/runRepository.js';
import { guestSessionRepository } from './repositories/guestSessionRepository.js';
import { orchestrator } from './services/orchestrator.js';

import { createAdapters } from './adapters/adapterFactory.js';

// Initialize logger
const logger = initLogger(config.logging.level);

// Initialize Supabase auth client
initAuth(config.supabase.url, config.supabase.anonKey);

const adapters = createAdapters(config);

// Assemble app
const app = createApp({
  config,
  db,
  runRepository,
  guestSessionRepository,
  orchestrator,
  adapters,
});

// Start HTTP server — bind to 0.0.0.0 so Render's load balancer can route traffic
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(
    { port: config.port, host: '0.0.0.0', env: config.env, cors: config.server.corsOrigins },
    'Baatmeedar backend service started'
  );
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received, closing server...');
  server.close(async () => {
    try {
      if (db?.pool) {
        await db.pool.end();
        logger.info('Database pool closed');
      }
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      logger.error({ err: err.message }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
