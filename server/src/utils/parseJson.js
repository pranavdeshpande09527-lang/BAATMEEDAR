export function parseJsonFromModelOutput(text) {
  if (typeof text !== 'string') return text;
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }

  // Find bounding braces/brackets
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isObject = cleaned[startIdx] === '{';
    const lastIdx = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
    if (lastIdx !== -1 && lastIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, lastIdx + 1);
    }
  }

  return JSON.parse(cleaned);
}
