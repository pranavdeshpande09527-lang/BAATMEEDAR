import { describe, it, expect } from 'vitest';
import {
  renderStage1,
  renderStage2,
  renderStage3,
  renderVerdict,
} from '../../../src/js/renderers.js';

describe('Layer 4: End-to-End User Journey & UI Renderer Contract Tests (09_testing/e2e.md)', () => {
  describe('HTML & XSS Escaping Protection', () => {
    it('escapes malicious script tags in input source URLs, publishers, and raw previews', () => {
      const maliciousInput = {
        type: 'article',
        source_url: 'https://example.com/article"<script>alert("xss")</script>',
        publisher: 'BadPublisher<iframe src="evil.com">',
        retrieved_at: new Date().toISOString(),
        extraction_status: 'success',
        raw_text_preview: '<img src=x onerror=alert(1)>Malicious text payload',
      };

      const html = renderStage1(maliciousInput);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;iframe');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes untrusted user content in extracted claims and opinions', () => {
      const maliciousClaims = [
        {
          id: 'clm-xss-1',
          domain: 'Health<script>alert(1)</script>',
          temporal: 'historical',
          text: 'Claims with <a href="javascript:alert(1)">evil link</a> inside',
          entities: ['<b onmouseover=alert(1)>entity</b>'],
        },
      ];
      const removedOpinions = ['<script>evilOpinion()</script>'];

      const html = renderStage2(maliciousClaims, removedOpinions);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<a href="javascript:alert(1)">');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;a href=&quot;javascript:alert(1)&quot;&gt;');
    });

    it('escapes raw provider error messages or reasoning in Stage 3 and Verdict', () => {
      const claims = [{ id: 'clm-001', domain: 'Security', text: 'Security claim' }];
      const researchItems = [
        {
          claim_id: 'clm-001',
          hermes_plan: {
            research_question: '<script>alert("plan")</script>',
            required_facts: ['Fact 1'],
            tavily_queries: ['query1'],
          },
          sources: [
            {
              title: '<b onload=alert(1)>Title</b>',
              stance: 'supporting',
              publisher: 'Pub',
              published_date: '2024-01-01',
              source_type: 'official_body',
              url: 'https://example.com',
              excerpt: '<script>alert("excerpt")</script>',
            },
          ],
          groq_analysis: '<script>alert("groq")</script>',
          gemini_analysis: '<script>alert("gemini")</script>',
        },
      ];

      const htmlStage3 = renderStage3(researchItems, claims);
      expect(htmlStage3).not.toContain('<script>');
      expect(htmlStage3).toContain('&lt;script&gt;');

      const verdicts = [
        {
          claim_id: 'clm-001',
          grok: { verdict: 'supported', confidence: 95, reasoning: '<script>grok</script>' },
          gemini: { verdict: 'supported', confidence: 95, reasoning: '<script>gemini</script>' },
          final: { verdict: 'supported', rationale: '<script>final</script>', sources_cited: ['src-001'] },
        },
      ];

      const htmlVerdict = renderVerdict(verdicts, claims);
      expect(htmlVerdict).not.toContain('<script>');
      expect(htmlVerdict).toContain('&lt;script&gt;');
    });
  });

  describe('UI Renderer Contract Structure', () => {
    it('renders Stage 1 metadata table and text preview container', () => {
      const input = {
        type: 'text',
        retrieved_at: new Date().toISOString(),
        extraction_status: 'success',
        raw_text_preview: 'Preview text for UI render.',
      };
      const html = renderStage1(input);
      expect(html).toContain('id="stage1"');
      expect(html).toContain('DIRECT STATEMENT');
      expect(html).toContain('Preview text for UI render.');
    });

    it('renders Stage 2 claims list and removed opinions banner', () => {
      const claims = [
        { id: 'clm-01', domain: 'Politics', temporal: '2024', text: 'Government passed bill.', entities: ['Government'] },
      ];
      const opinions = ['This bill is bad.'];
      const html = renderStage2(claims, opinions);

      expect(html).toContain('id="stage2"');
      expect(html).toContain('1 FACTUAL CLAIM EXTRACTED');
      expect(html).toContain('1 OPINION REMOVED');
      expect(html).toContain('Government passed bill.');
    });

    it('renders Stage 5 Verdict section with overall summary metrics and disclaimer', () => {
      const claims = [{ id: 'clm-01', domain: 'Health', text: 'Vaccine efficacy is 95%.' }];
      const verdicts = [
        {
          claim_id: 'clm-01',
          grok: { verdict: 'supported', confidence: 92, reasoning: 'Solid evidence.' },
          gemini: { verdict: 'supported', confidence: 94, reasoning: 'Confirmed.' },
          final: { verdict: 'supported', rationale: 'Consensus supported.', sources_cited: ['src-01'] },
        },
      ];

      const html = renderVerdict(verdicts, claims);

      expect(html).toContain('id="stage-verdict"');
      expect(html).toContain('Final Verdict');
      expect(html).toContain('VERIFY ANOTHER CLAIM');
      expect(html).toContain('Supported');
      expect(html).toContain('BAATMEEDAR presents evidence-based analysis');
    });
  });
});
