/**
 * Baatmeedar — Provider Retry & Classification Errors
 */

export class RetryExhaustedError extends Error {
  /**
   * @param {object} params
   * @param {string} params.provider
   * @param {number} params.attempts
   * @param {number|null} params.lastStatus
   * @param {string} params.reason
   * @param {Error} [params.cause]
   */
  constructor({ provider, attempts, lastStatus, reason, cause }) {
    super(`Retry limit reached for provider ${provider}: ${reason}`);
    this.name = 'RetryExhaustedError';
    this.provider = provider;
    this.attempts = attempts;
    this.lastStatus = lastStatus;
    this.reason = reason;
    this.cause = cause;
  }
}

export class DeadlineExceededError extends Error {
  /**
   * @param {object} params
   * @param {string} params.provider
   * @param {number} params.requiredDelayMs
   * @param {number} params.remainingDeadlineMs
   */
  constructor({ provider, requiredDelayMs, remainingDeadlineMs }) {
    super(
      `Provider ${provider} requested retry delay of ${requiredDelayMs}ms which exceeds remaining deadline of ${remainingDeadlineMs}ms`
    );
    this.name = 'DeadlineExceededError';
    this.provider = provider;
    this.requiredDelayMs = requiredDelayMs;
    this.remainingDeadlineMs = remainingDeadlineMs;
  }
}

/**
 * Parses provider-supplied retry delay from various error structures:
 * - Retry-After header (seconds integer or RFC 1123 HTTP-date string)
 * - Google RetryInfo (e.g., "55s" or { retryDelay: "55s" } or { seconds: 55 })
 * - Groq / OpenAI error.retry_after
 *
 * @param {any} err
 * @returns {number | null} delay in milliseconds, or null if not provided
 */
export function parseRetryDelay(err) {
  if (!err) return null;

  // 1. Check HTTP Retry-After header if response headers object or err.headers present
  const retryAfterHeader =
    err?.headers?.get?.('retry-after') ||
    err?.headers?.['retry-after'] ||
    err?.response?.headers?.get?.('retry-after') ||
    err?.response?.headers?.['retry-after'];

  if (retryAfterHeader) {
    const rawVal = String(retryAfterHeader).trim();
    // If it's pure numeric string (seconds)
    if (/^\d+$/.test(rawVal)) {
      return parseInt(rawVal, 10) * 1000;
    }
    // Else try parsing HTTP Date
    const parsedDate = Date.parse(rawVal);
    if (!isNaN(parsedDate)) {
      const diffMs = parsedDate - Date.now();
      return diffMs > 0 ? diffMs : 0;
    }
  }

  // 2. Check Google GenerativeAI / gRPC RetryInfo details
  // Google errorDetails can be an array of objects
  const details = err?.errorDetails || err?.details || err?.response?.errorDetails;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (
        detail?.['@type']?.includes('RetryInfo') ||
        detail?.retryDelay != null
      ) {
        const delayVal = detail.retryDelay;
        if (typeof delayVal === 'string' && delayVal.endsWith('s')) {
          const secs = parseFloat(delayVal.slice(0, -1));
          if (!isNaN(secs)) return Math.round(secs * 1000);
        } else if (typeof delayVal === 'number') {
          return Math.round(delayVal * 1000);
        } else if (detail.seconds != null) {
          return Math.round(Number(detail.seconds) * 1000);
        }
      }
    }
  }

  // 3. Direct Google / SDK error message pattern matching (e.g. "...Please retry after 55s...")
  const msg = err?.message || '';
  const msgMatch = msg.match(/retry\s+(?:after|in)\s+(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i);
  if (msgMatch && msgMatch[1]) {
    const secs = parseFloat(msgMatch[1]);
    if (!isNaN(secs)) return Math.round(secs * 1000);
  }

  // 4. Groq / OpenAI error.retry_after field or err.retry_after
  const groqRetryAfter = err?.error?.retry_after ?? err?.retry_after;
  if (typeof groqRetryAfter === 'number') {
    return Math.round(groqRetryAfter * 1000);
  }

  return null;
}

/**
 * Evaluates whether an error represents a genuinely transient error eligible for retry.
 *
 * Retryable:
 * - HTTP 429 (Rate Limit / Quota)
 * - HTTP 500, 502, 503, 504
 * - Network errors (ETIMEDOUT, ECONNRESET, ENOTFOUND, AbortError, fetch failed)
 * - Message containing rate limit / quota / resource exhausted / temporary unavailable keywords
 *
 * Non-retryable:
 * - HTTP 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 422 (Unprocessable Entity)
 * - Schema validation errors, invalid API key, malformed request
 *
 * @param {any} err
 * @returns {boolean}
 */
export function isRetryableError(err) {
  if (!err) return false;

  const status = err?.status || err?.statusCode || err?.response?.status;
  if (status) {
    if ([400, 401, 403, 404, 422].includes(status)) {
      return false; // Permanent 4xx
    }
    if (status === 429 || [500, 502, 503, 504].includes(status)) {
      return true;
    }
  }

  const code = err?.code || '';
  if (['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT', 'EPIPE'].includes(code)) {
    return true;
  }

  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
    return true;
  }

  const msg = (err?.message || '').toLowerCase();

  // Explicit non-retryable message patterns
  if (
    /invalid_api_key|api key not valid|unauthorized|forbidden|bad request|invalid argument|permission_denied/i.test(
      msg
    )
  ) {
    return false;
  }

  // Transient message patterns
  if (
    /429|rate.?limit|quota|resource.?exhausted|too many requests|overloaded|service unavailable|gateway timeout/i.test(
      msg
    )
  ) {
    return true;
  }

  return false;
}
