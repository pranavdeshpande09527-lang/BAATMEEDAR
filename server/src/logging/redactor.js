/**
 * Baatmeedar — Log Redactor
 *
 * Strips sensitive material from log payloads before they are written.
 * Operates on structured objects, not raw strings.
 *
 * Redaction policy (per logging.md):
 * - API keys, cookies, authorization headers, service-role credentials
 * - Database URLs, full prompts, full article/transcript text
 * - Raw provider responses, PII (email, IP in certain contexts)
 * - Stack traces in any client-facing output
 */

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /service[_-]?role/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /smtp/i,
  /credential/i,
  /private[_-]?key/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  /^(sk|pk|sb)[_-]/i,           // Supabase/Stripe key prefixes
  /^eyJ[A-Za-z0-9_-]+\./,      // JWT tokens
  /^postgresql:\/\//i,          // Postgres connection strings
  /^https?:\/\/[^/]*supabase/i, // Supabase URLs in certain contexts
];

/**
 * Deep-redact an object for safe logging.
 * Returns a new object — never mutates the original.
 *
 * @param {unknown} obj — object to redact
 * @param {number} [maxDepth=10] — prevent infinite recursion
 * @returns {unknown}
 */
export function redact(obj, maxDepth = 10) {
  if (maxDepth <= 0) return '[TRUNCATED]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redact(item, maxDepth - 1));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string' && isSensitiveValue(value)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value, maxDepth - 1);
    }
  }
  return result;
}

/**
 * Redact a string if it matches sensitive value patterns.
 * Truncates excessively long strings (full article text, raw responses).
 */
function redactString(str) {
  if (isSensitiveValue(str)) return '[REDACTED]';
  // Truncate excessively long strings (likely full article/transcript text)
  if (str.length > 500) return str.slice(0, 200) + '... [TRUNCATED]';
  return str;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isSensitiveValue(value) {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Strip stack traces from an error for client responses.
 * Keeps message and code only.
 */
export function redactErrorForClient(error) {
  return {
    message: error.message || 'An error occurred.',
    code: error.code || 'internal_fault',
    // No stack, no internals
  };
}
