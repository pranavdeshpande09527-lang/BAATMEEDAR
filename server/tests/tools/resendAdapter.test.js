import { describe, it, expect, beforeEach } from 'vitest';
import { ResendAdapter } from '../../src/adapters/resendAdapter.js';
import { FakeResendAdapter } from '../../src/adapters/fakes/fakeResendAdapter.js';

describe('ResendAdapter & FakeResendAdapter', () => {
  describe('FakeResendAdapter', () => {
    let fake;

    beforeEach(() => {
      fake = new FakeResendAdapter();
    });

    it('should successfully record sent emails', async () => {
      const res = await fake.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('resend-fake');
      expect(fake.getSentEmails()).toHaveLength(1);
      expect(fake.getLastSentEmail().to).toBe('user@example.com');
    });

    it('should reject invalid recipient emails', async () => {
      await expect(
        fake.sendEmail({
          to: 'invalid-email',
          subject: 'Test',
          html: '<p>Hi</p>',
        })
      ).rejects.toThrow('Invalid recipient email address');
    });

    it('should simulate failure when configured', async () => {
      fake.shouldFail = true;
      await expect(
        fake.sendEmail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        })
      ).rejects.toThrow('Simulated Resend API failure');
    });
  });

  describe('ResendAdapter Input Validation', () => {
    const adapter = new ResendAdapter({ apiKey: 're_123456789' });

    it('should throw if recipient is missing or invalid', async () => {
      await expect(adapter.sendEmail({ to: '', subject: 'Hi', html: 'a' })).rejects.toThrow(
        'Invalid recipient email address'
      );
    });

    it('should throw if subject is empty', async () => {
      await expect(adapter.sendEmail({ to: 'a@b.com', subject: '', html: 'a' })).rejects.toThrow(
        'Email subject is required'
      );
    });

    it('should throw if content is missing', async () => {
      await expect(adapter.sendEmail({ to: 'a@b.com', subject: 'Hi' })).rejects.toThrow(
        'Email content (html or text) is required'
      );
    });
  });
});
