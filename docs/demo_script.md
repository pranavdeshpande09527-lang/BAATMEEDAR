# Baatmeedar — 2 to 3 Minute Live Demo Script

> **Target Duration**: 2 minutes 30 seconds  
> **Presenter**: Product Lead / Technical Architect  
> **Visual Identity**: Newspaper-inspired UI (`src/index.html`)  
> **Integrity Notice**: During browser demonstration with `USE_MOCK = true`, clearly inform the audience that sample processing uses deterministic demonstration data modeling the production backend architecture.

---

## Timed Sequence Breakdown

```
[ 0:00 - 0:30 ] ──► Introduction & Problem Statement
[ 0:30 - 1:00 ] ──► Input Modalities & Stage 1-2 Extraction
[ 1:00 - 1:45 ] ──► Stage 3-4 Research & Independent Dual Verification
[ 1:45 - 2:15 ] ──► Verdict Breakdown & Inconclusive Handling
[ 2:15 - 2:30 ] ──► Closing & Implementation Roadmap
```

---

## Script & Action Plan

### Segment 1: Introduction & Problem Statement (0:00 – 0:30)

- **On-Screen Action**: Open browser to `http://localhost:3000` showing the Baatmeedar newspaper header, masthead, and clear tagline: *"The Gatekeeper of Truth: Evidence-Transparent AI Newsroom"*.
- **Narrator Dialogue**:
  > "Welcome. In an era of automated content generation, digital journalism faces a critical challenge: misinformation spreads faster than traditional newsrooms can verify it, while current AI fact-checking tools act as opaque 'black boxes'—delivering verdicts without evidence or traceable sources.
  > 
  > This is **Baatmeedar**—an evidence-transparent AI newsroom designed to evaluate claims with full source attribution, atomic claim decomposition, and dual independent model verifiers."

---

### Segment 2: Input Modalities & Stage 1–2 Claim Extraction (0:30 – 1:00)

- **On-Screen Action**: Click across the three input selector tabs on the main interface: **Direct Statement**, **Article URL**, and **YouTube Video URL**. Select **Direct Statement**, enter a sample claim (e.g., *"Global coffee production declined by 15% in 2025 due to severe droughts"*), and click **Verify Claim**.
- **Narrator Dialogue**:
  > "Baatmeedar accepts three flexible input formats: direct text statements, news article links via Tavily extraction, or YouTube URLs via automated transcript parsing.
  > 
  > When we submit a statement, Stage 1 ingests the raw content, and Stage 2 uses Google Gemini to filter out subjective opinion, extract atomic factual statements, and classify their domain—in this case, Agriculture and Global Economy."

---

### Segment 3: Domain Research & Independent Dual Verification (1:00 – 1:45)

- **On-Screen Action**: Point out the live stage progress tracker animating from Stage 2 to Stage 3 and Stage 4. Click on the **Evidence Ledger** section to reveal primary source cards, publisher metadata, retrieval timestamps, and direct quotes.
- **Narrator Dialogue**:
  > "In Stage 3, our Hermes orchestration workflow triggers targeted web research via Tavily and fast inference analysis via Groq to collect primary evidence. Every piece of evidence is assigned a unique ID, timestamp, and relevance score.
  > 
  > In Stage 4, Baatmeedar introduces **Independent Dual Verification**. We evaluate the evidence using two isolated frontier models: Evaluator A powered by **Grok from xAI**, and Evaluator B powered by **Google Gemini**. Neither model sees the other's prompt or reasoning, ensuring unbiased consensus."

---

### Segment 4: Transparent Verdicts & Handling Ambiguity (1:45 – 2:15)

- **On-Screen Action**: Expand the verdict summary card. Display the side-by-side evaluator outputs (**Grok**: `supported` 91%, **Gemini**: `supported` 93%) and the final determination badge: `SUPPORTED`. Switch to a second example showing an `INCONCLUSIVE` result due to conflicting sources.
- **Narrator Dialogue**:
  > "Every claim receives one of three standardized verdicts: `supported`, `contradicted`, or `inconclusive`. 
  > 
  > Unlike typical AI assistants that hallucinate answers when facts are unclear, Baatmeedar explicitly flags missing or conflicting evidence as `inconclusive`. We believe evidence transparency is far more valuable than artificial certainty."

---

### Segment 5: Closing Impact & Roadmap (2:15 – 2:30)

- **On-Screen Action**: Return to main dashboard view, showing the full audit trail link and GitHub repository references.
- **Narrator Dialogue**:
  > "Our committed frontend demonstrates this complete 5-stage experience in browser mock mode, while our Node.js Express REST backend provides the production API endpoints. 
  > 
  > Baatmeedar transforms fact-checking from a secret black box into an auditable evidence ledger. Thank you."

---

## Demo Contingency & Fallback Plan

In the event of network disruption, local port conflict, or API timeout during a live presentation:

1. **Local Static Fallback**: Open `src/index.html` directly in the browser via file protocol (`file:///.../src/index.html`). The built-in client state machine (`USE_MOCK = true`) operates entirely offline with zero external network dependencies.
2. **Pre-rendered Run Inspection**: Use the pre-populated sample run tabs on the UI dashboard to immediately showcase a completed 5-stage report without re-submitting.
