/**
 * BAATMEEDAR — API Layer
 * 
 * All backend calls are here. When the backend is ready, update
 * BASE_URL and the endpoint paths below — nothing else needs to change.
 * 
 * Currently: uses mock responses that simulate the full 5-stage pipeline.
 */

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

const DEFAULT_BACKEND_URL = isLocal
  ? 'http://localhost:5000'
  : 'https://baatmeedar-1.onrender.com';

const BASE_URL = window.LOCATION_BACKEND_URL || window.__ENV__?.BACKEND_URL || DEFAULT_BACKEND_URL;

/** Set to true to use mock data instead of real backend */
const USE_MOCK = false;

/* ─────────────────────────────────────────────────────────────
   REAL API CALLS (active when USE_MOCK = false)
   ───────────────────────────────────────────────────────────── */

async function _apiPost(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // 90s for Render cold start
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. The server may be waking up — please try again.');
    throw err;
  }
}

async function _apiGet(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { credentials: 'include', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Status check timed out.');
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API
   ───────────────────────────────────────────────────────────── */

/**
 * Submit a verification request.
 * @param {'text'|'article'|'youtube'} inputType
 * @param {string} content
 * @returns {Promise<{run_id: string}>}
 */
export async function submitVerification(inputType, content) {
  if (USE_MOCK) return mockSubmit(inputType, content);
  return _apiPost('/verify', { input_type: inputType, content });
}

/**
 * Poll for run status.
 * @param {string} runId
 * @returns {Promise<{status: string, stage: string, partial?: object}>}
 */
export async function getStatus(runId) {
  if (USE_MOCK) return mockGetStatus(runId);
  return _apiGet(`/verify/${runId}/status`);
}

/**
 * Fetch full results once complete.
 * @param {string} runId
 * @returns {Promise<object>} Full results object
 */
export async function getResults(runId) {
  if (USE_MOCK) return mockGetResults(runId);
  return _apiGet(`/verify/${runId}/results`);
}

/* ─────────────────────────────────────────────────────────────
   MOCK ENGINE
   Simulates the 5-stage pipeline with realistic delays.
   Remove this section entirely when real backend is wired.
   ───────────────────────────────────────────────────────────── */

const _mockStore = new Map(); // run_id → { stage, startTime }

function mockSubmit(inputType, content) {
  const runId = 'mock-' + Math.random().toString(36).slice(2, 10);
  _mockStore.set(runId, { stage: 'input_received', startTime: Date.now(), inputType, content });
  return Promise.resolve({ run_id: runId });
}

function mockGetStatus(runId) {
  const run = _mockStore.get(runId);
  if (!run) return Promise.reject(new Error('Run not found'));

  const elapsed = (Date.now() - run.startTime) / 1000; // seconds

  let stage, status;
  if      (elapsed < 3)  { stage = 'input_received';     status = 'processing'; }
  else if (elapsed < 8)  { stage = 'extracting_claims';  status = 'processing'; }
  else if (elapsed < 18) { stage = 'researching';        status = 'processing'; }
  else if (elapsed < 26) { stage = 'verifying';          status = 'processing'; }
  else                   { stage = 'complete';            status = 'complete'; }

  return Promise.resolve({ status, stage });
}

function mockGetResults(runId) {
  const run = _mockStore.get(runId);
  if (!run) return Promise.reject(new Error('Run not found'));
  return Promise.resolve(buildMockResults(run));
}

function buildMockResults(run) {
  const isYoutube = run.inputType === 'youtube';
  const isArticle = run.inputType === 'article';

  return {
    run_id: 'mock-run',
    input: {
      type: run.inputType,
      content: run.content,
      source_url: isArticle || isYoutube ? run.content : null,
      publisher: isArticle ? 'Reuters' : isYoutube ? 'YouTube' : null,
      retrieved_at: new Date().toISOString(),
      extraction_status: 'success',
      raw_text_preview: isYoutube
        ? 'Transcript: The World Health Organization held an emergency meeting on Thursday to discuss the ongoing mpox outbreak across central African nations. Health officials stated that confirmed case counts have risen sharply, prompting renewed calls for international vaccine distribution. Several member states criticized the pace of the global response, citing delays in securing adequate medical supplies...'
        : isArticle
        ? 'The World Health Organization on Thursday declared the mpox outbreak a Public Health Emergency of International Concern (PHEIC), marking only the second time such a declaration has been made. The Director-General cited the rapid spread of the clade Ib variant as a primary concern. Confirmed cases have been reported in more than 12 countries, predominantly in Central Africa. Vaccination campaigns have been limited by supply constraints, with African nations receiving significantly fewer doses than requested...'
        : run.content,
    },
    claims: [
      {
        id: 'clm-001',
        text: 'The WHO declared mpox a Public Health Emergency of International Concern (PHEIC) in 2024.',
        domain: 'Health',
        temporal: 'Historical',
        context: 'WHO emergency declaration regarding mpox/monkeypox clade Ib variant.',
        entities: ['WHO', 'mpox', 'PHEIC'],
      },
      {
        id: 'clm-002',
        text: 'Confirmed mpox cases have been reported in more than 12 countries.',
        domain: 'Health',
        temporal: 'Current',
        context: 'Global spread of mpox outbreak as of mid-2024.',
        entities: ['mpox', 'WHO', 'Central Africa'],
      },
      {
        id: 'clm-003',
        text: 'African nations have received significantly fewer vaccine doses than requested.',
        domain: 'Policy',
        temporal: 'Current',
        context: 'Vaccine distribution equity during the mpox outbreak.',
        entities: ['Africa', 'WHO', 'vaccine distribution'],
      },
    ],
    removed_opinions: [
      'Several member states criticized the pace of the global response.',
      'The international community must act immediately.',
    ],
    research: [
      {
        claim_id: 'clm-001',
        hermes_plan: {
          research_question: 'Did the WHO officially declare mpox a PHEIC in 2024, and what was the basis for the declaration?',
          required_facts: ['Date of declaration', 'Official WHO document', 'Variant cited', 'Director-General statement'],
          source_strategy: 'WHO official communications, government health agency announcements, peer-reviewed epidemiology.',
          tavily_queries: ['WHO mpox PHEIC declaration 2024', 'WHO Director-General mpox emergency August 2024'],
        },
        sources: [
          {
            id: 'src-001',
            url: 'https://www.who.int/news/item/14-08-2024-who-director-general-declares-mpox-outbreak-a-public-health-emergency-of-international-concern',
            title: 'WHO Director-General declares mpox outbreak a Public Health Emergency of International Concern',
            publisher: 'World Health Organization',
            published_date: '2024-08-14',
            source_type: 'Official body',
            authority_rationale: 'Primary official WHO statement.',
            excerpt: '"I am declaring the upsurge of mpox in Africa a public health emergency of international concern (PHEIC)." — WHO Director-General Dr. Tedros Adhanom Ghebreyesus, 14 August 2024.',
            stance: 'supporting',
          },
          {
            id: 'src-002',
            url: 'https://www.reuters.com/business/healthcare-pharmaceuticals/who-declares-mpox-global-health-emergency-2024-08-14/',
            title: 'WHO declares mpox global health emergency for second time',
            publisher: 'Reuters',
            published_date: '2024-08-14',
            source_type: 'Reputable reporting',
            authority_rationale: 'Wire service corroboration of WHO announcement.',
            excerpt: 'The WHO\'s declaration marks only the second time the U.N. health agency has called a PHEIC for mpox, following a similar declaration in 2022.',
            stance: 'supporting',
          },
        ],
        groq_analysis: 'Both sources independently confirm the declaration on 14 August 2024. The clade Ib variant cited in the declaration is documented in WHO epidemiological reports. No logical gaps or counterevidence identified. The claim is precise and temporally bounded to 2024.',
        gemini_analysis: 'Key term: "PHEIC" = Public Health Emergency of International Concern, the WHO\'s highest level of public health alert. The claim uses this terminology accurately. Evidence coverage is adequate — the primary source is the original WHO statement. No ambiguity in the claim as worded.',
      },
      {
        claim_id: 'clm-002',
        hermes_plan: {
          research_question: 'How many countries had confirmed mpox cases as of mid-2024, and does the figure exceed 12?',
          required_facts: ['Case count by country', 'WHO epidemiological bulletin', 'Reporting date'],
          source_strategy: 'WHO situation reports, CDC global health tracking, academic epidemiology journals.',
          tavily_queries: ['mpox confirmed cases countries 2024 WHO report', 'mpox outbreak spread map 2024'],
        },
        sources: [
          {
            id: 'src-003',
            url: 'https://www.who.int/emergencies/disease-outbreak-news/item/2024-DON525',
            title: 'Multi-country outbreak of mpox, External situation report #36',
            publisher: 'World Health Organization',
            published_date: '2024-09-01',
            source_type: 'Official body',
            authority_rationale: 'WHO official epidemiological bulletin with country-level data.',
            excerpt: 'As of 25 August 2024, a total of 99,176 confirmed and probable cases and 208 deaths have been reported from 116 countries, territories, and areas since January 2022.',
            stance: 'supporting',
          },
          {
            id: 'src-004',
            url: 'https://www.cdc.gov/poxvirus/mpox/response/2022/world-map.html',
            title: 'Global Mpox Outbreak Map',
            publisher: 'U.S. Centers for Disease Control and Prevention',
            published_date: '2024-08-20',
            source_type: 'Official body',
            authority_rationale: 'CDC maintains independent tracking of global mpox spread.',
            excerpt: 'Cases confirmed in 116 countries and territories as of the reporting date.',
            stance: 'supporting',
          },
        ],
        groq_analysis: 'The claim states "more than 12 countries." WHO data confirms 116+ countries have reported cases, making the claim accurate though conservative. No counterevidence. The "more than 12" figure may reflect older or regional data; the current global spread is substantially broader.',
        gemini_analysis: '"More than 12 countries" is factually accurate per WHO data, though significantly understates the extent of global spread as of mid-2024. The claim is not false, but context is important: the actual figure is closer to 116+ countries globally. Evidence is adequate for verification.',
      },
      {
        claim_id: 'clm-003',
        hermes_plan: {
          research_question: 'Have African nations received a disproportionately small share of mpox vaccines relative to demand?',
          required_facts: ['Doses requested by African nations', 'Doses actually received', 'Percentage comparison', 'Authoritative source'],
          source_strategy: 'Africa CDC, WHO vaccine allocation data, COVAX/Gavi equity reports, academic global health literature.',
          tavily_queries: ['Africa mpox vaccine doses received requested 2024', 'mpox vaccine equity Africa WHO 2024'],
        },
        sources: [
          {
            id: 'src-005',
            url: 'https://africacdc.org/news-item/africa-cdc-calls-for-urgent-vaccine-equity-in-mpox-response/',
            title: 'Africa CDC calls for urgent vaccine equity in mpox response',
            publisher: 'Africa Centres for Disease Control and Prevention',
            published_date: '2024-08-16',
            source_type: 'Official body',
            authority_rationale: 'Africa CDC is the primary continent-level health authority for this claim.',
            excerpt: 'Africa, which accounts for the vast majority of current mpox cases, has received less than 3% of the global mpox vaccine supply to date.',
            stance: 'supporting',
          },
          {
            id: 'src-006',
            url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(24)01841-5/fulltext',
            title: 'Mpox vaccine equity: a call to action',
            publisher: 'The Lancet',
            published_date: '2024-09-07',
            source_type: 'Peer-reviewed journal',
            authority_rationale: 'Peer-reviewed analysis of vaccine distribution equity with quantitative data.',
            excerpt: 'Of the approximately 3 million doses pledged globally as of September 2024, fewer than 200,000 had been physically delivered to African nations — approximately 6.7% of the stated need.',
            stance: 'supporting',
          },
        ],
        groq_analysis: 'Both sources confirm severe vaccine inequity. Africa CDC\'s 3% figure and The Lancet\'s 6.7% figure differ slightly due to different reference dates and methodologies, but both strongly support the claim of "significantly fewer doses than requested." No credible counterevidence found.',
        gemini_analysis: 'The claim uses relative language ("significantly fewer") which is well-supported by both authoritative sources. The term "significantly" is justified given the 3–7% delivery rate versus requests. Minor ambiguity: "requested" vs. "needed" differ. Evidence is adequate and from high-authority sources.',
      },
    ],
    verdicts: [
      {
        claim_id: 'clm-001',
        grok: {
          verdict: 'supported',
          confidence: 96,
          reasoning: 'The WHO Director-General\'s official statement of 14 August 2024 directly confirms this claim. Both the primary WHO source and Reuters wire reporting corroborate the date and the PHEIC classification. No credible counterevidence exists.',
          limitations: 'The claim is historically accurate as of the declaration date. Note that PHEIC status is reviewed periodically and may change.',
          evidence_ids: ['src-001', 'src-002'],
        },
        gemini: {
          verdict: 'supported',
          confidence: 97,
          reasoning: 'Primary source evidence (WHO official statement) directly supports this claim. The terminology "PHEIC" is used accurately. The 2024 date is verified. This is among the strongest categories of evidence available for any public health claim.',
          limitations: 'Reflects status as of August 2024. Subsequent committee reviews may have modified or extended the designation.',
          evidence_ids: ['src-001', 'src-002'],
        },
        final: {
          verdict: 'supported',
          rationale: 'Both independent verifiers confirm strong support. Primary evidence from WHO\'s own official statement leaves no factual ambiguity.',
          sources_cited: ['src-001', 'src-002'],
          limitations: 'Historical accuracy as of August 2024. PHEIC status subject to periodic review.',
        },
      },
      {
        claim_id: 'clm-002',
        grok: {
          verdict: 'supported',
          confidence: 91,
          reasoning: 'WHO situation reports confirm 116+ countries have reported cases as of mid-2024. The claim of "more than 12 countries" is technically accurate, though it substantially understates the scale of global spread.',
          limitations: 'The claim is accurate but conservative. Case counts and country spread continue to evolve.',
          evidence_ids: ['src-003', 'src-004'],
        },
        gemini: {
          verdict: 'supported',
          confidence: 88,
          reasoning: 'Factually correct per official WHO and CDC data. The "more than 12" threshold is far exceeded. However, the claim may create a misleading impression of limited spread when 116+ countries are affected.',
          limitations: 'Data reflects the global cumulative outbreak since 2022. Ongoing case reporting means figures change regularly.',
          evidence_ids: ['src-003', 'src-004'],
        },
        final: {
          verdict: 'supported',
          rationale: 'Both verifiers agree the claim is factually accurate. Note that "more than 12" significantly underrepresents the global scale (116+ countries confirmed by WHO).',
          sources_cited: ['src-003', 'src-004'],
          limitations: 'Technically accurate but conservative. Users should be aware the true scope is much larger.',
        },
      },
      {
        claim_id: 'clm-003',
        grok: {
          verdict: 'supported',
          confidence: 89,
          reasoning: 'Africa CDC reported <3% of global supply delivered to Africa; The Lancet independently confirmed ~6.7% of requested doses physically delivered. Both authoritative sources support the claim of significantly fewer doses than requested.',
          limitations: 'Figures vary by reporting date and methodology. Ongoing pledge vs. delivery gaps make precise percentages volatile.',
          evidence_ids: ['src-005', 'src-006'],
        },
        gemini: {
          verdict: 'supported',
          confidence: 92,
          reasoning: 'High-authority sources (Africa CDC and peer-reviewed Lancet paper) both confirm severe vaccine inequity with quantitative data. The claim\'s use of "significantly fewer" is an understatement given 3-7% delivery rates.',
          limitations: 'Exact figures depend on reporting date. The underlying finding of severe equity shortfall is robustly supported.',
          evidence_ids: ['src-005', 'src-006'],
        },
        final: {
          verdict: 'supported',
          rationale: 'Strong convergent evidence from Africa CDC and The Lancet confirm severe vaccine distribution inequity affecting African nations.',
          sources_cited: ['src-005', 'src-006'],
          limitations: 'Percentages vary by reporting date; general finding of significant inequity is well-established.',
        },
      },
    ],
  };
}
