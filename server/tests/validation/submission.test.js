import { describe, it, expect } from 'vitest';
import { validateSubmission } from '../../src/schemas/submission.js';

describe('Submission Validation Schema', () => {
  it('accepts valid text input', () => {
    const res = validateSubmission({
      input_type: 'text',
      content: 'The World Health Organization declared mpox a PHEIC in 2024.',
    });
    expect(res.success).toBe(true);
    expect(res.data.input_type).toBe('text');
  });

  it('rejects blank text input', () => {
    const res = validateSubmission({
      input_type: 'text',
      content: '   ',
    });
    expect(res.success).toBe(false);
    expect(res.errors[0].field).toBe('content');
  });

  it('rejects text over 5000 characters', () => {
    const longText = 'a'.repeat(5001);
    const res = validateSubmission({
      input_type: 'text',
      content: longText,
    });
    expect(res.success).toBe(false);
    expect(res.errors[0].message).toContain('5000');
  });

  it('rejects control characters in text', () => {
    const res = validateSubmission({
      input_type: 'text',
      content: 'Valid statement \x00 with null byte',
    });
    expect(res.success).toBe(false);
    expect(res.errors[0].message).toContain('control characters');
  });

  it('accepts valid article HTTPS URL', () => {
    const res = validateSubmission({
      input_type: 'article',
      content: 'https://www.reuters.com/business/healthcare-pharmaceuticals/who-declares-mpox-global-health-emergency-2024-08-14/',
    });
    expect(res.success).toBe(true);
  });

  it('rejects non-HTTPS article URL', () => {
    const res = validateSubmission({
      input_type: 'article',
      content: 'http://example.com/article',
    });
    expect(res.success).toBe(false);
    expect(res.errors[0].message).toContain('HTTPS');
  });

  it('accepts valid YouTube URL', () => {
    const res = validateSubmission({
      input_type: 'youtube',
      content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid YouTube hostname', () => {
    const res = validateSubmission({
      input_type: 'youtube',
      content: 'https://www.vimeo.com/123456',
    });
    expect(res.success).toBe(false);
    expect(res.errors[0].message).toContain('YouTube URL');
  });

  it('rejects unknown input_type', () => {
    const res = validateSubmission({
      input_type: 'tiktok',
      content: 'https://example.com',
    });
    expect(res.success).toBe(false);
  });

  it('rejects unknown extra fields (strict mode)', () => {
    const res = validateSubmission({
      input_type: 'text',
      content: 'Valid statement',
      extra_field: 'malicious',
    });
    expect(res.success).toBe(false);
  });
});
