import { describe, it, expect } from 'vitest';
import { parseJsonFromModelOutput } from '../../src/utils/parseJson.js';

describe('parseJsonFromModelOutput', () => {
  it('parses raw JSON string', () => {
    expect(parseJsonFromModelOutput('{"verdict": "supported"}')).toEqual({ verdict: 'supported' });
  });

  it('parses JSON inside markdown fences', () => {
    const raw = '```json\n{\n  "verdict": "supported"\n}\n```';
    expect(parseJsonFromModelOutput(raw)).toEqual({ verdict: 'supported' });
  });

  it('parses JSON with markdown fences and trailing text', () => {
    const raw = '```json\n{\n  "verdict": "supported"\n}\n```\nHere is a summary.';
    expect(parseJsonFromModelOutput(raw)).toEqual({ verdict: 'supported' });
  });

  it('parses JSON array', () => {
    const raw = '```json\n[{"id": 1}, {"id": 2}]\n```';
    expect(parseJsonFromModelOutput(raw)).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
