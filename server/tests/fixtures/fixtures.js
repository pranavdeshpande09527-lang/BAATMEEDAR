/**
 * Baatmeedar — Shared Test Fixtures & Factories
 *
 * Centralized test fixture builder for unit, integration, API, and workflow tests.
 * All fixtures are sanitized with no real secrets, live API keys, or private evidence.
 */

export function makeTextSubmission(overrides = {}) {
  return {
    input_type: 'text',
    content: 'The World Health Organization declared mpox a Public Health Emergency of International Concern in 2024.',
    ...overrides,
  };
}

export function makeArticleSubmission(overrides = {}) {
  return {
    input_type: 'article',
    content: 'https://www.reuters.com/business/healthcare-pharmaceuticals/who-declares-mpox-global-health-emergency-2024-08-14/',
    ...overrides,
  };
}

export function makeYoutubeSubmission(overrides = {}) {
  return {
    input_type: 'youtube',
    content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ...overrides,
  };
}

export function makeSsrfUrl(target = 'metadata') {
  const targets = {
    metadata: 'https://169.254.169.254/latest/meta-data/',
    localhost: 'https://localhost:8080/admin',
    loopback: 'https://127.0.0.1/secret',
    ipv6_loopback: 'https://[::1]/private',
  };
  return targets[target] || targets.metadata;
}

export function makeMalformedInput(type = 'control_char') {
  if (type === 'control_char') {
    return { input_type: 'text', content: 'Statement with null byte \x00 here.' };
  }
  if (type === 'blank') {
    return { input_type: 'text', content: '   ' };
  }
  if (type === 'invalid_type') {
    return { input_type: 'unsupported_type', content: 'Valid content string' };
  }
  if (type === 'non_https') {
    return { input_type: 'article', content: 'http://example.com/insecure-article' };
  }
  if (type === 'invalid_youtube') {
    return { input_type: 'youtube', content: 'https://www.vimeo.com/12345678' };
  }
  return { input_type: 'text', content: '' };
}

export function makeOversizeInput(length = 5001) {
  return {
    input_type: 'text',
    content: 'A'.repeat(length),
  };
}

export function makeClaim(overrides = {}) {
  return {
    id: 'clm-001',
    text: 'The WHO declared mpox a Public Health Emergency of International Concern in 2024.',
    domain: 'Health',
    context: 'Global health emergency declaration context.',
    entities: ['WHO', 'mpox'],
    temporal: 'historical',
    ...overrides,
  };
}

export function makeSource(overrides = {}) {
  return {
    id: 'src-001',
    url: 'https://www.who.int/news/item/14-08-2024-mpox-declaration',
    title: 'WHO Mpox Declaration',
    publisher: 'World Health Organization',
    published_date: '2024-08-14',
    source_type: 'official_body',
    authority_rationale: 'Primary agency issuing official statement.',
    excerpt: 'I am declaring the upsurge of mpox in Africa a public health emergency of international concern.',
    stance: 'supporting',
    ...overrides,
  };
}

export function makeResearchData(overrides = {}) {
  const claim = overrides.claim || makeClaim();
  const source = overrides.source || makeSource();

  return {
    claim_id: claim.id,
    hermes_plan: {
      research_question: `Did WHO issue official declaration for ${claim.text}?`,
      required_facts: ['Official date', 'Agency head statement'],
      source_strategy: 'Primary agency health releases',
      tavily_queries: [`${claim.text} official statement`],
      support_criteria: 'Direct statement by WHO',
      contradiction_criteria: 'Denial by WHO',
      follow_up_gaps: [],
    },
    sources: [source],
    groq_analysis: 'Groq analysis confirms primary source alignment.',
    gemini_analysis: 'Gemini analysis confirms primary source coverage.',
    ...overrides,
  };
}

export function makeVerifierResult(verifier = 'groq', verdict = 'supported', overrides = {}) {
  return {
    id: `${verifier}-res-001`,
    claim_id: overrides.claim_id || 'clm-001',
    verifier,
    verdict,
    confidence: 90,
    reasoning: `Independent ${verifier} evaluation determined claim is ${verdict}.`,
    evidence_ids: ['src-001'],
    limitations: 'Subject to source recency at search time.',
    unresolved_questions: [],
    ...overrides,
  };
}
