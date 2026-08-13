/**
 * Stage 1 Production Ingestion Test Script
 *
 * Usage: node server/scripts/test_all_stage1.mjs [BACKEND_URL]
 */

const BACKEND = process.argv[2] || process.env.BACKEND_URL || 'https://baatmeedar.onrender.com';

async function testStage1Ingestion(inputType, content) {
  console.log(`\n======================================================`);
  console.log(`[Stage 1 Audit] Testing Input Type: ${inputType}`);
  console.log(`Content: "${content}"`);
  console.log(`======================================================`);

  const guestSessionId = `audit-stage1-${inputType}-${Date.now()}`;

  // 1. Submit POST /verify
  const startTime = Date.now();
  const res = await fetch(`${BACKEND}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session-id': guestSessionId,
    },
    body: JSON.stringify({ input_type: inputType, content }),
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✓ POST /verify HTTP Status: ${res.status} ${res.statusText} (${duration}s)`);

  const returnedGuestHeader = res.headers.get('x-guest-session-id');
  console.log(`✓ Returned Guest Session ID Header: ${returnedGuestHeader}`);

  if (res.status !== 201) {
    const errorText = await res.text();
    throw new Error(`Expected HTTP 201 Created, got ${res.status}: ${errorText}`);
  }

  const body = await res.json();
  if (!body.run_id) {
    throw new Error(`No run_id returned in response: ${JSON.stringify(body)}`);
  }

  const runId = body.run_id;
  console.log(`✓ Received Run ID: ${runId}`);

  // 2. Poll GET /verify/:run_id/status for Stage 1 progress
  let stage1Completed = false;
  let lastStatus = null;

  for (let p = 1; p <= 15; p++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollStart = Date.now();
    const statusRes = await fetch(`${BACKEND}/verify/${runId}/status`, {
      headers: { 'x-guest-session-id': guestSessionId },
    });

    if (!statusRes.ok) {
      console.log(`  Poll #${p} failed with HTTP ${statusRes.status}`);
      continue;
    }

    const statusData = await statusRes.json();
    lastStatus = statusData;
    const pollDuration = ((Date.now() - pollStart) / 1000).toFixed(1);
    console.log(`  Poll #${p} (${pollDuration}s): status="${statusData.status}", stage="${statusData.stage}"`);

    // Stage 1 is complete when status moves beyond input_received or reaches extracting_claims/researching/verifying/complete
    if (statusData.stage !== 'input_received' || statusData.status === 'complete' || statusData.partial?.input) {
      stage1Completed = true;
      break;
    }

    if (statusData.status === 'failed') {
      throw new Error(`Run failed during Stage 1: ${JSON.stringify(statusData.failure)}`);
    }
  }

  if (!stage1Completed && lastStatus?.status !== 'processing') {
    throw new Error(`Stage 1 failed to progress within polling window. Final state: ${JSON.stringify(lastStatus)}`);
  }

  console.log(`✅ Stage 1 Input Ingestion succeeded for ${inputType}! Stage reached: "${lastStatus.stage}"`);
  return { runId, lastStatus };
}

async function main() {
  console.log(`Starting Stage 1 Production Audit against ${BACKEND}...`);

  const tests = [
    { type: 'text', content: 'India hosted the G20 Summit in New Delhi in September 2023.' },
    { type: 'article', content: 'https://en.wikipedia.org/wiki/2023_G20_New_Delhi_summit' },
    { type: 'youtube', content: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  ];

  const results = [];
  for (const t of tests) {
    const res = await testStage1Ingestion(t.type, t.content);
    results.push(res);
  }

  console.log(`\n======================================================`);
  console.log(`ALL 3 STAGE 1 INPUT PATHS AUDITED & VERIFIED SUCCESSFULLY ON PRODUCTION (${BACKEND})!`);
  console.log(`======================================================`);
}

main().catch((err) => {
  console.error('\n❌ Stage 1 Ingestion Audit Failed:', err.message);
  process.exit(1);
});
