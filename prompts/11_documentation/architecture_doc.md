# Baatmeedar — Architecture Documentation Prompt

Use this prompt to document the system as implemented, separating current facts from proposed architecture.

## Task

Produce an architecture document that identifies the current static vanilla HTML/CSS/JS frontend and its mock API layer, then describes only approved future backend components as proposed. Cover the five-stage workflow, client/API contract, trust boundaries, data flow, provider adapters, storage/auth decision, async work, security controls, observability, and deployment.

## Requirements

Include a diagram, component responsibilities, status/state machine, provenance model, sequence from input to final result, config/secret boundaries, verifier isolation, and failure/partial/cancellation paths. Explain that Groq and Grok/xAI are distinct and that no provider/database/backend exists until implemented. Link source/evidence IDs through the model.

## Deliverables

State assumptions, decisions, open questions, and implementation/deferred status. Acceptance requires a new engineer to understand what is real, what needs selection, and why the product can return `inconclusive`.
