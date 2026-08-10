/**
 * Baatmeedar — Fake Resend Adapter (Deterministic Mock)
 *
 * In-memory mock for Resend transactional email adapter used in testing and local dev.
 */

import { v4 as uuidv4 } from 'uuid';

export class FakeResendAdapter {
  constructor({ fromEmail = 'no-reply@baatmeedar.com', shouldFail = false } = {}) {
    this.fromEmail = fromEmail;
    this.shouldFail = shouldFail;
    this.failMessage = 'Simulated Resend API failure';
    this.sentEmails = [];
  }

  /**
   * Simulate sending transactional email
   */
  async sendEmail({ to, subject, html, text, from, tags, idempotencyKey }) {
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error('Invalid recipient email address');
    }
    if (!subject) {
      throw new Error('Email subject is required');
    }

    const emailId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const record = {
      id: emailId,
      to,
      from: from || this.fromEmail,
      subject,
      html,
      text,
      tags,
      idempotencyKey,
      sentAt: new Date().toISOString(),
    };

    this.sentEmails.push(record);

    return {
      success: true,
      id: emailId,
      provider: 'resend-fake',
    };
  }

  /**
   * Retrieve all sent emails
   */
  getSentEmails() {
    return [...this.sentEmails];
  }

  /**
   * Retrieve most recent email
   */
  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  /**
   * Clear recorded emails
   */
  reset() {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
