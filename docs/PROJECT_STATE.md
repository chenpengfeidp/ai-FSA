# FAS Project State

## Snapshot

- Last updated: 2026-07-16
- Current delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Current task status: Sprint 8 complete; no implementation sprint active
- Current sprint: No implementation sprint active
- Last completed sprint: Sprint 8 — Prisma No-model Bootstrap
- Next sprint: Not specified or authorized
- Release status: Pre-release; canonical v0.1 is not complete

Update this document after every sprint, implementation gate, or material governance change.

## Current Repository Status

The repository contains:

- a pnpm and Turborepo workspace;
- the reusable `@fas/tsconfig` TypeScript configuration package;
- the reusable `@fas/config` typed runtime configuration package;
- the reusable `@fas/database` no-model Prisma bootstrap package;
- exact runtime and package-manager pins;
- a minimal NestJS API application;
- a minimal Next.js web application;
- a minimal standalone NestJS worker;
- Biome formatting and source linting;
- dependency-cruiser boundary enforcement with controlled application and Prisma-ownership negative tests;
- guarded Husky and lint-staged pre-commit checks;
- focused Vitest configuration and database-bootstrap contract tests;
- pnpm-native exact Node.js and package-manager rejection;
- repository-owned toolchain diagnostics and 15 controlled enforcement tests;
- explicit TypeScript `6.0.3` ownership for every implemented workspace that invokes `tsc`;
- Prisma `7.8.0` default no-model generation with controlled `--require-models` negative evidence;
- exact pnpm lifecycle-build approval for Prisma packages;
- unified toolchain, workspace, Prisma, quality, typecheck, test, and build validation commands;
- architecture documents, ADRs, sprint reports, and AI-agent governance.

The API currently exposes only:

- `GET /`
- `GET /health/live`
- `GET /health/ready`
- `GET /version`

The web application contains only the repository-bootstrap homepage.

The worker initializes, logs `Worker started.`, and closes without a queue or artificial idle loop.

No football-domain, AI-engine, database model, migration, runtime database integration, authentication, durable-job, or business behavior exists.

## Current Toolchain

- Node.js: `24.18.0`
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `6.0.3`
- Biome: `2.5.3`
- dependency-cruiser: `18.1.0`
- Husky: `9.1.7`
- lint-staged: `17.0.8`
- Vitest: `4.1.10`
- Zod: `4.4.3`
- Next.js: `16.2.10`
- React / React DOM: `19.2.7`
- NestJS: `11.1.28`
- Prisma CLI / Client / PostgreSQL adapter: `7.8.0`
- PostgreSQL driver: `8.22.0`

TypeScript 6.0.3 is the approved compiler baseline. TypeScript 7.0.2 failed because Nest CLI 11 requires a programmatic compiler API that TypeScript 7.0 does not expose.

## Completed Milestones and Gates

- Architecture Design: complete.
- Architecture Completion: complete for the current documented scope.
- ADR-001 through ADR-004: accepted.
- Milestone 3A implementation plan: approved with conditions.
- Milestone 3A Sprint 1 — Repository Foundation: complete.
- Milestone 3A Sprint 2 — Application Skeleton: complete.
- Milestone 3A.5 — AI Collaboration Governance: complete.
- Milestone 3A Sprint 3 — Platform Foundation: complete.
- Milestone 3A Sprint 4 — Engineering Quality Foundation: complete.
- Milestone 3A Sprint 5 — Configuration Foundation: complete.
- Milestone 3A Sprint 6 — Toolchain Enforcement: complete.
- Milestone 3A Sprint 7 — TypeScript Compiler Baseline Alignment: complete.
- Milestone 3A Sprint 8 — Prisma No-model Bootstrap: complete.

Milestone 3A and canonical v0.1 are not complete. Later bootstrap and foundation work remains.

## Completed Sprints

### Sprint 1 — Repository Foundation

- Created root workspace configuration and tracked foundation directories.
- Added workspace validation.
- Introduced no application code.
- Evidence: `docs/sprints/SPRINT1_REPORT.md`.

### Sprint 2 — Application Skeleton

- Created independently runnable API, web, and worker shells.
- Added required operational API endpoints.
- Added root development commands and production builds.
- Introduced no domain, AI, database, authentication, or queue behavior.
- Evidence: `docs/sprints/SPRINT2_REPORT.md`.

