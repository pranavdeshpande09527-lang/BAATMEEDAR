# Baatmeedar — Reusable Coding Style Prompt

Write small, named, composable functions with explicit types/schemas and clear domain names (`VerificationRun`, `Claim`, `Evidence`, `VerifierResult`). Keep provider-specific SDK code in adapters and configuration centralized. Avoid hidden global state, duplicated prompts, magic operational values, unbounded retries, and client-side security decisions.

Prefer immutable/versioned provenance records and closed enums. Return explicit expected-failure results instead of swallowing errors. Escape or safely render untrusted text. Comments should explain non-obvious trust, workflow, or evidence decisions—not restate code. Match existing project style unless an approved foundation introduces a new stack.
