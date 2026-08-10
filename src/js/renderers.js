/**
 * BAATMEEDAR — Stage Renderers
 * 
 * Pure functions that take data objects and return HTML strings.
 * No DOM manipulation here — only HTML generation.
 */

/* ─────────────────────────────────────────────────────────────
   STAGE 1 — Source Information
   ───────────────────────────────────────────────────────────── */
export function renderStage1(input) {
  const typeLabels = { text: 'DIRECT STATEMENT', article: 'ARTICLE LINK', youtube: 'YOUTUBE LINK' };
  const typeLabel = typeLabels[input.type] || input.type.toUpperCase();

  const metaRows = [
    ['INPUT TYPE', typeLabel],
    input.source_url ? ['SOURCE URL', `<a href="${escHtml(input.source_url)}" target="_blank" rel="noopener">${escHtml(input.source_url)}</a>`] : null,
    input.publisher  ? ['PUBLISHER',  escHtml(input.publisher)] : null,
    ['RETRIEVED',   formatDatetime(input.retrieved_at)],
    ['STATUS',      input.extraction_status === 'success' ? 'Extracted successfully' : `<span class="status-err">${escHtml(input.extraction_status)}</span>`],
  ].filter(Boolean);

  return `
    <section class="stage-section" id="stage1">
      <div class="stage-header">
        <span class="stage-number">STAGE 1</span>
        <span class="stage-title">Source Information</span>
        <span class="stage-meta">Input collected</span>
      </div>
      <div class="meta-table" style="margin-top: var(--sp-4);">
        ${metaRows.map(([k, v]) => `
          <div class="meta-row">
            <span class="meta-key">${k}</span>
            <span class="meta-val">${v}</span>
          </div>`).join('')}
      </div>
      ${input.raw_text_preview ? `
        <div style="margin-top: var(--sp-5);">
          <div class="section-label" style="margin-bottom: var(--sp-2);">Extracted Text (Preview)</div>
          <div class="inset source-text-preview" id="raw-text-preview">
            ${escHtml(input.raw_text_preview)}
          </div>
          <button class="show-more-btn" onclick="toggleRawText(this)" aria-expanded="false">
            SHOW FULL TEXT ↓
          </button>
        </div>` : ''}
    </section>`;
}

/* ─────────────────────────────────────────────────────────────
   STAGE 2 — Extracted Claims
   ───────────────────────────────────────────────────────────── */
export function renderStage2(claims, removedOpinions) {
  const claimsHtml = claims.map((claim, i) => `
    <div class="claim-item" id="claim-${escHtml(claim.id)}">
      <div class="claim-item-header">
        <span class="claim-number">CLAIM #${i + 1}</span>
        <span class="claim-domain">${escHtml(claim.domain)}</span>
        <span class="claim-temporal">${escHtml(claim.temporal)}</span>
      </div>
      <div class="claim-text">&ldquo;${escHtml(claim.text)}&rdquo;</div>
      ${claim.entities?.length ? `
        <div style="margin-top: var(--sp-2); font-size: 11px; color: var(--ink-faint);">
          ENTITIES: ${claim.entities.map(e => escHtml(e)).join(' &middot; ')}
        </div>` : ''}
    </div>`).join('');

  const opinionsHtml = removedOpinions?.length ? `
    <div class="removed-opinions">
      <div class="ro-label">Removed as Opinion / Non-Verifiable (${removedOpinions.length})</div>
      ${removedOpinions.map(op => `
        <div class="removed-item">&ldquo;${escHtml(op)}&rdquo;</div>`).join('')}
    </div>` : '';

  return `
    <section class="stage-section" id="stage2">
      <div class="stage-header">
        <span class="stage-number">STAGE 2</span>
        <span class="stage-title">Claims &amp; Domains</span>
        <span class="stage-meta">Processed by Gemini</span>
      </div>
      <div class="claims-summary" style="margin-top: var(--sp-4);">
        ${claims.length} FACTUAL CLAIM${claims.length !== 1 ? 'S' : ''} EXTRACTED
        ${removedOpinions?.length ? ` &middot; ${removedOpinions.length} OPINION${removedOpinions.length !== 1 ? 'S' : ''} REMOVED` : ''}
      </div>
      ${claimsHtml}
      ${opinionsHtml}
    </section>`;
}

