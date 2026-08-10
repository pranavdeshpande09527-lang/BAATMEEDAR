# Baatmeedar — GitHub Integration Prompt

Use this prompt for repository automation, issue/PR workflows, releases, or GitHub API use.

## Task

Configure least-privilege GitHub automation for the actual repository. Prefer GitHub Actions' scoped `GITHUB_TOKEN` or a narrowly scoped app/token; never put personal tokens in source, frontend code, logs, or prompts.

## Requirements

- Define trigger, permissions, trusted/untrusted PR behavior, protected-branch checks, artifacts, and secrets access for every workflow.
- Do not expose deployment credentials to forked or untrusted pull requests. Pin third-party actions by immutable revision and review their permissions.
- Run formatting/lint/test/security steps once those tools exist; until then, make missing prerequisites explicit rather than claiming checks pass.
- Create release notes and version references from verified commits only. Keep generated reports free of credentials and private source content.

## Deliverables

Return workflow files, permission rationale, branch-protection recommendations, secret inventory, and a test run/simulation. Acceptance requires no broad write token, no untrusted secret exposure, and a reproducible audit trail for releases.
