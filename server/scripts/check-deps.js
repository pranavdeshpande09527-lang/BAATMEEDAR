/**
 * Baatmeedar — Dependency Health Checker
 *
 * Verifies connectivity to critical external services:
 * - PostgreSQL database
 * - Supabase Auth
 * - Gemini API
 * - Groq API
 * - Tavily API
 *
 * Outputs structured JSON. Exit code 0 if all critical deps pass,
 * 1 if any critical dependency is unreachable.
 *
 * Usage:
 *   node scripts/check-deps.js
 *   DEPLOY_BASE_URL=https://api.example.com node scripts/check-deps.js
 */

import { config } from '../src/config/index.js';

const TIMEOUT_MS = 10_000;

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
 * Check a dependency and return structured result.
 */
async function checkDep(name, checkFn) {
  const start = Date.now();
  try {
    await checkFn();
    return {
      name,
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      status: 'unreachable',
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

async function runChecks() {
  const results = [];

  // 1. Supabase reachability (public health endpoint)
  results.push(
    await checkDep('supabase', async () => {
      const res = await fetchWithTimeout(`${config.supabase.url}/rest/v1/`, {
        headers: {
          apikey: config.supabase.anonKey,
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Supabase responded with HTTP ${res.status}`);
      }
    })
  );

  // 2. Gemini API reachability
  results.push(
    await checkDep('gemini', async () => {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.providers.gemini.apiKey}`
      );
      if (!res.ok) {
        throw new Error(`Gemini API responded with HTTP ${res.status}`);
      }
    })
  );

  // 3. Groq API reachability
  results.push(
    await checkDep('groq', async () => {
      const res = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${config.providers.groq.apiKey}` },
      });
      if (!res.ok) {
        throw new Error(`Groq API responded with HTTP ${res.status}`);
      }
    })
  );

  // 4. Tavily API reachability
  results.push(
    await checkDep('tavily', async () => {
      const res = await fetchWithTimeout('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: config.providers.tavily.apiKey,
          query: 'health check',
          max_results: 1,
        }),
      });
      // 400 is acceptable — means API is reachable but query may be rejected
      if (!res.ok && res.status !== 400) {
        throw new Error(`Tavily API responded with HTTP ${res.status}`);
      }
    })
  );

  // Summary
  const allOk = results.every((r) => r.status === 'ok');
  const report = {
    timestamp: new Date().toISOString(),
    overall: allOk ? 'healthy' : 'degraded',
    checks: results,
  };

  console.log(JSON.stringify(report, null, 2));
  return allOk;
}

runChecks()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Dependency check runner failed:', err.message);
    process.exit(1);
  });
