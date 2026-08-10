# Baatmeedar — LLM Prompt Design Prompt

Use this prompt to author or review any model instruction used in Baatmeedar.

## Task

Write a versioned, stage-specific prompt that produces only its permitted part of the five-stage workflow. The current static UI contains illustrative mock text, not valid live model output.

## Required prompt structure

1. State role and narrow task.
2. State trusted instructions separately from untrusted user text, web pages, transcripts, tool output, and prior model output.
3. Define allowed inputs, explicit constraints, and what the model must not do.
4. Require a strict JSON/schema output with stable IDs and permitted enums.
5. Require uncertainty, limitations, missing evidence, and evidence IDs where relevant.
6. State no-fabrication rules: no imagined citations, quotes, dates, retrievals, tool results, credentials, or verdicts outside the stage.

## Stage boundaries

- Gemini Stage 2 extracts atomic factual claims; it does not verify.
- Hermes plans research; it does not retrieve or decide truth.
- Groq/Gemini Stage 3 analyze evidence gaps separately.
- Grok/xAI and Gemini Stage 4 independently verify the same evidence packet without seeing each other.
- Editorial synthesis uses only supplied attributed records and permits `inconclusive`.

## Deliverables

Return the prompt text, input/output schema, examples of valid and rejected output, version ID, data-minimization notes, and tests for injection, ambiguous claims, empty evidence, fabricated citations, malformed JSON, and conflicting evidence. Acceptance requires server-side schema validation before any result is stored or rendered.
