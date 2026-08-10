/**
 * Baatmeedar — Action Token Utility
 *
 * Provides cryptographic HMAC-SHA256 signing and verification for single-use,
 * short-lived action links (password resets, email verification, export links).
 * No raw credentials, access tokens, or sensitive payload data are embedded in links.
 */

import crypto from 'crypto';

const DEFAULT_SECRET = process.env.JWT_SECRET || 'baatmeedar-action-token-secret-key-32b';

/**
 * Create a signed action token
 *
 * @param {object} payload
 * @param {string} payload.action — e.g. 'verify_email', 'reset_password', 'export_run'
 * @param {string} payload.userId — Associated user identity ID
 * @param {string} [payload.runId] — Optional verification run ID
 * @param {number} [expiresInSeconds] — Token validity duration (default: 3600s / 1 hr)
 * @param {string} [secret] — Optional secret key override
 * @returns {string} Signed token in format: `${base64UrlPayload}.${signature}`
 */
export function generateActionToken(payload, expiresInSeconds = 3600, secret = DEFAULT_SECRET) {
  if (!payload || !payload.action || !payload.userId) {
    throw new Error('Payload requires action and userId properties');
  }

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const nonce = crypto.randomBytes(8).toString('hex');
  const tokenData = {
    ...payload,
    exp,
    nonce,
  };

  const jsonStr = JSON.stringify(tokenData);
  const base64Payload = Buffer.from(jsonStr).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Payload)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

/**
 * Verify and decode a signed action token
 *
 * @param {string} token — Token string
 * @param {string} expectedAction — Required action name
 * @param {string} [secret] — Optional secret key override
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export function verifyActionToken(token, expectedAction, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token must be a non-empty string' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [base64Payload, signature] = parts;

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(base64Payload)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    if (expectedAction && payload.action !== expectedAction) {
      return { valid: false, error: `Action mismatch: expected '${expectedAction}', got '${payload.action}'` };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}
