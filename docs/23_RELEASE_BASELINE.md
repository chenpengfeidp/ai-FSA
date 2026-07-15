# Milestone 3A Release Baseline

## 1. Purpose

This document permanently records the frozen repository baseline after the Milestone 3A architecture gate and before Sprint 6 implementation.

It is a governance snapshot, not an implementation plan, Sprint authorization, production release declaration, or claim that Milestone 3A and canonical v0.1 are complete.

The baseline contains the completed and committed results of Sprints 1 through 5 plus the approved architecture-readiness documentation for Sprint 6.

## 2. Repository Version

- Baseline commit: `f9344a5`
- Baseline branch: `main`
- Remote baseline: `origin/main` at `f9344a5`
- Milestone baseline tag: `v0.1.0-m3a`
- Repository progression tag on the same commit: `v0.1.5.1`
- Previous implementation tag: `v0.1.5`
- Root private package version: `0.0.0`
- Baseline date: 2026-07-15

The tags identify the same frozen repository commit. They do not override the milestone and release status recorded below.

## 3. Milestone Status

- Architecture Design: complete.
- Architecture Completion: complete for the current documented scope.
- ADR-001 through ADR-004: accepted.
- Milestone 3A implementation plan: approved with conditions.
- Milestone 3A architecture gate: `READY FOR SPRINT 6`.
- Sprint 1 through Sprint 5: complete.
- Sprint 6: specified and architecture-ready, not implemented and not authorized.
- Milestone 3A Repository Bootstrap: incomplete.
- Canonical v0.1 / M1 Foundation: incomplete.
- Release status: pre-release.
- Production status: not approved.

The remaining Milestone 3A conditions include toolchain enforcement, application tests, Prisma no-model bootstrap, container strategy and acceptance, deterministic runtime smoke, Turbo environment/cache policy, CI, and baseline security gates.

Sprint 6 closes only MF-05. It does not complete Milestone 3A.

## 4. Completed Sprints

### Sprint 1 — Repository Foundation

- Established the pnpm workspace roots.
- Added the root lockfile and Turborepo task contracts.
- Added exact runtime and package-manager metadata.
- Added root TypeScript configuration.
- Added workspace validation.
- Introduced no application implementation.
- Evidence: `docs/sprints/SPRINT1_REPORT.md`.

### Sprint 2 — Application Skeleton

- Created minimal NestJS API and worker composition roots.
- Created the minimal Next.js web composition root.
- Added only the approved API shell endpoints.
- Preserved localhost-only default bindings.
- Added no domain, AI, database, authentication, or queue behavior.
- Recorded and applied the approved TypeScript `6.0.3` compatibility fallback.
- Evidence: `docs/sprints/SPRINT2_REPORT.md`.

### Sprint 3 — Platform Foundation

- Created `@fas/tsconfig`.
- Centralized strict base, Node.js, NestJS, and Next.js compiler policy.
- Added explicit JSON export subpaths.
- Connected root and application consumers through `workspace:*`.
- Added no runtime package API or application-source behavior.
- Evidence: `docs/sprints/SPRINT3_REPORT.md`.

### Sprint 4 — Engineering Quality Foundation

- Established Biome as the formatter and source-linting authority.
- Added dependency-cruiser architecture checks.
- Added an executable controlled boundary rejection.
- Added guarded Husky and staged-only lint-staged checks.
- Added the unified non-writing quality and validation workflow.
- Changed no application behavior.
- Evidence: `docs/sprints/SPRINT4_REPORT.md`.

### Sprint 5 — Configuration Foundation

- Created `@fas/config`.
- Added immutable typed API and worker configuration contracts.
- Added strict `NODE_ENV`, API `HOST`, and API `PORT` validation.
- Made API and worker validate configuration before NestJS initialization.
- Added Vitest `4.1.10` with one explicit `config` project.
- Added 17 focused configuration contract tests.
- Added test execution to root validation.
- Added no endpoint, response, web, domain, AI, persistence, queue, container, CI, or deployment behavior.
- Evidence: `docs/sprints/SPRINT5_REPORT.md`.

## 5. Architecture Baseline

The baseline architecture is a full-TypeScript modular monolith in one pnpm workspace coordinated by Turborepo.

### Composition Roots

- `apps/web`
  - Next.js App Router presentation shell.
  - No server configuration, database, queue, or AI-provider dependency.
- `apps/api`
  - NestJS REST composition root.
  - Uses the default Express adapter.
  - Loads `@fas/config` before application creation.
  - Exposes only `/`, `/health/live`, `/health/ready`, and `/version`.
