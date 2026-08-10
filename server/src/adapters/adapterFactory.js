/**
 * Baatmeedar — Adapter Factory & Dependency Injection
 *
 * Constructs provider adapters based on application configuration.
 * Allows replacing any adapter with deterministic fake adapters for automated testing.
 */

import { GeminiAdapter } from './geminiAdapter.js';
import { GroqAdapter } from './groqAdapter.js';
import { XAIAdapter } from './xaiAdapter.js';
import { TavilyAdapter } from './tavilyAdapter.js';
import { YoutubeAdapter } from './youtubeAdapter.js';
import { EmbeddingAdapter } from './embeddingAdapter.js';
import { ResendAdapter } from './resendAdapter.js';

import { FakeGeminiAdapter } from './fakes/fakeGeminiAdapter.js';
import { FakeGroqAdapter } from './fakes/fakeGroqAdapter.js';
import { FakeXAIAdapter } from './fakes/fakeXAIAdapter.js';
import { FakeTavilyAdapter } from './fakes/fakeTavilyAdapter.js';
import { FakeYoutubeAdapter } from './fakes/fakeYoutubeAdapter.js';
import { FakeResendAdapter } from './fakes/fakeResendAdapter.js';

export function createAdapters(config = {}, useFakes = false) {
  if (useFakes || config?.isTest) {
    const fakeGroq = new FakeGroqAdapter();
    const fakeGemini = new FakeGeminiAdapter();
    const fakeTavily = new FakeTavilyAdapter();
    const fakeYoutube = new FakeYoutubeAdapter();
    const fakeEmbedding = new EmbeddingAdapter(null);
    const fakeResend = new FakeResendAdapter();

    return {
      gemini: fakeGemini,
      groq: fakeGroq,
      xai: new FakeXAIAdapter(),
      tavily: fakeTavily,
      youtube: fakeYoutube,
      embedding: fakeEmbedding,
      resend: fakeResend,
    };
  }

  const groq = new GroqAdapter(config.providers?.groq?.apiKey);

  return {
    gemini: new GeminiAdapter(config.providers?.gemini?.apiKey),
    groq,
    xai: new XAIAdapter(config.providers?.xai?.apiKey, groq),
    tavily: new TavilyAdapter(config.providers?.tavily?.apiKey),
    youtube: new YoutubeAdapter(config.providers?.youtube?.apiKey),
    embedding: new EmbeddingAdapter(config.providers?.gemini?.apiKey),
    resend: new ResendAdapter({
      apiKey: config.providers?.resend?.apiKey,
      fromEmail: config.providers?.resend?.fromEmail,
    }),
  };
}