### Sprint 3 — Platform Foundation

- Created the private `@fas/tsconfig` workspace package.
- Centralized strict base, Node.js, NestJS, and Next.js compiler policy.
- Connected the root, API, web, and worker as immediate consumers through explicit export paths and `workspace:*` dependencies.
- Added no executable package code or application-source changes.
- Evidence: `docs/sprints/SPRINT3_REPORT.md`.

### Sprint 4 — Engineering Quality Foundation

- Added Biome as the single formatter and source linter.
- Added dependency-cruiser rules for cycles, package-to-app, and cross-application imports.
- Added an executable controlled boundary-failure proof.
- Added guarded Husky and staged-only lint-staged checks.
- Unified workspace, quality, typecheck, and build validation.
- Added no application-source or runtime behavior changes.
- Evidence: `docs/sprints/SPRINT4_REPORT.md`.

### Sprint 5 — Configuration Foundation

- Created private workspace package `@fas/config`.
- Added immutable API and worker configuration contracts.
- Added strict validation for `NODE_ENV`, `HOST`, and `PORT`.
- Replaced direct API environment parsing and added worker startup validation.
- Added one explicit Vitest project with 17 configuration contract tests.
- Added no endpoint, response, web, domain, AI, persistence, queue, or observability behavior.
- Evidence: `docs/sprints/SPRINT5_REPORT.md`.

### Sprint 6 — Toolchain Enforcement

- Added pnpm-native exact Node.js and package-manager rejection.
- Added a repository-owned metadata and active-toolchain diagnostic.
- Added 15 controlled positive, policy-negative, metadata, and native-install enforcement tests.
- Integrated toolchain checks before existing root validation evidence.
- Added no dependency, lockfile, application, shared-package, architecture, ADR, or Sprint 7 change.
- Evidence: `docs/sprints/SPRINT6_REPORT.md`.

### Sprint 7 — TypeScript Compiler Baseline Alignment

- Added explicit TypeScript `6.0.3` development ownership to API, worker, and configuration manifests.
- Aligned all root and workspace-owned compiler entry points on TypeScript `6.0.3`.
- Preserved the NestJS CLI's internal transitive TypeScript `5.9.3` without an override.
- Added no source, script, compiler-policy, application-behavior, architecture, ADR, or Sprint 8 change.
- Evidence: `docs/sprints/SPRINT7_REPORT.md`.

### Sprint 8 — Prisma No-model Bootstrap

- Created private workspace package `@fas/database`.
- Added explicit Prisma `7.8.0` configuration and a PostgreSQL zero-model schema.
- Proved default no-model generation and controlled `--require-models` rejection from root and package contexts.
- Added a side-effect-free PostgreSQL driver-adapter lifecycle boundary.
- Integrated generation into root and package validation, build, typecheck, and test gates.
- Added 4 database-bootstrap tests and executable Prisma-ownership enforcement.
- Added no model, migration, runtime connection, application integration, domain behavior, architecture change, ADR, or Sprint 9 work.
- Evidence: `docs/sprints/SPRINT8_REPORT.md`.

## Architecture Status

Architecture direction is **approved with conditions**.

The governing implementation gate is `docs/21_ARCHITECTURE_SIGNOFF.md`. The requested path `docs/21_IMPLEMENTATION_GATE.md` does not exist; the architecture sign-off is the accepted gate authority for this governance milestone.

`docs/22_MILESTONE_3A_GATE.md` records the post-Sprint 5 recommendation `READY FOR SPRINT 6`. Sprint 6 subsequently received separate authorization, completed MF-05, and did not close Milestone 3A. The Architecture Board has also aligned MF-02 with verified Prisma `7.8.0` default no-model generation and controlled `--require-models` evidence.

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

