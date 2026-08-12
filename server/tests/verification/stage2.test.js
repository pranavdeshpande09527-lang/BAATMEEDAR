import { describe, it, expect } from 'vitest';
import { ClaimExtractionService } from '../../src/services/claimExtractionService.js';
import { FakeGeminiAdapter } from '../../src/adapters/fakes/fakeGeminiAdapter.js';

describe('Stage 2 — Claim Extraction & Domain Identification', () => {
  const fakeGemini = new FakeGeminiAdapter();
  const claimExtractor = new ClaimExtractionService({ gemini: fakeGemini });

  it('2.1 Extracts single factual claim and assigns domain', async () => {
    const input = 'India won the cricket match yesterday.';
    const result = await claimExtractor.extractClaims(input);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].text).toContain('India');
    expect(result.claims[0].domain).toBeTruthy();
    expect(result.removed_opinions).toBeDefined();
  });

  it('2.2 Filters subjective opinion while extracting factual claims from mixed statement', async () => {
    const input = 'The government launched a new program last month, and I think it will completely solve unemployment.';
    const result = await claimExtractor.extractClaims(input);

    expect(result.claims.length).toBeGreaterThanOrEqual(1);
    // Opinion "I think it will completely solve unemployment" should not be in factual claims
    const claimTexts = result.claims.map(c => c.text);
    expect(claimTexts.some(t => t.toLowerCase().includes('launched a new program'))).toBe(true);
    expect(claimTexts.some(t => t.toLowerCase().includes('i think it will completely solve'))).toBe(false);
  });

  it('2.3 Handles multiple claims and preserves unique IDs and domains', async () => {
    const input = 'NASA launched Artemis II on Monday. The mission costs $4.1 billion.';
    const result = await claimExtractor.extractClaims(input);

    expect(result.claims.length).toBeGreaterThanOrEqual(1);
    const ids = result.claims.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length); // all claim IDs unique
    expect(result.claims.every(c => typeof c.domain === 'string')).toBe(true);
  });

  it('2.4 Handles empty or opinion-only input safely', async () => {
    const opinionOnlyAdapter = {
      async extractClaims() {
        return {
          claims: [],
          removed_opinions: ['I believe yesterday was a great day overall.'],
        };
      },
    };
    const extractor = new ClaimExtractionService({ gemini: opinionOnlyAdapter });
    const result = await extractor.extractClaims('I believe yesterday was a great day overall.');

    expect(result.claims).toEqual([]);
    expect(result.removed_opinions).toHaveLength(1);
  });

  it('2.5 Handles Gemini API failure safely', async () => {
    const failingAdapter = {
      async extractClaims() {
        throw new Error('Gemini API quota exceeded');
      },
    };
    const extractor = new ClaimExtractionService({ gemini: failingAdapter });
    await expect(extractor.extractClaims('Some statement')).rejects.toThrow('Gemini API quota exceeded');
  });
});
