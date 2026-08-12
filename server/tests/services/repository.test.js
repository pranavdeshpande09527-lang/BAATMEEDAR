import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runRepository } from '../../src/repositories/runRepository.js';
import { db } from '../../src/db/client.js';

describe('RunRepository & Persistence Safety', () => {
  const owner = { type: 'guest', id: 'repo-test-session' };

  beforeEach(async () => {
    await runRepository.reset();
  });

  it('uses in-memory store cleanly when db.pool is null', async () => {
    const runId = 'test-memory-run-001';
    const record = await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'Sample statement for in-memory repository.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    expect(record.id).toBe(runId);

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('accepted');
    expect(status.failure).toBeNull();
  });

  it('stores and retrieves structured failure objects in status updates', async () => {
    const runId = 'test-failure-run-002';
    await runRepository.create({
      id: runId,
      input_type: 'text',
      content: 'Failing run test statement.',
      owner_type: owner.type,
      owner_id: owner.id,
    });

    const failureObj = {
      stage: 'researching',
      code: 'provider_rate_limited',
      message: 'Rate limit hit.',
      retryable: true,
    };

    await runRepository.updateStage(runId, 'failed', 'failed', null, failureObj);

    const status = await runRepository.getStatus(runId, owner);
    expect(status.status).toBe('failed');
    expect(status.current_stage).toBe('failed');
    expect(status.failure).toEqual(failureObj);
  });

  it('throws databaseUnavailableError when DB query fails during DB mode', async () => {
    // Temporarily inject a fake pool to simulate DB mode
    const originalPool = db.pool;
    db.pool = {};
    const querySpy = vi.spyOn(db, 'query').mockRejectedValue(new Error('PostgreSQL connection timeout'));

    try {
      await expect(
        runRepository.create({
          id: 'failing-db-run',
          input_type: 'text',
          content: 'DB failure test',
          owner_type: 'guest',
          owner_id: 'g1',
        })
      ).rejects.toMatchObject({
        code: 'database_unavailable',
        statusCode: 503,
      });
    } finally {
      querySpy.mockRestore();
      db.pool = originalPool;
    }
  });
});
