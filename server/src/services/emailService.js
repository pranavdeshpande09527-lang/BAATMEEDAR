/**
 * Baatmeedar — Transactional Email Service
 *
 * Provides opt-in transactional notification logic for:
 * - Verification run completion alerts
 * - Password reset & account verification links (using signed action tokens)
 * - Privacy-minimal HTML/text rendering with mandatory epistemic disclaimers
 */

import { generateActionToken } from '../utils/tokenUtils.js';
import { getLogger } from '../logging/logger.js';

export class EmailService {
  /**
   * @param {object} params
   * @param {object} params.resendAdapter — Resend API or FakeResendAdapter instance
   * @param {string} [params.appUrl] — Base application URL for action links
   */
  constructor({ resendAdapter, appUrl = 'https://baatmeedar.com' } = {}) {
    this.resend = resendAdapter;
    this.appUrl = appUrl;
  }

  /**
   * Send notification when a verification run completes (Opt-in only)
   *
   * @param {object} params
   * @param {string} params.to — Recipient email
   * @param {string} params.runId — Verification run ID
   * @param {string} params.verdictLabel — Summary verdict (e.g., "Mostly True", "Inconclusive")
   * @param {number} [params.confidence] — Confidence score
   */
  async sendRunCompletionEmail({ to, runId, verdictLabel, confidence }) {
    if (!this.resend) {
      getLogger().warn('EmailService invoked without active resend adapter');
      return { success: false, reason: 'Email adapter not configured' };
    }

    const runUrl = `${this.appUrl}/verify/${runId}`;
    const subject = `Baatmeedar Verification Complete [Run ${runId.slice(0, 8)}]`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color: #4f46e5;">Baatmeedar Verification Report Ready</h2>
        <p>Your 5-stage verification analysis has completed.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">Run ID: <span style="font-family: monospace;">${runId}</span></p>
          <p style="margin: 8px 0 0 0;">Overall Verdict: <strong>${verdictLabel}</strong> ${confidence ? `(${Math.round(confidence * 100)}% confidence)` : ''}</p>
        </div>
        <p><a href="${runUrl}" style="background-color: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View Detailed Report</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; line-height: 1.4;">
          <strong>Epistemic Disclaimer:</strong> Baatmeedar results reflect automated AI research cross-referencing available public sources at the time of execution. It does not constitute professional, legal, or authoritative editorial certification.
        </p>
      </div>
    `;

    const text = `Baatmeedar Verification Report Ready\n\nRun ID: ${runId}\nVerdict: ${verdictLabel}\nView Report: ${runUrl}\n\nDisclaimer: Baatmeedar results reflect automated AI research cross-referencing available public sources.`;

    return this.resend.sendEmail({
      to,
      subject,
      html,
      text,
      tags: [{ name: 'category', value: 'run_completion' }],
      idempotencyKey: `run_comp_${runId}`,
    });
  }

  /**
   * Send single-use account action email (password reset, email confirmation)
   *
   * @param {object} params
   * @param {string} params.to — Recipient email
   * @param {string} params.userId — User ID
   * @param {'reset_password' | 'verify_email'} params.action — Action type
   */
  async sendAccountActionEmail({ to, userId, action }) {
    if (!this.resend) {
      throw new Error('Email adapter not configured');
    }

    const token = generateActionToken({ action, userId }, 1800); // 30 min expiration
    const actionUrl = `${this.appUrl}/auth/action?token=${token}`;

    const isReset = action === 'reset_password';
    const subject = isReset ? 'Reset Your Baatmeedar Password' : 'Verify Your Baatmeedar Account';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color: #4f46e5;">${isReset ? 'Password Reset Request' : 'Verify Email Address'}</h2>
        <p>Click the link below to complete your ${isReset ? 'password reset' : 'account verification'}. This link expires in 30 minutes.</p>
        <p><a href="${actionUrl}" style="background-color: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">${isReset ? 'Reset Password' : 'Verify Email'}</a></p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">If you did not request this email, no action is required.</p>
      </div>
    `;

    const text = `${isReset ? 'Password Reset Request' : 'Verify Email Address'}\n\nClick link to complete: ${actionUrl}\n\nLink expires in 30 minutes.`;

    return this.resend.sendEmail({
      to,
      subject,
      html,
      text,
      tags: [{ name: 'category', value: action }],
    });
  }
}
