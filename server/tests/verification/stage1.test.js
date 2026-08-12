import { describe, it, expect } from 'vitest';
import { InputService } from '../../src/services/inputService.js';
import { TavilyAdapter } from '../../src/adapters/tavilyAdapter.js';
import { YoutubeAdapter } from '../../src/adapters/youtubeAdapter.js';
import { FakeTavilyAdapter } from '../../src/adapters/fakes/fakeTavilyAdapter.js';
import { FakeYoutubeAdapter } from '../../src/adapters/fakes/fakeYoutubeAdapter.js';
import { validateSubmission } from '../../src/schemas/submission.js';

describe('Stage 1 — User Input & Information Extraction', () => {
  const fakeTavily = new FakeTavilyAdapter();
  const fakeYoutube = new FakeYoutubeAdapter();
  const inputService = new InputService({ tavily: fakeTavily, youtube: fakeYoutube });

  it('1.1 Accepts Direct Statement Input directly', async () => {
    const statement = 'India won the match yesterday.';
    const result = await inputService.processInput('text', statement);

    expect(result.type).toBe('text');
    expect(result.content).toBe(statement);
    expect(result.raw_text_preview).toBe(statement);
    expect(result.extraction_status).toBe('success');
  });

  it('1.2 Ingests Article Link via Tavily extraction', async () => {
    const articleUrl = 'https://reuters.com/sports/india-cricket-victory';
    const result = await inputService.processInput('article', articleUrl);

    expect(result.type).toBe('article');
    expect(result.source_url).toBe(articleUrl);
    expect(result.raw_text_preview).toBeTruthy();
    expect(result.extraction_status).toBe('success');
  });

  it('1.3 Ingests YouTube Link via Transcript API', async () => {
    const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const result = await inputService.processInput('youtube', ytUrl);

    expect(result.type).toBe('youtube');
    expect(result.source_url).toBe(ytUrl);
    expect(result.raw_text_preview).toBeTruthy();
    expect(result.extraction_status).toBe('success');
  });

  it('1.4 Handles YouTube video without transcript gracefully', async () => {
    const noTranscriptAdapter = {
      async getTranscript(url) {
        return {
          url,
          video_id: 'no-transcript-id',
          publisher: 'YouTube',
          retrieved_at: new Date().toISOString(),
          extraction_status: 'unavailable_transcript',
          raw_text: '',
        };
      },
    };
    const svc = new InputService({ tavily: fakeTavily, youtube: noTranscriptAdapter });
    const result = await svc.processInput('youtube', 'https://youtube.com/watch?v=no-transcript');

    expect(result.extraction_status).toBe('unavailable_transcript');
    expect(result.raw_text_preview).toBe('');
  });

  it('1.5 Rejects SSRF target URLs (localhost / private IPs)', async () => {
    const realTavily = new TavilyAdapter('fake-key');
    await expect(realTavily.extract('http://127.0.0.1/internal-secret')).rejects.toThrow(/SSRF protection|Target URL/i);
    await expect(realTavily.extract('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/SSRF protection|Target URL/i);
  });

  it('1.6 Rejects invalid / empty submission payload at validation boundary', () => {
    expect(validateSubmission({ input_type: 'invalid', content: '' }).success).toBe(false);
    expect(validateSubmission({ input_type: 'text', content: '' }).success).toBe(false);
    expect(validateSubmission({ input_type: 'article', content: 'not-a-url' }).success).toBe(false);
  });
});