Sprint 6 closed MF-05 with executable unsupported-runtime and package-manager rejection evidence. Sprint 7 aligned workspace-owned compiler resolution with the approved TypeScript `6.0.3` baseline. Sprint 8 closed the no-model Prisma bootstrap and generation dependency-graph conditions. Open Milestone 3A conditions include automated application tests beyond configuration and database-bootstrap contracts, remaining container compatibility evidence, container strategy and acceptance, deterministic runtime smoke testing, broader Turbo environment/cache policy, security gates, and CI.

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
- `docs/sprints/SPRINT3_SPECIFICATION.md`
- `docs/sprints/SPRINT4_SPECIFICATION.md`
- `docs/sprints/SPRINT5_SPECIFICATION.md`
- `docs/sprints/SPRINT6_SPECIFICATION.md`
- `docs/sprints/SPRINT7_SPECIFICATION.md`
- `docs/sprints/SPRINT8_SPECIFICATION.md`
- `docs/sprints/SPRINT8_SPECIFICATION_REVISION.md`

The sign-off narrows and conditions the implementation plan where they differ.

### Governance and Evidence

- `AGENTS.md`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/PROJECT_STATE.md`
- `docs/sprints/SPRINT1_REPORT.md`
- `docs/sprints/SPRINT2_REPORT.md`
- `docs/sprints/SPRINT3_REPORT.md`
- `docs/sprints/SPRINT3_ALIGNMENT_REPORT.md`
- `docs/sprints/SPRINT4_REPORT.md`
- `docs/sprints/SPRINT5_REPORT.md`
- `docs/sprints/SPRINT6_REPORT.md`
- `docs/sprints/SPRINT7_REPORT.md`
- `docs/sprints/SPRINT8_REPORT.md`
- `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT.md`
- `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT_APPROVAL.md`
- `docs/sprints/SPRINT8_PRE_IMPLEMENTATION_AUDIT.md`
- `docs/22_MILESTONE_3A_GATE.md`
- `docs/23_RELEASE_BASELINE.md`
- `docs/sprints/MILESTONE_3A_GATE_REVIEW.md`
- `docs/sprints/FINAL_REPOSITORY_HEALTH_REPORT.md`
- `docs/sprints/GOVERNANCE_FOUNDATION_REPORT.md`
- `docs/sprints/REPOSITORY_AUDIT_REPORT.md`

Sprint reports are evidence records, not replacements for canonical architecture.

## Known Constraints

- V1 is private and trusted-environment only.
- Public exposure is prohibited until authentication and authorization are designed and implemented.
- Live or in-play analysis is out of scope.
- AI cannot make authoritative deterministic, lifecycle, publication, or governance decisions.
- No AI provider or engine implementation is currently authorized.
- The Prisma schema intentionally contains no models, enums, composite types, migrations, or seeds.
- No PostgreSQL runtime integration, durable jobs, Redis, BullMQ, pgvector, or object storage is implemented.
- No speculative engine or shared business packages may be created.
- `@fas/tsconfig`, `@fas/config`, and `@fas/database` are the only shared platform packages currently implemented.
- `@fas/config` validates only `NODE_ENV`, API `HOST`, and API `PORT`.
- No browser-safe, secret, database, provider, queue, storage, feature-flag, or observability configuration is implemented.
- Direct dependencies are exact-pinned and the root lockfile is authoritative.
- Runtime and package-manager metadata are exact-pinned and enforced through pnpm-native installation rejection plus repository-owned checks.
- Workspace-owned compiler entry points resolve explicit TypeScript `6.0.3`; the NestJS CLI retains an internal transitive TypeScript `5.9.3` that is not an approved workspace compiler entry point.
- Generated Next.js type files are reproducible and uncommitted.
- The worker must not use a fake persistence loop before durable work exists.
- The API and web shell copy “Repository Bootstrap Completed” refers only to shell creation; Milestone 3A and canonical v0.1 remain incomplete.
- Sprint boundaries require separate approval.

## Known Documentation Drift

No known broken Markdown links, obsolete sprint locations, active documentation-index omissions, or active obsolete Prisma commands remain. Historical proposal and approval evidence retains the superseded MF-02 command text so the decision change remains auditable.

## Next Sprint

Sprint 8 is complete. No Sprint 9 specification or implementation is active or authorized.

Before any later implementation sprint:

1. review the Sprint 8 report and current repository state;
2. create and approve a separate Sprint specification;
3. obtain explicit implementation authorization;
4. start from a reviewable worktree;
5. follow the new allowlist, validation commands, acceptance criteria, and stop boundary.

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
