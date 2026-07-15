# FAS Development Workflow

## Purpose

This document defines the engineering lifecycle from an idea to governed delivery.

It applies to human contributors and AI agents. It complements `docs/15_DEVELOPMENT_GUIDE.md`, which remains authoritative for coding, testing, Git, and release conventions.

## Lifecycle

```text
Idea
  ↓
Project Bible
  ↓
Architecture
  ↓
ADR
  ↓
Implementation Plan
  ↓
Architecture Review
  ↓
Implementation Gate
  ↓
Sprint Planning
  ↓
Sprint Implementation
  ↓
Code Review
  ↓
Validation
  ↓
Release
  ↓
Retrospective
```

The lifecycle is sequential by default. A stage may be skipped only when it is demonstrably not applicable, and the reason must be visible in the review record.

## 1. Idea

An idea describes a problem, user need, operational risk, or measurable improvement.

It should state:

- who or what is affected;
- the observed problem;
- desired outcome;
- evidence supporting the need;
- important non-goals.

An idea is not implementation authorization.

## 2. Project Bible

The Project Bible defines the mission and supreme principles.

Every proposal must support evidence-first, reviewable analysis and must preserve the distinction between facts, signals, deterministic findings, and inference.

If an idea conflicts with the Project Bible, stop or explicitly propose a Project Bible change before further design.

## 3. Architecture

Architecture defines ownership, boundaries, data flow, lifecycle, trust, and operational shape.

The owning canonical documents must describe:

- domain language and invariants;
- module and dependency direction;
- API and persistence contracts;
- AI authority and validation boundaries;
- failure, replay, versioning, and audit behavior.

Do not use implementation to resolve an undocumented architecture decision.

## 4. Architecture Decision Record

An ADR records a durable decision when the change affects:

- system shape or module boundaries;
- major frameworks or infrastructure;
- persistence or versioning strategy;
- provider, queue, cache, vector, or deployment architecture;
- intentional exceptions to dependency rules.

An ADR includes context, decision, alternatives, consequences, and status.

Supersede prior ADRs; do not silently contradict them.

## 5. Implementation Plan

The implementation plan converts approved architecture into an executable delivery sequence.

It defines:

- scope and exclusions;
- repository and dependency changes;
- implementation order;
- file creation or modification plan;
- compatibility and migration strategy;
- risks and rollback;
- acceptance criteria;
- milestone stop boundary.

The plan must not invent business contracts absent from canonical documents.

## 6. Architecture Review

Architecture review is performed independently from plan authorship where practical.

It checks:

- consistency with the Project Bible and ADRs;
- feasibility and dependency compatibility;
- boundary preservation;
- unnecessary complexity or speculative scaffolding;
- runtime, security, recovery, and validation gaps;
- future evolution without premature infrastructure.

Findings are classified by severity or required disposition.

## 7. Implementation Gate

The implementation gate records whether work may begin and under which conditions.

It:

- approves, rejects, narrows, or defers review findings;
- identifies must-fix items;
- records binding constraints;
- defines required completion evidence;
- prevents unreviewed scope expansion.

“Approved with conditions” means affected work may proceed only after its applicable conditions are satisfied.

## 8. Sprint Planning

A sprint selects one cohesive, reviewable slice from the approved plan.

Every sprint states:

- goal;
- prerequisites;
- included deliverables;
- explicit exclusions;
- permitted change areas;
- acceptance commands and observable behavior;
- required documentation;
- stop instruction.

A sprint must not claim completion of a milestone or release whose exit evidence is incomplete.

## 9. Sprint Implementation

Implementation follows the sprint scope and canonical contracts.

Contributors must:

- inspect current state before editing;
- preserve unrelated work;
- create only capabilities with immediate consumers;
- keep domain policy independent from frameworks;
- use exact approved dependencies;
- add tests and contract updates with behavior changes;
- record compatibility failures and approved fallbacks;
- stop when a higher-authority conflict appears.

AI agents must follow `AGENTS.md` and `docs/PROJECT_STATE.md`.

## 10. Code Review

Code review evaluates correctness, scope, maintainability, and architecture.

Reviewers check:

- behavior against acceptance criteria;
- package and dependency direction;
- error, idempotency, and failure semantics;
- security and secret exposure;
- tests and regression coverage;
- unnecessary abstractions or dependencies;
- documentation and state accuracy;
- whether generated or unrelated files entered the change.

Review is evidence-based. Approval is not a substitute for validation.

## 11. Validation

Validation proves the change works in the intended environment.

The minimum affected-work gates are:

- frozen dependency installation;
- formatting and linting;
- architecture-boundary checks;
- TypeScript typechecking;
- relevant unit, integration, contract, component, and end-to-end tests;
- production builds;
- migration checks when persistence changes;
- runtime smoke checks when services change;
- documentation links and diagrams when contracts change.

Failures are fixed or explicitly returned to the appropriate earlier stage. They are not hidden through skipped checks.

## 12. Release

A release promotes an exact validated artifact set.

Release evidence identifies:

- source revision;
- dependency lockfile;
- build artifacts or image digests;
- migration set and compatibility window;
- configuration schema;
- applicable AI release bundle and validator identities;
- evaluation and security evidence;
- rollback references.

FAS remains private until authentication, authorization, security, and operational gates explicitly permit broader exposure.

## 13. Retrospective

The retrospective compares planned outcomes with observed evidence.

It records:

- what succeeded;
- what failed or surprised the team;
- escaped assumptions and process gaps;
- validation or architecture changes needed;
- owned follow-up actions;
- updates required in `docs/PROJECT_STATE.md`.

Retrospectives improve the workflow; they do not rewrite historical sprint evidence.

## Change Routing

Return to the earliest affected stage when:

- mission or non-goals change: Project Bible;
- domain, API, persistence, or engine behavior changes: Architecture;
- a durable technical decision changes: ADR;
- sequence, dependencies, risk, or acceptance changes: Implementation Plan;
- review conditions change: Implementation Gate;
- only delivery scope changes: Sprint Planning.

Do not patch later stages around an unresolved earlier-stage conflict.

## Required Records

The lifecycle produces these records:

- canonical numbered architecture documents;
- ADRs in `docs/decisions/`;
- approved implementation plans;
- architecture review and gate/sign-off records;
- sprint instructions and reports;
- validation evidence;
- `docs/PROJECT_STATE.md`;
- release and retrospective records when applicable.

Each record has one responsibility. Cross-reference existing authority instead of duplicating it.

## Maintenance

- Review this workflow when the delivery process changes.
- Update `AGENTS.md` when repository-wide AI rules change.
- Update `docs/PROJECT_STATE.md` after every sprint.
- Keep sprint reports immutable except for factual corrections.
- Use ADR supersession for durable decision changes.
- Keep implementation and release claims no broader than demonstrated evidence.
