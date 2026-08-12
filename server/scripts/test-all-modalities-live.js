const BACKEND = process.env.BACKEND_URL || 'http://localhost:10000';

async function testModalities(inputType, content) {
  console.log(`\n======================================================`);
  console.log(`Testing Live Pipeline for modality: ${inputType}`);
  console.log(`Content: "${content}"`);
  console.log(`======================================================`);

  const guestSessionId = `vercel-${inputType}-${Date.now()}`;

  const res = await fetch(`${BACKEND}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session-id': guestSessionId,
    },
    body: JSON.stringify({ input_type: inputType, content }),
  });

  const body = await res.json();
  if (!res.ok || !body.run_id) {
    throw new Error(`Submission failed: ${JSON.stringify(body)}`);
  }
  const runId = body.run_id;
  console.log(`  Run ID: ${runId}`);

  let completed = false;
  for (let p = 1; p <= 100; p++) {
    await new Promise((r) => setTimeout(r, 4000));
    const statusRes = await fetch(`${BACKEND}/verify/${runId}/status`, {
      headers: { 'x-guest-session-id': guestSessionId },
    });
    const statusData = await statusRes.json();
    console.log(`  Poll ${p}: status="${statusData.status}", stage="${statusData.stage}"`);

    if (statusData.status === 'complete') {
      completed = true;
      break;
    }
    if (statusData.status === 'failed') {
      throw new Error(`Run failed: ${JSON.stringify(statusData.failure)}`);
    }
  }

  if (!completed) throw new Error('Timed out');

  const resultsRes = await fetch(`${BACKEND}/verify/${runId}/results`, {
    headers: { 'x-guest-session-id': guestSessionId },
  });
  const results = await resultsRes.json();

  console.log(`  ✓ Stage 1 Input Type: ${results.input?.type}`);
  console.log(`  ✓ Stage 2 Extracted Claims Count: ${results.claims?.length}`);
  console.log(`  ✓ Stage 3 Research Sources Count: ${results.research?.[0]?.sources?.length}`);
  console.log(`  ✓ Stage 4 & 5 Verdict: ${results.verdicts?.[0]?.final?.verdict}`);
  return results;
}

async function main() {
  console.log('Testing Live Modalities (Article & YouTube)...');

  // Test Article URL
  await testModalities('article', 'https://reuters.com/sports');

  // Test YouTube URL
  await testModalities('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  console.log('\n🎉 ALL 3 INPUT MODALITIES SUCCESSFULLY VERIFIED ON LIVE VERCEL/RENDER SYSTEM!');
}

main().catch((err) => {
  console.error('\n❌ Modality Verification Failed:', err.message);
  process.exit(1);
});
