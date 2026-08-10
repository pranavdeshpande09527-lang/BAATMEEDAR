import { describe, it, expect, beforeEach } from 'vitest';
import { generateActionToken, verifyActionToken } from '../../src/utils/tokenUtils.js';
import { EmailService } from '../../src/services/emailService.js';
import { FakeResendAdapter } from '../../src/adapters/fakes/fakeResendAdapter.js';

describe('TokenUtils & EmailService', () => {
  describe('tokenUtils HMAC Action Tokens', () => {
    it('should generate and verify valid action token', () => {
      const token = generateActionToken({ action: 'reset_password', userId: 'usr-123' }, 3600);
      expect(typeof token).toBe('string');

      const result = verifyActionToken(token, 'reset_password');
      expect(result.valid).toBe(true);
      expect(result.payload.userId).toBe('usr-123');
      expect(result.payload.action).toBe('reset_password');
    });

    it('should reject tampered token signatures', () => {
      const token = generateActionToken({ action: 'reset_password', userId: 'usr-123' }, 3600);
      const tampered = token.slice(0, -4) + 'abcd';

      const result = verifyActionToken(tampered, 'reset_password');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/signature/i);
    });

    it('should reject action mismatch', () => {
      const token = generateActionToken({ action: 'verify_email', userId: 'usr-123' }, 3600);
      const result = verifyActionToken(token, 'reset_password');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Action mismatch/i);
    });

    it('should reject expired tokens', () => {
      const token = generateActionToken({ action: 'reset_password', userId: 'usr-123' }, -10);
      const result = verifyActionToken(token, 'reset_password');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });
  });

  describe('EmailService', () => {
    let fakeAdapter;
    let service;

    beforeEach(() => {
      fakeAdapter = new FakeResendAdapter();
      service = new EmailService({ resendAdapter: fakeAdapter, appUrl: 'https://test.baatmeedar.com' });
    });

    it('should send verification completion notification', async () => {
      const res = await service.sendRunCompletionEmail({
        to: 'factcheck@example.com',
        runId: 'run-987654321',
        verdictLabel: 'Mostly True',
        confidence: 0.88,
      });

      expect(res.success).toBe(true);
      expect(fakeAdapter.getSentEmails()).toHaveLength(1);

      const email = fakeAdapter.getLastSentEmail();
      expect(email.to).toBe('factcheck@example.com');
      expect(email.subject).toContain('Baatmeedar Verification Complete');
      expect(email.html).toContain('run-987654321');
      expect(email.html).toContain('Mostly True');
      expect(email.html).toContain('Epistemic Disclaimer');
    });

    it('should send account action email with signed token URL', async () => {
      const res = await service.sendAccountActionEmail({
        to: 'user@example.com',
        userId: 'usr-789',
        action: 'reset_password',
      });

      expect(res.success).toBe(true);
      const email = fakeAdapter.getLastSentEmail();
      expect(email.to).toBe('user@example.com');
      expect(email.subject).toBe('Reset Your Baatmeedar Password');
      expect(email.html).toContain('https://test.baatmeedar.com/auth/action?token=');
    });
  });
});
