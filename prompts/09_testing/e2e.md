# Baatmeedar — End-to-End Testing Prompt

Use this prompt to test a user journey from the browser to a controlled backend and back. The current frontend can be tested in mock mode, but that is not a live end-to-end verification.

## Journeys

Cover direct statement, article URL, and YouTube URL submission; accessible tab/form behavior; progress stages; completion; partial/failure/cancel states; source/evidence inspection; and “verify another claim.” Use a local/staging server with deterministic run fixtures.

## Requirements

- Assert no secret, stack trace, raw provider error, or unescaped user/source text appears in UI.
- Verify timeout/polling behavior, network loss, invalid input, blocked URL, unavailable transcript, no evidence, contradictory evidence, `inconclusive`, and verifier disagreement.
- Test responsive keyboard-accessible rendering and the contract fields used by `renderers.js`.
- Do not use real public claims or live API keys as a test oracle; label any mock demonstration clearly.

## Output

Return automated journeys, test environment setup, screenshots/logs with sensitive data removed, and release criteria. Acceptance requires a user never seeing a fabricated success when a stage failed.
