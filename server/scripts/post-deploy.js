/**
 * Baatmeedar — Post-Deploy Verification Script
 *
 * Runs smoke checks against deployed or running backend:
 * 1. Health liveness check (/health/live)
 * 2. Health readiness check (/health/ready)
 * 3. Metrics endpoint check (/health/metrics)
 * 4. Submission validation check (/verify — invalid input → 400)
 *
 * Usage:
 *   node scripts/post-deploy.js                          # localhost:5000
 *   DEPLOY_BASE_URL=https://api.example.com node scripts/post-deploy.js
 */

const TIMEOUT_MS = 15_000;
const BASE_URL = process.env.DEPLOY_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Run a single smoke check.
 */
async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(JSON.stringify({ check: name, status: 'pass', latencyMs: ms }));
    return true;
  } catch (err) {
    const ms = Date.now() - start;
    console.error(JSON.stringify({ check: name, status: 'fail', latencyMs: ms, error: err.message }));
    return false;
  }
}

async function runPostDeployChecks() {
  console.log(JSON.stringify({ event: 'smoke_test_start', baseUrl: BASE_URL, timestamp: new Date().toISOString() }));

  const results = [];

  // 1. Liveness check
  results.push(
    await check('health_live', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/health/live`);
      if (!res.ok) throw new Error(`Liveness check returned HTTP ${res.status}`);
      const body = await res.json();
      if (body.status !== 'ok') throw new Error(`Liveness status: ${body.status}`);
    })
  );

  // 2. Readiness check
  results.push(
    await check('health_ready', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/health/ready`);
      if (!res.ok) throw new Error(`Readiness check returned HTTP ${res.status}`);
    })
  );

  // 3. Metrics endpoint
  results.push(
    await check('health_metrics', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/health/metrics`);
      if (!res.ok) throw new Error(`Metrics endpoint returned HTTP ${res.status}`);
    })
  );

  // 4. Input validation (invalid input should return 400)
  results.push(
    await check('verify_validation', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: 'invalid_type', content: '' }),
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 for invalid input, got ${res.status}`);
      }
    })
  );

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(
    JSON.stringify({
      event: 'smoke_test_complete',
      passed,
      total,
      result: allPassed ? 'SUCCESS' : 'FAILURE',
      timestamp: new Date().toISOString(),
    })
  );

  return allPassed;
}

runPostDeployChecks()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error(JSON.stringify({ event: 'smoke_test_error', error: err.message }));
    process.exit(1);
  });
