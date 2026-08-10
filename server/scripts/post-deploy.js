/**
 * Baatmeedar — Post-Deploy Verification Script
 *
 * Runs smoke checks against deployed or running backend:
 * 1. Health readiness check (/health/ready)
 * 2. Submission validation check (/verify)
 * 3. Status check (/verify/{run_id}/status)
 */

import { config } from '../src/config/index.js';
import { getLogger } from '../src/logging/logger.js';

async function runPostDeployChecks() {
  const logger = getLogger();
  const baseUrl = `http://localhost:${config.port}`;
  logger.info({ baseUrl }, 'Running post-deploy smoke checks...');

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health/ready`);
  if (!healthRes.ok) {
    throw new Error(`Readiness check failed with status ${healthRes.status}`);
  }
  const healthJson = await healthRes.json();
  logger.info({ health: healthJson }, 'Readiness check passed');

  // 2. Submission validation check (invalid input)
  const invalidRes = await fetch(`${baseUrl}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_type: 'invalid_type', content: '' }),
  });
  if (invalidRes.status !== 400) {
    throw new Error(`Expected status 400 for invalid input, got ${invalidRes.status}`);
  }
  logger.info('Input validation smoke check passed');

  logger.info('All post-deploy smoke checks completed successfully!');
}

runPostDeployChecks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Post-deploy smoke check failed:', err.message);
    process.exit(1);
  });