- `apps/worker`
  - Standalone NestJS application context.
  - Loads `@fas/config` before application-context creation.
  - Logs `Worker started.` and closes cleanly.
  - Contains no HTTP platform, fake idle loop, queue, scheduler, or durable job.

### Dependency Direction

- Applications may consume approved shared package exports.
- Shared packages do not import application composition roots.
- Applications do not import one another.
- Package consumers use export maps, not deep source paths.
- Web does not import server-only configuration.
- Configuration source imports no NestJS, Next.js, Prisma, provider, queue, or telemetry framework.
- Circular dependencies are prohibited.
- Future package boundaries are added only with immediate consumers.

### Trust and Product Boundaries

- No football-domain or AI-engine implementation exists.
- No generative AI provider is installed.
- No database or persistence runtime exists.
- No authentication, authorization, public exposure, live analysis, wagering advice, subscriptions, notifications, or commercialization exists.
- AI cannot make authoritative deterministic, lifecycle, publication, or governance decisions.
- PostgreSQL remains the approved future V1 system of record.
- Redis, BullMQ, pgvector, microservices, and semantic retrieval remain deferred.

## 6. Approved Workspace Packages

### Root Workspace

- `ai-fsa`
  - Private orchestration package.
  - Owns root scripts, exact toolchain metadata, quality tooling, and validation composition.

### Application Packages

- `@fas/api`
  - Private NestJS API application.
- `@fas/web`
  - Private Next.js web application.
- `@fas/worker`
  - Private standalone NestJS worker application.

Application packages are composition roots and are not reusable library exports.

### Shared Platform Packages

- `@fas/config`
  - Private ESM runtime package.
  - One explicit root export.
  - Owns server-side API and worker startup configuration.
  - Runtime dependency: Zod `4.4.3`.
- `@fas/tsconfig`
  - Private declarative configuration package.
  - Exports:
    - `@fas/tsconfig/base.json`;
    - `@fas/tsconfig/node.json`;
    - `@fas/tsconfig/nest.json`;
    - `@fas/tsconfig/next.json`.
  - Contains no executable source.

No other shared or future package is approved as implemented at this baseline.

## 7. Toolchain Baseline

- Node.js: `24.18.0`
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `6.0.3`
- Biome: `2.5.3`
- dependency-cruiser: `18.1.0`
- Husky: `9.1.7`
- lint-staged: `17.0.8`
- Vitest: `4.1.10`
- Next.js: `16.2.10`
- React: `19.2.7`
- React DOM: `19.2.7`
- NestJS: `11.1.28`
- NestJS CLI: `11.0.24`
- Zod: `4.4.3`

TypeScript `6.0.3` is the approved compatibility baseline. TypeScript `7.0.2` was rejected after the NestJS CLI compatibility gate.

The exact Node.js and pnpm versions are declared consistently through `.nvmrc`, root `engines`, and root `packageManager`.

Hard rejection of unsupported executing versions is not part of this frozen implementation baseline. It is MF-05 and the sole implementation objective of Sprint 6.

## 8. Dependency Baseline

All direct external dependencies are exact-pinned. Internal dependencies use `workspace:*`. `pnpm-lock.yaml` is the only authoritative lockfile.

### Root Development Dependencies

- `@biomejs/biome`: `2.5.3`
- `@fas/tsconfig`: `workspace:*`
- `dependency-cruiser`: `18.1.0`
- `husky`: `9.1.7`
- `lint-staged`: `17.0.8`
- `turbo`: `2.10.5`
- `typescript`: `6.0.3`
- `vitest`: `4.1.10`

### API Dependencies

Runtime:

- `@fas/config`: `workspace:*`
- `@nestjs/common`: `11.1.28`
- `@nestjs/core`: `11.1.28`
- `@nestjs/platform-express`: `11.1.28`
- `reflect-metadata`: `0.2.2`
- `rxjs`: `7.8.2`

Development:

- `@fas/tsconfig`: `workspace:*`
- `@nestjs/cli`: `11.0.24`
- `@types/node`: `24.13.3`

### Web Dependencies

Runtime:

- `next`: `16.2.10`
- `react`: `19.2.7`
- `react-dom`: `19.2.7`

Development:

- `@fas/tsconfig`: `workspace:*`
- `@types/node`: `24.13.3`
- `@types/react`: `19.2.17`
- `@types/react-dom`: `19.2.3`
- `typescript`: `6.0.3`

