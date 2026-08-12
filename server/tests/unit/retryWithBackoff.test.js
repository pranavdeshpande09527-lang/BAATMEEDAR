import { describe, it, expect, vi } from 'vitest';
import {
  parseRetryDelay,
  isRetryableError,
  RetryExhaustedError,
  DeadlineExceededError,
} from '../../src/utils/retryErrors.js';
import { retryWithBackoff } from '../../src/utils/retryWithBackoff.js';

describe('Retry Errors & Helper Utilities', () => {
  describe('parseRetryDelay()', () => {
    it('parses numeric Retry-After header in seconds', () => {
      const err = { headers: { get: (h) => (h === 'retry-after' ? '55' : null) } };
      expect(parseRetryDelay(err)).toBe(55000);
    });

    it('parses HTTP Date in Retry-After header', () => {
      const futureDate = new Date(Date.now() + 10000).toUTCString();
      const err = { headers: { 'retry-after': futureDate } };
      const delay = parseRetryDelay(err);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(10000);
    });

    it('parses Google RetryInfo errorDetails array with seconds string', () => {
      const err = {
        errorDetails: [
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '42s' },
        ],
      };
      expect(parseRetryDelay(err)).toBe(42000);
    });

    it('parses message pattern "Please retry after 30s"', () => {
      const err = { message: 'Quota exceeded. Please retry after 30s.' };
      expect(parseRetryDelay(err)).toBe(30000);
    });

    it('parses Groq retry_after field', () => {
      const err = { error: { retry_after: 12.5 } };
      expect(parseRetryDelay(err)).toBe(12500);
    });

    it('returns null if no retry delay is provided', () => {
      const err = { message: 'Generic error' };
      expect(parseRetryDelay(err)).toBeNull();
    });
  });

  describe('isRetryableError()', () => {
    it('classifies 429 as retryable', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
    });

    it('classifies 500, 502, 503, 504 as retryable', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
    });

    it('classifies network timeouts and reset errors as retryable', () => {
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ name: 'TimeoutError' })).toBe(true);
    });

    it('classifies 400, 401, 403, 404 as non-retryable', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
      expect(isRetryableError({ status: 403 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
    });

    it('classifies invalid API key message as non-retryable', () => {
      expect(isRetryableError({ message: 'API key not valid. Please pass a valid key.' })).toBe(false);
    });
  });

  describe('retryWithBackoff()', () => {
    it('returns result on first attempt if call succeeds', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const res = await retryWithBackoff(fn, { provider: 'test', maxRetries: 3 });
      expect(res).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries transient 429 error and succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce({ status: 429, message: 'rate limit' })
        .mockResolvedValueOnce('success after retry');

      const res = await retryWithBackoff(fn, {
        provider: 'test',
        maxRetries: 2,
        baseDelayMs: 10,
      });

      expect(res).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-retryable error (e.g. 401 Unauthorized)', async () => {
      const fn = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(
        retryWithBackoff(fn, { provider: 'test', maxRetries: 3 })
      ).rejects.toMatchObject({ status: 401 });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws RetryExhaustedError when max retries are exceeded', async () => {
      const fn = vi.fn().mockRejectedValue({ status: 429, message: 'rate limit' });

      await expect(
        retryWithBackoff(fn, { provider: 'test', maxRetries: 2, baseDelayMs: 5 })
      ).rejects.toThrow(RetryExhaustedError);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws DeadlineExceededError if provider retry delay exceeds remaining deadline', async () => {
      const fn = vi.fn().mockRejectedValue({
        status: 429,
        errorDetails: [{ '@type': 'RetryInfo', retryDelay: '100s' }],
      });

      await expect(
        retryWithBackoff(fn, { provider: 'test', maxRetries: 2, deadlineMs: 5000 })
      ).rejects.toThrow(DeadlineExceededError);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