/* ─────────────────────────────────────────────────────────────
   STAGE 3 — Research per Claim
   ───────────────────────────────────────────────────────────── */
export function renderStage3(researchItems, claims) {
  const claimMap = Object.fromEntries(claims.map(c => [c.id, c]));

  const blocksHtml = researchItems.map((item, i) => {
    const claim = claimMap[item.claim_id] || {};
    const plan  = item.hermes_plan || {};
    const sources = item.sources || [];

    const sourcesHtml = sources.map((src, si) => `
      <div class="source-entry">
        <div>
          <span class="src-index">[${si + 1}]</span>
          <span class="src-title">${escHtml(src.title)}</span>
          &nbsp;&nbsp;<span class="src-stance-${src.stance}">${src.stance.toUpperCase()}</span>
        </div>
        <div class="src-meta">
          ${escHtml(src.publisher)} &middot; Published: ${src.published_date || 'N/A'}
          &middot; Type: ${escHtml(src.source_type)}
          &middot; <a href="${escHtml(src.url)}" target="_blank" rel="noopener">View Source ↗</a>
        </div>
        <div class="src-excerpt">&ldquo;${escHtml(src.excerpt)}&rdquo;</div>
      </div>`).join('');

    return `
      <div class="research-claim-block">
        <div class="research-claim-label">CLAIM #${i + 1} &mdash; ${escHtml(claim.domain || '')}</div>
        <div class="research-claim-quote">&ldquo;${escHtml(claim.text || '')}&rdquo;</div>

        <div class="research-subsection">
          <div class="research-sub-label">Hermes Research Plan</div>
          <div class="research-plan-text">
            <strong>Research question:</strong> ${escHtml(plan.research_question || '')}
          </div>
          ${plan.required_facts?.length ? `
            <div style="margin-top: var(--sp-2); font-size: 12px; color: var(--ink-muted);">
              <strong>Required facts:</strong> ${plan.required_facts.map(f => escHtml(f)).join(' &middot; ')}
            </div>` : ''}
          ${plan.tavily_queries?.length ? `
            <div style="margin-top: var(--sp-2); font-size: 12px; color: var(--ink-muted);">
              <strong>Search queries:</strong> ${plan.tavily_queries.map(q => `&ldquo;${escHtml(q)}&rdquo;`).join(', ')}
            </div>` : ''}
        </div>

        ${sources.length ? `
          <div class="research-subsection">
            <div class="research-sub-label">Tavily Sources Retrieved (${sources.length})</div>
            ${sourcesHtml}
          </div>` : ''}

        <div class="cols-2" style="gap: var(--sp-4); margin-top: var(--sp-4);">
          <div class="research-subsection">
            <div class="analysis-label">Groq Analysis</div>
            <div class="analysis-text">${escHtml(item.groq_analysis || 'Analysis pending.')}</div>
          </div>
          <div class="research-subsection">
            <div class="analysis-label">Gemini Analysis</div>
            <div class="analysis-text">${escHtml(item.gemini_analysis || 'Analysis pending.')}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <section class="stage-section" id="stage3">
      <div class="stage-header">
        <span class="stage-number">STAGE 3</span>
        <span class="stage-title">Research &amp; Evidence</span>
        <span class="stage-meta">Hermes &middot; Tavily &middot; Groq &middot; Gemini</span>
      </div>
      <div style="margin-top: var(--sp-4);">
        ${blocksHtml}
      </div>
    </section>`;
}

/* ─────────────────────────────────────────────────────────────
   FINAL VERDICT
   ───────────────────────────────────────────────────────────── */
export function renderVerdict(verdicts, claims) {
  const claimMap = Object.fromEntries(claims.map(c => [c.id, c]));

  const counts = { supported: 0, contradicted: 0, inconclusive: 0 };
  verdicts.forEach(v => { if (v.final?.verdict) counts[v.final.verdict]++; });

  const verdictBlocksHtml = verdicts.map((v, i) => {
    const claim  = claimMap[v.claim_id] || {};
    const grok   = v.grok   || {};
    const gemini = v.gemini || {};
    const final  = v.final  || {};
    const fv     = final.verdict || 'inconclusive';

    // Collect source links for verdict footer
    const srcIds = [...new Set([...(grok.evidence_ids||[]), ...(gemini.evidence_ids||[])])];

    return `
      <div class="verdict-claim-block">
        <div class="verdict-claim-header">
          <span class="verdict-claim-num">CLAIM #${i + 1}</span>
          ${claim.domain ? `<span class="verdict-claim-domain">${escHtml(claim.domain)}</span>` : ''}
        </div>
        <div class="verdict-claim-text">&ldquo;${escHtml(claim.text || '')}&rdquo;</div>

        <div class="verifier-columns">
          <div class="verifier-col">
            <div class="verifier-name">Grok / xAI — Independent Verifier</div>
            <div class="verifier-verdict-line">
              <span class="verifier-verdict-text ${grok.verdict || 'inconclusive'}">
                ${(grok.verdict || 'inconclusive').toUpperCase()}
              </span>
              ${grok.confidence != null ? `<span class="verifier-confidence">Confidence: ${grok.confidence}%</span>` : ''}
            </div>
            <div class="verifier-reasoning">${escHtml(grok.reasoning || 'No reasoning provided.')}</div>
            ${grok.limitations ? `<div style="margin-top: var(--sp-2); font-size: 11px; font-style: italic; color: var(--ink-faint);">${escHtml(grok.limitations)}</div>` : ''}
          </div>
          <div class="verifier-col">
            <div class="verifier-name">Gemini — Independent Verifier</div>
            <div class="verifier-verdict-line">
              <span class="verifier-verdict-text ${gemini.verdict || 'inconclusive'}">
                ${(gemini.verdict || 'inconclusive').toUpperCase()}
              </span>
              ${gemini.confidence != null ? `<span class="verifier-confidence">Confidence: ${gemini.confidence}%</span>` : ''}
            </div>
            <div class="verifier-reasoning">${escHtml(gemini.reasoning || 'No reasoning provided.')}</div>
            ${gemini.limitations ? `<div style="margin-top: var(--sp-2); font-size: 11px; font-style: italic; color: var(--ink-faint);">${escHtml(gemini.limitations)}</div>` : ''}
          </div>
        </div>

        <div class="final-determination">
          <span class="fd-label">Final Determination</span>
          <span class="fd-verdict ${fv}">${fv.toUpperCase()}</span>
          <span class="fd-rationale">${escHtml(final.rationale || '')}</span>
        </div>

        <div class="verdict-footer">
          ${final.limitations ? `
            <div class="vf-row">
              <span class="vf-key">Limitations</span>
              <span class="vf-val">${escHtml(final.limitations)}</span>
            </div>` : ''}
          ${final.sources_cited?.length ? `
            <div class="vf-row">
              <span class="vf-key">Sources</span>
              <span class="vf-val">${final.sources_cited.map(id => escHtml(id)).join(' &middot; ')}</span>
            </div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <section class="verdict-section" id="stage-verdict">
      <div class="verdict-masthead">
        <div class="verdict-masthead-title">Final Verdict</div>
        <div class="verdict-masthead-sub">Independent AI Verification Results</div>
      </div>

      ${verdictBlocksHtml}

      <div class="overall-summary">
        <div class="os-label">Verification Summary — ${verdicts.length} Claim${verdicts.length !== 1 ? 's' : ''} Examined</div>
        <div class="os-stats">
          <div class="os-stat-item">
            <span class="os-stat-value supported">${counts.supported}</span>
            <span class="os-stat-label">Supported</span>
          </div>
          <div class="os-stat-item">
            <span class="os-stat-value contradicted">${counts.contradicted}</span>
            <span class="os-stat-label">Contradicted</span>
          </div>
          <div class="os-stat-item">
            <span class="os-stat-value inconclusive">${counts.inconclusive}</span>
            <span class="os-stat-label">Inconclusive</span>
          </div>
        </div>
        <div class="os-disclaimer">
          BAATMEEDAR presents evidence-based analysis from independent AI evaluators. 
          Verdicts reflect the weight of retrieved evidence and should not be treated as a 
          substitute for professional fact-checking, legal, medical, or financial advice. 
          Evidence currency is limited to sources available at retrieval time.
        </div>
      </div>

      <div class="new-verify-row">
        <button class="btn-primary" onclick="window.BAATMEEDAR.reset()" id="btn-new-verify">
          VERIFY ANOTHER CLAIM
        </button>
      </div>
    </section>`;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDatetime(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return iso; }
}
