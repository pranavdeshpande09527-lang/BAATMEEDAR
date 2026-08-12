const BACKEND = process.env.BACKEND_URL || 'http://localhost:10000';

async function testLiveVercelWorkflow(inputType, content) {
  console.log(`\n======================================================`);
  console.log(`Testing Live Pipeline: inputType=${inputType}`);
  console.log(`Content: "${content}"`);
  console.log(`======================================================`);

  const guestSessionId = `vercel-test-${Date.now()}`;

  // 1. Submit
  console.log('[1/3] Submitting to live backend...');
  const res = await fetch(`${BACKEND}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session-id': guestSessionId,
    },
    body: JSON.stringify({ input_type: inputType, content }),
  });

  const body = await res.json();
  console.log('  Submit Response:', body);

  if (!res.ok || !body.run_id) {
    throw new Error(`Submission failed with status ${res.status}: ${JSON.stringify(body)}`);
  }

  const runId = body.run_id;
  console.log(`  Run ID created: ${runId}`);

  // 2. Poll Status
  console.log('[2/3] Polling run status...');
  let completed = false;

  for (let pollCount = 1; pollCount <= 60; pollCount++) {
    await new Promise((r) => setTimeout(r, 4000));

    const statusRes = await fetch(`${BACKEND}/verify/${runId}/status`, {
      headers: { 'x-guest-session-id': guestSessionId },
    });
    const statusData = await statusRes.json();
    console.log(`  Poll ${pollCount}: status="${statusData.status}", stage="${statusData.stage}"`);

    if (statusData.status === 'complete') {
      completed = true;
      break;
    }

    if (statusData.status === 'failed') {
      console.error('  Run Failed with details:', statusData.failure);
      throw new Error(`Run failed: ${JSON.stringify(statusData.failure)}`);
    }
  }

  if (!completed) {
    throw new Error('Verification timed out after 4 minutes');
  }

  // 3. Fetch Full Results
  console.log('[3/3] Fetching complete 5-stage results...');
  const resultsRes = await fetch(`${BACKEND}/verify/${runId}/results`, {
    headers: { 'x-guest-session-id': guestSessionId },
  });
  const results = await resultsRes.json();

  console.log('\n--- VERIFIED STAGE RESULTS ---');
  console.log('Stage 1 (Input):', results.input?.type, results.input?.raw_text_preview?.slice(0, 100));
  console.log('Stage 2 (Claims):', results.claims?.map((c) => ({ id: c.id, text: c.text, domain: c.domain })));
  console.log('Stage 2 (Removed Opinions):', results.removed_opinions);
  console.log('Stage 3 (Research Sources Count):', results.research?.map((r) => r.sources?.length));
  console.log('Stage 4 & 5 (Verdicts):', results.verdicts?.map((v) => ({
    claim_id: v.claim_id,
    grok: v.grok?.verdict,
    gemini: v.gemini?.verdict,
    final: v.final?.verdict,
    rationale: v.final?.rationale,
  })));

  return results;
}

async function main() {
  console.log('Starting Live Deployed Baatmeedar Verification...');

  // Test Direct Text Statement
  await testLiveVercelWorkflow('text', 'India won the cricket match yesterday.');

  console.log('\n✅ ALL LIVE DEPLOYED VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('\n❌ Live Verification Test Failed:', err.message);
  process.exit(1);
});