### Worker Dependencies

Runtime:

- `@fas/config`: `workspace:*`
- `@nestjs/common`: `11.1.28`
- `@nestjs/core`: `11.1.28`
- `reflect-metadata`: `0.2.2`
- `rxjs`: `7.8.2`

Development:

- `@fas/tsconfig`: `workspace:*`
- `@nestjs/cli`: `11.0.24`
- `@types/node`: `24.13.3`

### Configuration Package Dependencies

Runtime:

- `zod`: `4.4.3`

Development:

- `@fas/tsconfig`: `workspace:*`

### Supply-chain Baseline

- Only one pnpm lockfile is committed.
- Internal workspace resolution uses symbolic workspace links.
- The only approved dependency build script is `sharp`.
- pnpm minimum release age is `1440` minutes.
- Turborepo `2.10.5` and TypeScript `6.0.3` are explicit minimum-release-age exclusions.
- No Prisma, OpenAI, Redis, BullMQ, pgvector, database adapter, telemetry SDK, or authentication dependency is installed.

## 9. Repository Structure

The tracked baseline structure is:

```text
football-analysis-system/
├── .cursor/
├── .github/
│   └── .gitkeep
├── .husky/
│   └── pre-commit
├── apps/
│   ├── api/
│   ├── web/
│   └── worker/
├── docs/
│   ├── 00_PROJECT_BIBLE.md
│   ├── ...
│   ├── 20_IMPLEMENTATION_PLAN.md
│   ├── 21_ARCHITECTURE_SIGNOFF.md
│   ├── 22_MILESTONE_3A_GATE.md
│   ├── 23_RELEASE_BASELINE.md
│   ├── decisions/
│   └── sprints/
├── packages/
│   ├── config/
│   └── tsconfig/
├── scripts/
│   ├── install-git-hooks.mjs
│   ├── validate-boundary-fixture.mjs
│   └── validate-workspace.mjs
├── tooling/
│   └── dependency-cruiser/
│       └── fixtures/
├── biome.json
├── dependency-cruiser.config.cjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── vitest.config.ts
```

Generated and ignored artifacts include:

- `node_modules/`;
- `.next/`;
- `dist/`;
- `coverage/`;
- `.turbo/`;
- `*.tsbuildinfo`;
- `apps/web/next-env.d.ts`;
- logs and local environment files.

Untracked local placeholder directories and ignored stale artifacts are not part of this release baseline.

## 10. Validation Baseline

The supported execution environment is Node.js `24.18.0` with pnpm `11.13.0`.

### Installation and Workspace

```bash
pnpm install --frozen-lockfile
pnpm workspace:check
```

Expected baseline:

- installation succeeds;
- no second lockfile appears;
- five child workspace packages are recognized.

### Quality and Boundaries

```bash
pnpm format:check
pnpm lint
pnpm check
pnpm boundaries
pnpm boundaries:test
pnpm quality
```

Expected baseline:

- Biome reports no formatting or lint violation;
- dependency-cruiser reports no implemented-graph violation;
- the controlled forbidden fixture is rejected by the expected rule.

### Typecheck, Test, and Build

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

Expected baseline:

- root and five child packages are resolved by Turborepo;
- API, web, worker, and configuration typechecks pass;
- the `config` Vitest project is discovered;
- all 17 configuration tests pass;
- configuration, API, worker, and web builds pass;
- root validation runs workspace, quality, typecheck, test, and build in that order.

### Gate Evidence

The final architecture gate demonstrated:

- supported-toolchain frozen installation;
- complete root validation;
- no package-boundary violation;
- forced uncached execution of nine typecheck, test, and build tasks;
- zero failures;
- zero broken documentation links;
- zero tracked secret-like files.

### Known Negative Baseline

At this commit, unsupported Node.js `22.20.0` can still complete pnpm installation with only a warning.

Sprint 6 must change that result to a deterministic failure using:

```yaml
engineStrict: true
pmOnFail: error
```

The negative baseline is intentional evidence for MF-05. It is not an accepted permanent runtime policy.

## 11. Documentation Baseline

### Governance Entry Points

