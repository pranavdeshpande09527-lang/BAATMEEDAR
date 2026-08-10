/**
 * Baatmeedar — Resend Transactional Email Adapter
 *
 * Server-side adapter for Resend API (POST https://api.resend.com/emails).
 * - Enforces server-only secret usage (RESEND_API_KEY)
 * - Input validation & email format checks
 * - Timeout controller & transient error retries (5xx/429)
 * - Redacted logger output (never logs API key or email credentials)
 */

import { getLogger } from '../logging/logger.js';

export class ResendAdapter {
  /**
   * @param {object} config
   * @param {string} config.apiKey — Resend API Key
   * @param {string} [config.fromEmail] — Approved sender email address
   * @param {number} [config.timeoutMs] — Request timeout in milliseconds (default: 8000ms)
   * @param {number} [config.maxRetries] — Retry limit for transient errors (default: 3)
   */
  constructor({ apiKey, fromEmail = 'no-reply@baatmeedar.com', timeoutMs = 8000, maxRetries = 3 } = {}) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.baseUrl = 'https://api.resend.com';
  }

  /**
   * Send transactional email via Resend API
   *
   * @param {object} params
   * @param {string} params.to — Recipient email address
   * @param {string} params.subject — Email subject line
   * @param {string} [params.html] — HTML message content
   * @param {string} [params.text] — Plain text message content
   * @param {string} [params.from] — Optional override for sender email
   * @param {object[]} [params.tags] — Categorization tags
   * @param {string} [params.idempotencyKey] — Optional idempotency header key
   * @returns {Promise<{ success: boolean, id: string, provider: string }>}
   */
  async sendEmail({ to, subject, html, text, from, tags, idempotencyKey }) {
    if (!to || !this._isValidEmail(to)) {
      throw new Error('Invalid recipient email address');
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }
    if (!html && !text) {
      throw new Error('Email content (html or text) is required');
    }
    if (!this.apiKey) {
      throw new Error('Resend API key is not configured');
    }

    const payload = {
      from: from || this.fromEmail,
      to: [to.trim()],
      subject: subject.trim(),
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(tags ? { tags } : {}),
    };

    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        };
        if (idempotencyKey) {
          headers['Idempotency-Key'] = idempotencyKey;
        }

        const res = await fetch(`${this.baseUrl}/emails`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          getLogger().info(
            { recipient: this._redactEmail(to), emailId: data.id, attempt },
            'Transactional email sent successfully via Resend'
          );
          return {
            success: true,
            id: data.id,
            provider: 'resend',
          };
        }

        const errorStatus = res.status;
        let errorBody = {};
        try {
          errorBody = await res.json();
        } catch {
          // ignore non-json error body
        }

        // 4xx non-retryable user errors
        if (errorStatus >= 400 && errorStatus < 500 && errorStatus !== 429) {
          getLogger().warn(
            { recipient: this._redactEmail(to), status: errorStatus },
            'Resend API rejected email request'
          );
          throw new Error(`Resend email rejected with status ${errorStatus}: ${errorBody.message || 'Client Error'}`);
        }

        // Retryable 5xx or 429 rate limit
        lastError = new Error(`Resend API returned status ${errorStatus}`);
        getLogger().warn(
          { recipient: this._redactEmail(to), status: errorStatus, attempt },
          'Resend API transient failure, retrying...'
        );

      } catch (err) {
        if (err.name === 'AbortError') {
          lastError = new Error(`Resend request timed out after ${this.timeoutMs}ms`);
        } else if (err.message.includes('rejected with status')) {
          throw err;
        } else {
          lastError = err;
        }
        getLogger().warn(
          { recipient: this._redactEmail(to), err: lastError.message, attempt },
          'Resend API network or timeout attempt failed'
        );
      }

      if (attempt < this.maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    getLogger().error(
      { recipient: this._redactEmail(to), err: lastError?.message },
      'All Resend email dispatch attempts exhausted'
    );
    throw new Error(`Failed to send email via Resend after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Helper: Redact recipient email for privacy logging
   */
  _redactEmail(email) {
    if (!email || !email.includes('@')) return '***@***';
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : '***';
    return `${maskedUser}@${domain}`;
  }

  /**
   * Helper: Validate basic email address syntax
   */
  _isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
