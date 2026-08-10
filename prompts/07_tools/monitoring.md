# Baatmeedar — Monitoring Integration Prompt

Use this prompt to add operational monitoring after a backend exists.

## Task

Instrument the verification lifecycle with privacy-safe logs, metrics, traces, dashboards, and alerts. Monitor both technical health and epistemic workflow quality without collecting secrets or raw content by default.

## Required signals

Track request/run counts, stage latency, queue depth, completion/partial/failure/cancellation rates, provider timeout/rate-limit/malformed-output rates, safe URL blocks, retry counts, cost/usage where available, and evidence/verdict validation failures. Correlate by redacted run ID.

## Guardrails

Do not send API keys, cookies, full articles/transcripts, prompts, raw model outputs, or personally identifying values to a monitoring vendor. Configure retention, access, sampling, alert thresholds, and incident escalation. Alerts must distinguish external provider outage from application defect and must not claim content is true/false.

## Deliverables

Provide event schema, dashboard/alert design, data-redaction policy, test event, and incident runbook. Acceptance requires operators to diagnose a stage failure without exposing a user's private verification material.