- `AGENTS.md`
- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/DEVELOPMENT_WORKFLOW.md`

### Numbered Canonical and Gate Documents

- `docs/00_PROJECT_BIBLE.md` through `docs/19_DATABASE_ERD.md`
- `docs/20_IMPLEMENTATION_PLAN.md`
- `docs/21_ARCHITECTURE_SIGNOFF.md`
- `docs/22_MILESTONE_3A_GATE.md`
- `docs/23_RELEASE_BASELINE.md`

### Accepted ADRs

- ADR-001 — Modular Monolith and TypeScript Monorepo
- ADR-002 — PostgreSQL Durable Jobs for V1
- ADR-003 — Provider-neutral AI and Staged Retrieval
- ADR-004 — Append-only Match Result Versions

### Sprint and Evidence Documents

- Sprint 1 through Sprint 5 reports
- Sprint 3 through Sprint 5 specifications
- Sprint 3 alignment report
- Governance foundation report
- Repository audit report
- Final Milestone 3A gate review
- Sprint 6 specification

Historical Sprint reports remain point-in-time evidence. Current status is owned by `docs/PROJECT_STATE.md`, the implementation plan, architecture sign-off, gate reports, and this baseline.

The Sprint 6 specification is an approved scope candidate and does not authorize implementation by itself.

## 12. Technical Debt

### Milestone 3A Completion Debt

- MF-01 — Prisma generation dependency graph.
- MF-02 — Prisma no-model bootstrap.
- MF-05 — runtime and package-manager enforcement.
- Remaining MF-06 — Prisma and container compatibility evidence.
- MF-08 — container packaging strategy.
- MF-09 — executable container acceptance.
- Remaining MF-10 — worker Compose profile acceptance.
- Remaining MF-11 — database and schema-aware readiness.
- MF-12 — Turbo environment and cache policy.
- MF-13 — deterministic runtime smoke workflow.
- MF-14 — localhost-only Compose exposure.
- MF-15 — CI and baseline security gates.
- API, worker, and web application tests.
- Final clean-clone, container, security, and CI evidence.

### Non-blocking Platform Debt

- API readiness is shell-only.
- API version is hard-coded to the bootstrap package version.
- `@fas/config` uses a documented minimal Node process typing workaround.
- Configuration tests execute through Vitest but are excluded from the package TypeScript project.
- Application development commands build configuration once rather than watching it.
- Boundary rules do not yet cover absent future package ownership.

### Documentation Debt

- DA-04 requires ADR-004 visibility before result-persistence work.
- Historical reports contain superseded point-in-time status statements.
- The prior `docs/22_PERSISTENCE_ARCHITECTURE.md` recommendation is superseded by the Milestone 3A gate.
- Sprint 6 and later reports must continue separating Sprint completion from Milestone 3A and canonical v0.1 completion.

## 13. Deferred Decisions

The following architecture-sign-off decisions remain explicitly deferred:

- DF-01 — OpenAPI and Swagger artifact generation.
- DF-02 — object storage.
- DF-03 — shared test utilities package.
- DF-04 — TailwindCSS and shadcn/ui.
- DF-05 — domain shared primitives without immediate consumers.
- DF-06 — Prisma logical-owner schema sections before the first model.
- DF-07 — Redis, BullMQ, pgvector, and advanced AI infrastructure.

Additional deferred work includes:

- authentication, authorization, and public deployment;
- domain and engine implementation;
- provider integration;
- observability without an immediate authorized consumer;
- result persistence;
- v0.2 through v1.0 product milestones.

Deferred work must not be added to Sprint 6.

## 14. Entry Criteria for Sprint 6

Sprint 6 implementation may begin only after all entry criteria are met:

1. `docs/sprints/SPRINT6_SPECIFICATION.md` is reviewed and tracked.
2. `docs/22_MILESTONE_3A_GATE.md` is reviewed and tracked.
3. `docs/sprints/MILESTONE_3A_GATE_REVIEW.md` is reviewed and tracked.
4. `docs/23_RELEASE_BASELINE.md` is reviewed and tracked.
5. Required governance documentation alignment is committed.
6. Separate explicit Sprint 6 implementation authorization is issued.
7. The worktree is clean and contains no unrelated change.
8. Node.js `24.18.0` is active.
9. pnpm `11.13.0` is active.
10. Frozen installation and the existing root validation baseline pass.
11. Implementation accepts the exact Sprint 6 allowlist, non-goals, validation commands, acceptance criteria, and stop boundary.
12. No dependency or lockfile change is planned.
13. No application or shared-package source change is planned.
14. Sprint 6 is understood to close MF-05 only.
15. Sprint 7 remains unplanned and unauthorized.

The first authorized implementation action after entry is satisfied is Sprint 6 Toolchain Enforcement.

Until explicit authorization is granted, the repository remains frozen at this governance baseline.
