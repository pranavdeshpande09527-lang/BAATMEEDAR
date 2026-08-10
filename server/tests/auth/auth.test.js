import { describe, it, expect } from 'vitest';
import { guestSessionRepository } from '../../src/repositories/guestSessionRepository.js';

describe('Guest Session & Account Linking Repository', () => {
  it('creates and retrieves guest session', async () => {
    const s = await guestSessionRepository.addRunId('session-123', 'run-abc');
    expect(s.id).toBe('session-123');
    expect(s.allowed_run_ids).toContain('run-abc');

    const fetched = await guestSessionRepository.get('session-123');
    expect(fetched).toBeDefined();
    expect(fetched.allowed_run_ids).toContain('run-abc');
  });

  it('links guest runs to account idempotently', async () => {
    const res = await guestSessionRepository.linkToAccount('session-123', 'user-456', ['run-abc']);
    expect(res.linked_ids).toContain('run-abc');
  });
});
