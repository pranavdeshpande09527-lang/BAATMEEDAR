/**
 * Baatmeedar — Adapter Factory & Dependency Injection
 *
 * Constructs provider adapters based on application configuration.
 * Allows replacing any adapter with deterministic fake adapters for automated testing.
 */

import { GeminiAdapter } from './geminiAdapter.js';
import { GroqAdapter } from './groqAdapter.js';
import { TavilyAdapter } from './tavilyAdapter.js';
import { YoutubeAdapter } from './youtubeAdapter.js';

import { FakeGeminiAdapter } from './fakes/fakeGeminiAdapter.js';
import { FakeGroqAdapter } from './fakes/fakeGroqAdapter.js';
import { FakeTavilyAdapter } from './fakes/fakeTavilyAdapter.js';
import { FakeYoutubeAdapter } from './fakes/fakeYoutubeAdapter.js';

export function createAdapters(config, useFakes = false) {
  if (useFakes || config?.isTest) {
    return {
      gemini: new FakeGeminiAdapter(),
      groq: new FakeGroqAdapter(),
      tavily: new FakeTavilyAdapter(),
      youtube: new FakeYoutubeAdapter(),
    };
  }

  return {
    gemini: new GeminiAdapter(config.providers.gemini.apiKey),
    groq: new GroqAdapter(config.providers.groq.apiKey),
    tavily: new TavilyAdapter(config.providers.tavily.apiKey),
    youtube: new YoutubeAdapter(config.providers.youtube.apiKey),
  };
}
