# Baatmeedar — AI Provider Integration Prompt

## Purpose

Use this prompt to add, replace, or review a server-side AI-provider integration for Baatmeedar. The goal is an auditable stage-specific adapter, not a generic chat feature.

First read `prompts/00_master/project_context.md`, `prompts/00_master/coding_rules.md`, `README.md`, `docs/api.md`, and `docs/instruction_for_Hermes_agent.md`. The committed application is a vanilla static frontend whose `src/js/api.js` currently has `USE_MOCK = true`. It renders a mock five-stage result; it contains no live Gemini, Groq, Grok/xAI, Tavily, transcript, database, or backend implementation.

## Inputs

```text
requested workflow stage: <Stage 2, Stage 3 analysis, Stage 4 verification, etc.>
provider and model decision: <approved provider/model, or decision needed>
required input and output contract: <schema/version>
latency, cost, privacy, and availability constraints: <known facts only>
existing backend/runtime: <verified code only>
```

If the provider, model, authentication, data retention, or source-of-truth decision is unknown, identify it as an open decision. Do not infer that an environment-variable placeholder is a working integration.

## Stage responsibilities

Use a separate adapter and prompt contract for each responsibility:

| Stage | Allowed responsibility |
| --- | --- |
| Stage 2 Gemini | Remove non-verifiable material from the verification queue, extract atomic factual claims, and classify domain/context. It does not verify claims. |
| Stage 3 Hermes | Plan research only; it does not retrieve evidence or decide truth. |
| Stage 3 Groq | Identify missing context, logical gaps, counterevidence, and questions the evidence must answer. |
| Stage 3 Gemini | Define material terms, flag ambiguity/misinformation patterns, and assess evidence coverage. |
| Stage 4 Grok/xAI | Independently verify a claim against the supplied evidence packet. |
| Stage 4 Gemini | Independently verify the same claim against the supplied evidence packet, without seeing Grok/xAI's result. |
| Stage 5 synthesis | Produce `supported`, `contradicted`, or `inconclusive` from the attributed evidence and verifier records; it is not a vote count. |

**Groq and Grok/xAI are different providers.** Do not substitute one for the other. `docs/api.md` and `.env.example` name Gemini, Groq, and Tavily, but do not currently define a Grok/xAI key; introduce a clearly named backend-only requirement only after confirming the provider decision.

## Required implementation rules

1. Put provider calls behind small, typed interfaces. Application/domain logic must not depend directly on a vendor SDK or response shape.
2. Load credentials, endpoints, model identifiers, timeouts, retries, request limits, and feature flags from centrally validated server-side configuration. Never ship them to the static browser client, fixtures, commits, logs, or error messages.
3. Send only the minimum data needed for the stage. Treat user text, articles, transcripts, search output, and earlier model output as untrusted data delimited from instructions.
4. Require structured output and validate it before a later stage, UI, or database consumes it. Reject, repair through a bounded retry, or mark the stage partial/failed when output is invalid; never silently coerce material omissions.
5. Record provider/model name, prompt version, request correlation/run ID, invocation time, input/output validation result, latency, retry count, usage/cost metadata when available, and a redacted error classification.
6. Preserve evidence provenance. A model can cite only supplied evidence IDs; it may not invent a URL, quote, date, source, or successful tool result from memory.
7. Enforce independent-verifier isolation. Build separate Stage 4 inputs from the same evidence packet and do not pass either verifier's verdict, confidence, or hidden reasoning to the other.
8. Make provider failures honest: distinguish unavailable, timeout, rate-limited, malformed response, safety refusal, and partial result. A failure or empty evidence packet cannot become a confident verdict.

## Required contracts

Define stage input/output schemas before implementation. At minimum include:

- stable run, claim, source, evidence, and invocation IDs;
- the original atomic claim and material temporal/scope context;
- allowed verdict enum: `supported`, `contradicted`, `inconclusive`;
- evidence IDs and exact provided excerpts for every evidence-grounded conclusion;
- confidence only when calibrated and bounded by the contract;
- limitations, unresolved questions, and validation status;
- prompt/model versions and redacted errors outside public responses.

Map the final result deliberately to the current client payload shape: `input`, `claims`, `removed_opinions`, `research`, and `verdicts`. The existing renderer uses fields such as `research[].hermes_plan`, `sources[]`, `groq_analysis`, `gemini_analysis`, `verdicts[].grok`, `verdicts[].gemini`, and `verdicts[].final`.

## Deliverables

1. Adapter interfaces, configuration requirements, and structured schemas for the requested stages.
2. The chosen retry, timeout, cancellation, idempotency, and partial-result behavior expressed as configuration/policy, not hidden constants.
3. Prompt versions and output-validation logic.
4. Provider fakes and deterministic tests for successful, malformed, rate-limited, timed-out, unsafe, and conflicting-output cases.
5. Documentation that lists actual versus deferred integrations and any credentials or product decisions still needed.

## Acceptance criteria

- No secret or raw provider response reaches the browser or repository.
- A provider can be swapped for a fake without changing domain logic.
- Every model-derived statement is traceable to its stage, version, inputs, and evidence IDs.
- No integration claim exceeds what has actually been implemented and tested.
- `inconclusive`, partial, and actionable error outcomes remain visible to the user.
