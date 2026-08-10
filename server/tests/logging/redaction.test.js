import { describe, it, expect } from 'vitest';
import { redact, redactErrorForClient } from '../../src/logging/redactor.js';

describe('Log Redaction & Security Protection', () => {
  it('strips API keys, passwords, tokens, and credentials from objects', () => {
    const raw = {
      user: 'john',
      apiKey: 'sk-proj-secret123',
      nested: {
        database_url: 'postgresql://admin:secret@localhost:5432/db',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret',
      },
    };

    const redacted = redact(raw);
    expect(redacted.user).toBe('john');
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect(redacted.nested.database_url).toBe('[REDACTED]');
    expect(redacted.nested.token).toBe('[REDACTED]');
  });

  it('truncates excessively long text strings to prevent log flooding', () => {
    const longText = 'A'.repeat(600);
    const redacted = redact({ article_text: longText });
    expect(redacted.article_text).toContain('[TRUNCATED]');
    expect(redacted.article_text.length).toBeLessThan(300);
  });

  it('redacts error stack traces for client output', () => {
    const err = new Error('Database connection failed at postgres.js:45');
    err.code = 'internal_fault';
    err.stack = 'Error: Database connection failed\n    at internal/db.js:10:5';

    const clientSafe = redactErrorForClient(err);
    expect(clientSafe.message).toBe('Database connection failed at postgres.js:45');
    expect(clientSafe.code).toBe('internal_fault');
    expect(clientSafe.stack).toBeUndefined();
  });
});
