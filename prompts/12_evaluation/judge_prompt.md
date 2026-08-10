# Baatmeedar — Quality Judge Prompt

Use this rubric to evaluate an implementation or result without letting style conceal missing evidence.

## Score dimensions

Score 0–4 with evidence for: workflow fidelity; evidence provenance/inspectability; epistemic honesty and `inconclusive`; verifier isolation; security/privacy; safe retrieval/input validation; API/data-contract correctness; test quality; observability; accessibility; documentation accuracy; and scope discipline.

## Hard failures

Flag fabricated source/model/tool claims; a search snippet treated as evidence; Groq/Grok conflation; a Stage 4 verifier seeing the other's result; client-exposed secret; unprotected cross-user data; unsafe URL retrieval; unredacted errors; or mock behavior presented as live.

## Output

Return the scorecard, cited implementation evidence, release blockers, recommended next changes, and confidence in the review. Judge the repository as it exists, not its intended architecture.
