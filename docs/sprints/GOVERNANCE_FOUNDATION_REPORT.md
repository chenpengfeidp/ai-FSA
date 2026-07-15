# Governance Foundation Report

## Status

Milestone 3A.5 AI Collaboration Governance is complete.

This task established repository-wide guidance and state tracking for future human and AI contributors. No existing application, configuration, architecture, or implementation file was modified.

## Files Created

- `AGENTS.md`
  - Canonical entry point for AI agents.
  - Defines authority, architecture, engineering principles, workflow, sprint rules, validation, and reading order.
- `docs/PROJECT_STATE.md`
  - Records the current milestone, sprint status, repository capabilities, architecture state, constraints, known alignment work, and roadmap.
- `docs/DEVELOPMENT_WORKFLOW.md`
  - Defines the governed lifecycle from idea through retrospective and explains when work must return to an earlier stage.
- `docs/sprints/GOVERNANCE_FOUNDATION_REPORT.md`
  - Records the governance work, decisions, maintenance model, and resulting repository posture.

All four files were absent before this task and were therefore created.

## Engineering Decisions

- `AGENTS.md` is the universal AI collaboration entry point, while numbered documents and ADRs retain authority over product and architecture contracts.
- `docs/PROJECT_STATE.md` is a mutable operational snapshot, not a replacement for canonical architecture or historical sprint evidence.
- `docs/DEVELOPMENT_WORKFLOW.md` governs process; `docs/15_DEVELOPMENT_GUIDE.md` remains authoritative for coding, testing, Git, and release conventions.
- Sprint reports remain evidence records and do not redefine architecture.
- Authority conflicts are resolved through an explicit hierarchy beginning with the Project Bible and accepted ADRs.
- Sprint boundaries require separate authorization; agents must stop before the next sprint.
- AI agents may not infer missing approval, create speculative packages, bypass validation, or expand bootstrap work into business functionality.
- The repository's existing `docs/21_ARCHITECTURE_SIGNOFF.md` was accepted as the implementation gate for this task because `docs/21_IMPLEMENTATION_GATE.md` does not exist.
- Milestone 3A.5 is recorded as governance work aligned with the v0.1 / M1 Foundation bootstrap. It does not complete Milestone 3A or canonical v0.1.
- Known pre-existing documentation drift is made visible in the project snapshot rather than silently corrected outside this task's allowed file set.

## Future Maintenance Strategy

### After Every Sprint

Update `docs/PROJECT_STATE.md` to:

- advance the snapshot date;
- identify the current and next sprint;
- record completed scope and evidence;
- update repository capabilities and constraints;
- link the new sprint report;
- identify newly opened or resolved architecture conditions.

### When Governance Changes

- Update `AGENTS.md` only for repository-wide AI collaboration rules, authority, or reading-order changes.
- Update `docs/DEVELOPMENT_WORKFLOW.md` only when lifecycle stages, gates, or delivery responsibilities change.
- Update the owning numbered document for product, domain, engine, API, persistence, monorepo, or architecture changes.
- Create or supersede an ADR for durable architecture decisions.
- Use a new gate/sign-off record when implementation authorization or binding conditions change.

### During Reviews

Reviewers should confirm:

- current state matches actual repository behavior;
- sprint and release claims do not exceed evidence;
- links and document roles remain clear;
- no sprint report has become a competing source of truth;
- AI-agent rules remain concise, actionable, and provider-neutral;
- known documentation drift has an owner or remains explicitly visible.

## Repository Governance Summary

The repository now provides a self-describing governance path:

1. `AGENTS.md` tells every agent how to operate.
2. `docs/PROJECT_STATE.md` identifies the current delivery state.
3. `README.md` and the Project Bible introduce the product mission.
4. Numbered documents define canonical architecture contracts.
5. ADRs record durable decisions.
6. The implementation plan and architecture sign-off authorize bounded delivery.
7. `docs/DEVELOPMENT_WORKFLOW.md` defines the engineering lifecycle.
8. Sprint instructions authorize one implementation slice.
9. Sprint reports preserve validation evidence and remaining work.

This structure is tool-neutral and applies to Cursor, ChatGPT, Codex, Claude Code, Gemini CLI, and future agents.

No Sprint 3 work was started.
