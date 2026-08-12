/**
 * Baatmeedar — Provider Retry Manager with Jitter & Deadline Protection
 */

import { getLogger } from '../logging/logger.js';
import {
  isRetryableError,
  parseRetryDelay,
  RetryExhaustedError,
  DeadlineExceededError,
} from './retryErrors.js';

/**
 * Execute an async provider function with bounded retries, provider delay parsing,
 * jittered exponential backoff fallback, and deadline protection.
 *
 * @template T
 * @param {() => Promise<T>} fn — Async function to execute
 * @param {object} opts
 * @param {string} opts.provider — Provider name for logs & metrics ('gemini'|'groq'|'xai'|'tavily')
 * @param {number} [opts.maxRetries=3] — Maximum number of retries (total attempts = maxRetries + 1)
 * @param {number} [opts.baseDelayMs=1000] — Base backoff delay in ms if provider specifies none
 * @param {number} [opts.maxDelayMs=30000] — Cap on exponential backoff delay in ms
 * @param {number} [opts.deadlineMs=120000] — Total request deadline in ms
 * @param {object} [opts.logger] — Custom logger instance
 * @returns {Promise<T>}
 */
export async function retryWithBackoff(fn, opts = {}) {
  const {
    provider = 'unknown_provider',
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    deadlineMs = 120000,
    logger = getLogger(),
  } = opts;

  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const elapsedMs = Date.now() - startTime;
      const status = err?.status || err?.statusCode || err?.response?.status || null;

      // 1. Permanent / Non-retryable error check
      if (!isRetryableError(err)) {
        logger.warn(
          {
            provider,
            attempt,
            status,
            err: err.message,
            terminal_reason: 'non_retryable_error',
          },
          `Provider ${provider} call failed with non-retryable error`
        );
        throw err;
      }

      // 2. Retry count check
      if (attempt > maxRetries) {
        logger.error(
          {
            provider,
            attempts: attempt,
            status,
            err: err.message,
            terminal_reason: 'max_retries_exceeded',
          },
          `Provider ${provider} call exhausted maximum retries (${maxRetries})`
        );
        throw new RetryExhaustedError({
          provider,
          attempts: attempt,
          lastStatus: status,
          reason: err.message,
          cause: err,
        });
      }

      // 3. Determine retry delay (Provider header / structured info vs exponential backoff)
      const providerDelay = parseRetryDelay(err);
      let delayMs;
      let delaySource;

      if (providerDelay != null && providerDelay >= 0) {
        delayMs = providerDelay;
        delaySource = 'provider_header_retry_info';
      } else {
        // Bounded exponential backoff with full jitter
        const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
        const jitter = Math.floor(Math.random() * Math.min(expDelay, 1000));
        delayMs = expDelay + jitter;
        delaySource = 'exponential_backoff_jitter';
      }

      // 4. Request deadline check
      const remainingDeadlineMs = deadlineMs - elapsedMs;
      if (delayMs > remainingDeadlineMs || remainingDeadlineMs <= 0) {
        logger.error(
          {
            provider,
            attempt,
            delayMs,
            remainingDeadlineMs,
            delaySource,
            terminal_reason: 'deadline_exceeded',
          },
          `Provider ${provider} retry delay (${delayMs}ms) exceeds remaining deadline (${remainingDeadlineMs}ms)`
        );
        throw new DeadlineExceededError({
          provider,
          requiredDelayMs: delayMs,
          remainingDeadlineMs: Math.max(0, remainingDeadlineMs),
        });
      }

      // 5. Log retry decision and sleep
      logger.warn(
        {
          provider,
          attempt,
          maxRetries,
          status,
          delayMs,
          delaySource,
          err: err.message,
        },
        `Provider ${provider} transient error — retrying in ${delayMs}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
