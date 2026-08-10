# Baatmeedar — Technical Documentation Prompt

Document a specific implemented feature or module for maintainers.

## Include

Purpose and workflow stage; public/internal interfaces and schemas; input validation; dependencies/configuration without values; data ownership/provenance; authorization; error/status behavior; retries/cancellation; observability; tests; performance/cost limits; and operational runbook notes.

## Baatmeedar rules

Distinguish live, mocked, planned, and credential-dependent behavior. Never paste secrets, full `.env`, raw user content, unlicensed source text, or undisclosed prompts. Record how evidence IDs, timestamps, source metadata, and model/prompt versions are preserved, and how independent Stage 4 evaluators remain isolated.

## Acceptance

The documentation lets a maintainer safely use, test, troubleshoot, and change the module without guessing provider behavior or implying factual verification where none occurred.
