# FAS Project State

## Snapshot

- Last updated: 2026-07-15
- Current delivery milestone: Milestone 3A.5 — AI Collaboration Governance
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Current task status: Complete
- Current sprint: No implementation sprint active
- Last completed sprint: Sprint 2 — Application Skeleton
- Next sprint: Sprint 3, not started and not authorized
- Release status: Pre-release; canonical v0.1 is not complete

Update this document after every sprint, implementation gate, or material governance change.

## Current Repository Status

The repository contains:

- a pnpm and Turborepo workspace;
- strict shared TypeScript configuration;
- exact runtime and package-manager pins;
- a minimal NestJS API application;
- a minimal Next.js web application;
- a minimal standalone NestJS worker;
- workspace validation, typechecking, build, and development commands;
- architecture documents, ADRs, sprint reports, and AI-agent governance.

The API currently exposes only:

- `GET /`
- `GET /health/live`
- `GET /health/ready`
- `GET /version`

The web application contains only the repository-bootstrap homepage.

The worker initializes, logs `Worker started.`, and closes without a queue or artificial idle loop.

No football-domain, AI-engine, database, authentication, durable-job, or business behavior exists.

## Current Toolchain

- Node.js: `24.18.0`
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `6.0.3`
- Next.js: `16.2.10`
- React / React DOM: `19.2.7`
- NestJS: `11.1.28`

TypeScript 6 is the approved compatibility fallback. TypeScript 7.0.2 failed because Nest CLI 11 requires a programmatic compiler API that TypeScript 7.0 does not expose.

## Completed Milestones and Gates

- Architecture Design: complete.
- Architecture Completion: complete for the current documented scope.
- ADR-001 through ADR-004: accepted.
- Milestone 3A implementation plan: approved with conditions.
- Milestone 3A Sprint 1 — Repository Foundation: complete.
- Milestone 3A Sprint 2 — Application Skeleton: complete.
- Milestone 3A.5 — AI Collaboration Governance: complete.

Milestone 3A and canonical v0.1 are not complete. Later bootstrap and foundation work remains.

## Completed Sprints

### Sprint 1 — Repository Foundation

- Created root workspace configuration and tracked foundation directories.
- Added workspace validation.
- Introduced no application code.
- Evidence: `docs/22_SPRINT1_REPORT.md`.

### Sprint 2 — Application Skeleton

- Created independently runnable API, web, and worker shells.
- Added required operational API endpoints.
- Added root development commands and production builds.
- Introduced no domain, AI, database, authentication, or queue behavior.
- Evidence: `docs/sprints/SPRINT2_REPORT.md`.

## Architecture Status

Architecture direction is **approved with conditions**.

The governing implementation gate is `docs/21_ARCHITECTURE_SIGNOFF.md`. The requested path `docs/21_IMPLEMENTATION_GATE.md` does not exist; the architecture sign-off is the accepted gate authority for this governance milestone.

The following principles remain binding:

- evidence before assumption;
- minimal V1 infrastructure;
- immediate consumers before packages or abstractions;
- modular-monolith boundaries;
- deterministic policy outside generative AI;
- provider-neutral AI ports;
- PostgreSQL durable jobs before any Redis/BullMQ adoption;
- append-only match-result versions;
- executable acceptance evidence.

Open Milestone 3A conditions include quality tooling, boundary enforcement, tests, Prisma no-model bootstrap, container strategy and acceptance, deterministic smoke testing, security gates, CI, and documentation alignment.

## Approved Documents

### Governing and Canonical

- `docs/00_PROJECT_BIBLE.md`
- `docs/01_PRODUCT.md` through `docs/19_DATABASE_ERD.md`
- `docs/decisions/ADR-001-modular-monolith-and-typescript-monorepo.md`
- `docs/decisions/ADR-002-postgresql-durable-jobs-for-v1.md`
- `docs/decisions/ADR-003-provider-neutral-ai-and-staged-retrieval.md`
- `docs/decisions/ADR-004-append-only-match-result-versions.md`

### Implementation Authority

- `docs/20_IMPLEMENTATION_PLAN.md`
- `docs/21_ARCHITECTURE_SIGNOFF.md`

The sign-off narrows and conditions the implementation plan where they differ.

### Governance and Evidence

- `AGENTS.md`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/PROJECT_STATE.md`
- `docs/22_SPRINT1_REPORT.md`
- `docs/sprints/SPRINT2_REPORT.md`
- `docs/sprints/GOVERNANCE_FOUNDATION_REPORT.md`

Sprint reports are evidence records, not replacements for canonical architecture.

## Known Constraints

- V1 is private and trusted-environment only.
- Public exposure is prohibited until authentication and authorization are designed and implemented.
- Live or in-play analysis is out of scope.
- AI cannot make authoritative deterministic, lifecycle, publication, or governance decisions.
- No AI provider or engine implementation is currently authorized.
- No Prisma schema, PostgreSQL runtime, durable jobs, Redis, BullMQ, pgvector, or object storage is implemented.
- No speculative engine or shared business packages may be created.
- Direct dependencies are exact-pinned and the root lockfile is authoritative.
- Generated Next.js type files are reproducible and uncommitted.
- The worker must not use a fake persistence loop before durable work exists.
- Sprint boundaries require separate approval.

## Known Documentation Alignment Work

The following pre-existing documents are not changed by Milestone 3A.5:

- `README.md` still describes the repository as architecture-only and does not list documents 20 and 21.
- `docs/14_MONOREPO.md` still references an ESLint configuration package, while the approved bootstrap selects Biome plus dependency-cruiser.
- `docs/20_IMPLEMENTATION_PLAN.md` still lists TypeScript 7.0.2, while Sprint 2 recorded and applied the approved TypeScript 6.0.3 fallback.

These are explicit alignment items for a separately authorized documentation or implementation change. They must not be treated as current runtime truth.

## Next Sprint

Sprint 3 has not been approved or scoped.

Before Sprint 3:

1. define its exact goal, allowed files, exclusions, and acceptance criteria;
2. read `AGENTS.md`, this state file, the Project Bible, implementation plan, and architecture sign-off;
3. select only the next cohesive Milestone 3A capability;
4. resolve any applicable must-fix condition before affected implementation;
5. stop if the work would introduce business or AI-engine behavior.

## Future Roadmap

- Complete Milestone 3A repository-bootstrap quality, persistence, container, CI, and operational gates.
- Complete the remaining v0.1 Foundation work: durable PostgreSQL jobs, audit/idempotency, approved persistence, and operational baselines.
- v0.2: Prompt, provider, structured-output, and validation foundation.
- v0.3: Knowledge Engine.
- v0.4: Rule Engine.
- v0.5: Case and pre-match analysis.
- v0.6: Review and governed learning.
- v0.7: Evaluation.
- v0.8: Statistics.
- v0.9: hardening.
- v1.0: controlled private production acceptance.

## Update Checklist

After each sprint:

- update snapshot date, current milestone, sprint, and next sprint;
- move completed work into the completed sections;
- reconcile repository status with actual code and commands;
- add or remove known constraints;
- record architecture or implementation-gate changes;
- link the new sprint report;
- keep release claims narrower than demonstrated evidence.
