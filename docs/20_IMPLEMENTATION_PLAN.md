# FAS Milestone 3 Implementation Plan

## 1. Status and Authority

- Status: Proposed for final approval
- Scope: Repository Bootstrap
- Delivery label: Milestone 3A
- Canonical roadmap mapping: v0.1 / M1 Foundation
- Implementation state: Not started

This document is the official implementation blueprint for the repository bootstrap. It translates the architecture contracts into an executable delivery plan without defining football-analysis business behavior.

The delivery label “Milestone 3A” does not replace canonical milestone naming. In [16_IMPLEMENTATION_ROADMAP](./16_IMPLEMENTATION_ROADMAP.md), repository bootstrap belongs to v0.1 / M1 Foundation; M3 remains the Knowledge Engine milestone.

The following remain authoritative:

- [PROJECT BIBLE](./00_PROJECT_BIBLE.md) for mission and principles;
- [DOMAIN MODEL](./02_DOMAIN_MODEL.md) for domain meaning and invariants;
- [AI PRINCIPLES](./03_AI_PRINCIPLES.md) for AI boundaries;
- [ARCHITECTURE](./04_ARCHITECTURE.md) for system shape and dependency direction;
- [DATABASE](./12_DATABASE.md) and [DATABASE ERD](./19_DATABASE_ERD.md) for persistence;
- [API](./13_API.md) for transport contracts;
- [MONOREPO](./14_MONOREPO.md) for package ownership;
- [DEVELOPMENT GUIDE](./15_DEVELOPMENT_GUIDE.md) for engineering practices;
- [BACKEND ARCHITECTURE](./18_BACKEND_ARCHITECTURE.md) for backend composition;
- [ADR-001](./decisions/ADR-001-modular-monolith-and-typescript-monorepo.md), [ADR-002](./decisions/ADR-002-postgresql-durable-jobs-for-v1.md), [ADR-003](./decisions/ADR-003-provider-neutral-ai-and-staged-retrieval.md), and [ADR-004](./decisions/ADR-004-append-only-match-result-versions.md) for accepted decisions.

If this plan conflicts with those authorities, the higher authority wins and this document must be corrected before implementation proceeds.

## 2. Objective

Create a reproducible, quality-gated TypeScript monorepo that can host the FAS web application, API, worker, and foundation packages while preserving domain and infrastructure boundaries.

The bootstrap must prove:

- a clean clone can install, validate, test, build, and start;
- web, API, and worker are separate composition roots;
- domain and contract packages are framework-neutral;
- Prisma is owned only by the database package;
- package boundaries are mechanically enforced;
- PostgreSQL is the only v1 runtime datastore introduced;
- no AI provider, engine behavior, or football-analysis business logic is implemented.

## 3. Scope

### 3.1 Included

- pnpm workspace and lockfile;
- Turborepo task orchestration;
- strict shared TypeScript configuration;
- Biome formatting and linting;
- dependency-cruiser architecture checks;
- Husky pre-commit checks;
- Vitest test workspace;
- Next.js App Router shell;
- NestJS API shell;
- NestJS standalone worker shell;
- Prisma 7 PostgreSQL configuration and client generation;
- typed runtime configuration;
- baseline structured logging and correlation;
- health and readiness checks;
- Dockerfiles and Docker Compose topology;
- GitHub Actions CI and dependency update configuration;
- foundation package export maps and dependency boundaries;
- setup and operation documentation.

### 3.2 Excluded

- football-analysis domain use cases;
- Prompt, Knowledge, Rule, Case, Review, Evaluation, or Statistics implementation;
- Analysis Orchestrator implementation;
- OpenAI SDK or provider calls;
- match, evidence, analysis, review, or engine Prisma models;
- production migrations;
- Redis, BullMQ, or pgvector;
- authentication, authorization, users, subscriptions, notifications, or commercialization;
- live-match analysis;
- shadcn/ui components without a real UI requirement;
- empty packages created only to mirror the future architecture.

## 4. Repository Structure

```text
football-analysis-system/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       └── ci.yml
├── .husky/
│   └── pre-commit
├── .cursor/
│   └── rules/
│       └── project.mdc
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── health/
│   │   │   │   ├── health.controller.ts
│   │   │   │   ├── health.module.ts
│   │   │   │   └── health.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   │   └── health.e2e-spec.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.build.json
│   │   └── tsconfig.json
│   ├── web/
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── globals.css
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   ├── Dockerfile
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   └── tsconfig.json
│   └── worker/
│       ├── src/
│       │   ├── worker/
│       │   │   └── worker.module.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       │   └── bootstrap.spec.ts
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.build.json
│       └── tsconfig.json
├── packages/
│   ├── api-contracts/
│   │   ├── src/
│   │   │   ├── health.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── config/
│   │   ├── src/
│   │   │   ├── environment.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── test/
│   │   │   └── config.spec.ts
│   │   ├── package.json
│   │   ├── prisma.config.ts
│   │   └── tsconfig.json
│   ├── domain/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── jobs/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── job-contract.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── observability/
│   │   ├── src/
│   │   │   ├── correlation.ts
│   │   │   ├── index.ts
│   │   │   └── logger.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── test-utils/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── typescript-config/
│       ├── base.json
│       ├── nest.json
│       ├── next.json
│       ├── node.json
│       └── package.json
├── docs/
├── .editorconfig
├── .env.example
├── .gitignore
├── .node-version
├── biome.json
├── compose.yaml
├── dependency-cruiser.config.cjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── vitest.workspace.ts
```

## 5. Directory Responsibilities

### `apps/web`

Owns the Next.js App Router composition root and presentation shell. It may import API contracts, browser-safe configuration, and UI packages when those exist. It must not import database, job, provider, or engine implementations.

### `apps/api`

Owns HTTP transport, health/readiness endpoints, request correlation, serialization, and NestJS dependency injection for the API runtime. Controllers translate transport contracts into application operations; they do not own domain rules.

### `apps/worker`

Owns the standalone NestJS worker composition root. It does not expose a public HTTP API. Durable job polling and handlers are introduced only when their v0.1 persistence contract is implemented.

### `packages/domain`

Owns framework-neutral primitives shared across bounded contexts. The bootstrap must keep this surface minimal and must not predesign engine APIs.

### `packages/api-contracts`

Owns framework-neutral runtime-validatable transport contracts. Bootstrap scope is limited to health/readiness contracts needed by the runtime shells.

### `packages/config`

Is the only shared package that reads and validates runtime configuration. It exposes a separate browser-safe contract and must prevent secrets from entering web bundles.

### `packages/database`

Is the sole owner of Prisma configuration, generated client, PostgreSQL adapter, schema, and future migrations. No Prisma type or delegate may be re-exported as a domain contract.

### `packages/jobs`

Owns provider-neutral durable-job contracts. The bootstrap defines only stable job envelope primitives needed by later PostgreSQL implementation; it does not introduce BullMQ.

### `packages/observability`

Owns structured logging, correlation identifiers, redaction defaults, and future metrics/tracing adapters. Domain packages must not import telemetry SDKs.

### `packages/typescript-config`

Owns reusable strict compiler configurations for pure Node packages, NestJS applications, and Next.js.

### `packages/test-utils`

Owns cross-package deterministic test utilities with at least two real consumers. Package-specific builders remain with their owner.

## 6. Dependency Decisions

### 6.1 Runtime and Toolchain Baseline

- Node.js: `24.18.0` LTS
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `7.0.2`, subject to the compatibility gate below
- Biome: `2.5.3`
- Husky: `9.1.7`
- dependency-cruiser: `18.1.0`
- Vitest: `4.1.10`

Node 24 satisfies the minimum runtime requirements of Next.js 16, NestJS 11, Prisma 7, pnpm 11, Vitest 4, and dependency-cruiser 18.

TypeScript 7 is accepted only if the clean bootstrap passes:

- NestJS decorator compilation;
- Next.js production build;
- Prisma generation;
- Vitest execution;
- declaration generation for shared packages.

If compatibility fails, the implementation must select the latest mutually supported TypeScript 6 release, record the reason in the pull request, and update this document before merge.

### 6.2 Web Dependencies

- Next.js: `16.2.10`
- React: `19.2.7`
- React DOM: `19.2.7`
- TailwindCSS: current stable v4 resolved and exact-pinned during implementation
- matching React and Node type packages

shadcn/ui is not installed during bootstrap because it produces source components. It is introduced with the first approved UI component requirement.

### 6.3 API and Worker Dependencies

- `@nestjs/common`: `11.1.28`
- `@nestjs/core`: `11.1.28`
- `@nestjs/platform-express`: `11.1.28`, API only
- NestJS CLI: compatible stable 11.x
- NestJS Swagger: compatible stable 11.x
- `reflect-metadata`: compatible stable 0.2.x
- `rxjs`: compatible stable 7.x
- Zod: `4.4.3`

Express is the v0.1 HTTP adapter because it is NestJS's default and introduces the least bootstrap risk. A Fastify migration requires measured need and transport compatibility tests.

The worker uses a standalone NestJS application context and does not depend on an HTTP platform package.

### 6.4 Database Dependencies

- Prisma CLI: `7.8.0`
- Prisma Client: `7.8.0`
- Prisma PostgreSQL adapter: `7.8.0`
- `pg`: current Prisma-compatible stable version, exact-pinned
- `dotenv`: current stable version, exact-pinned
- PostgreSQL image: `postgres:17-alpine`, pinned by digest in release environments

Prisma 7 configuration uses `prisma.config.ts` and an explicit generated-client output. The bootstrap schema contains datasource and generator configuration only. Domain models and migrations are added by their owning persistence milestones.

### 6.5 Dependency Policy

- Every direct dependency is exact-pinned.
- Internal packages use `workspace:` references.
- One root lockfile is committed.
- Package versions are resolved once during implementation and reviewed before merge.
- Framework generators may scaffold temporary content, but generated configuration is normalized to repository standards before commit.
- OpenAI, Redis, BullMQ, and pgvector dependencies are prohibited in this milestone.
- Dependency updates must pass the same CI gates as application changes.

### 6.6 Rejected Alternatives

- Nx instead of Turborepo: rejected by ADR-001.
- npm or Yarn instead of pnpm: rejected by the monorepo contract.
- ESLint and Prettier as parallel authorities: rejected to avoid overlapping formatter/linter configuration.
- Biome alone for architecture enforcement: rejected because dependency direction needs a graph-aware tool.
- Redis/BullMQ in bootstrap: rejected by ADR-002.
- Prisma types in domain packages: rejected by dependency rules.
- Creating all future engine packages immediately: rejected as empty architecture scaffolding.

## 7. Bootstrap Order

### Step 0 — Change Isolation

1. Confirm all Architecture Completion documents are committed separately.
2. Confirm the working tree is clean.
3. Create a short-lived bootstrap branch.
4. Record the exact runtime and package-manager versions used.

No bootstrap code should be mixed into the architecture documentation commit.

### Step 1 — Workspace

1. Create the private root package manifest.
2. Pin pnpm through `packageManager`.
3. Define `apps/*` and `packages/*` workspace globs.
4. Create and commit one lockfile.
5. Add repository-wide scripts with stable names.

Exit gate: pnpm lists every intended workspace and rejects unsupported runtime versions.

### Step 2 — TypeScript

1. Create strict base configuration.
2. Add Node, NestJS, and Next.js variants.
3. Configure project boundaries and declaration output for shared packages.
4. Avoid path aliases that bypass package export maps.
5. Validate TypeScript 7 compatibility before proceeding.

Exit gate: a minimal pure package, API shell, worker shell, and web shell typecheck with the same compiler.

### Step 3 — Turborepo

1. Define `build`, `typecheck`, `test`, `lint`, and boundary tasks.
2. Mark development tasks persistent and uncached.
3. Define build outputs explicitly.
4. Exclude secrets and local environment files from cache inputs.
5. Keep migrations and service startup outside cached build graphs.

Exit gate: Turbo's dry-run graph shows only intended dependencies and outputs.

### Step 4 — Quality Tooling

1. Add Biome as the single formatter/linter.
2. Add dependency-cruiser for package and framework boundaries.
3. Add Vitest workspace configuration.
4. Add Husky after workspace installation.
5. Run only staged Biome checks in pre-commit.
6. Keep complete typecheck, test, boundary, and build checks in CI.

Exit gate: an intentionally forbidden import fails boundary validation.

### Step 5 — Foundation Packages

Create packages in dependency order:

1. `typescript-config`;
2. `domain`;
3. `api-contracts`;
4. `config`;
5. `observability`;
6. `database`;
7. `jobs`;
8. `test-utils`.

Each package must have:

- an explicit package name;
- private/public status;
- a deliberate export map;
- strict TypeScript configuration;
- only documented dependencies;
- at least one immediate consumer, except configuration packages.

### Step 6 — Runtime Shells

1. Create the NestJS API composition root.
2. Add liveness and readiness endpoints.
3. Create the standalone NestJS worker composition root.
4. Create the Next.js App Router shell.
5. Wire typed configuration and correlation.
6. Verify graceful shutdown.

No football-analysis route, service, entity, repository, prompt, or engine is introduced.

### Step 7 — Prisma Bootstrap

1. Configure PostgreSQL through `prisma.config.ts`.
2. Configure the Prisma 7 client generator with explicit output.
3. Add a database client adapter owned by `packages/database`.
4. Validate configuration and generate the client.
5. Confirm no Prisma imports exist outside the database package.

No domain table or migration is created in this step.

### Step 8 — Containers

1. Add PostgreSQL with health check and persistent local volume.
2. Add web, API, and worker build definitions.
3. Use a private Compose network.
4. Pass configuration through environment variables.
5. Add service readiness dependencies.
6. Keep migration execution explicit.

Redis, pgvector, OpenAI-compatible services, and public ingress are excluded.

### Step 9 — GitHub Actions

CI runs:

1. checkout;
2. Node and pnpm setup;
3. frozen dependency installation;
4. Biome validation;
5. dependency-boundary validation;
6. TypeScript validation;
7. tests;
8. Prisma validation and generation;
9. complete build;
10. Docker Compose configuration validation.

GitHub Actions are pinned to immutable commit SHAs. Dependabot updates npm and Actions dependencies in separate groups.

### Step 10 — Documentation and Final Verification

1. Update README setup and command documentation.
2. Reconcile Biome terminology in MONOREPO and DEVELOPMENT GUIDE.
3. Run acceptance commands from a clean clone.
4. Verify no forbidden dependencies or out-of-scope behavior.
5. Record exact resolved versions and known limitations.

## 8. File Creation Plan

### 8.1 Root and Automation

Create:

```text
.node-version
.editorconfig
.env.example
biome.json
compose.yaml
dependency-cruiser.config.cjs
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.json
turbo.json
vitest.workspace.ts
.github/dependabot.yml
.github/workflows/ci.yml
.husky/pre-commit
```

### 8.2 Applications

Create:

```text
apps/api/Dockerfile
apps/api/package.json
apps/api/tsconfig.json
apps/api/tsconfig.build.json
apps/api/src/main.ts
apps/api/src/app.module.ts
apps/api/src/health/health.module.ts
apps/api/src/health/health.controller.ts
apps/api/src/health/health.service.ts
apps/api/test/health.e2e-spec.ts

apps/worker/Dockerfile
apps/worker/package.json
apps/worker/tsconfig.json
apps/worker/tsconfig.build.json
apps/worker/src/main.ts
apps/worker/src/app.module.ts
apps/worker/src/worker/worker.module.ts
apps/worker/test/bootstrap.spec.ts

apps/web/Dockerfile
apps/web/package.json
apps/web/tsconfig.json
apps/web/next-env.d.ts
apps/web/next.config.ts
apps/web/postcss.config.mjs
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
apps/web/src/app/globals.css
```

### 8.3 Packages

Create:

```text
packages/typescript-config/package.json
packages/typescript-config/base.json
packages/typescript-config/node.json
packages/typescript-config/nest.json
packages/typescript-config/next.json

packages/domain/package.json
packages/domain/tsconfig.json
packages/domain/src/index.ts

packages/api-contracts/package.json
packages/api-contracts/tsconfig.json
packages/api-contracts/src/index.ts
packages/api-contracts/src/health.ts

packages/config/package.json
packages/config/tsconfig.json
packages/config/src/index.ts
packages/config/src/environment.ts

packages/database/package.json
packages/database/tsconfig.json
packages/database/prisma.config.ts
packages/database/prisma/schema.prisma
packages/database/src/index.ts
packages/database/src/client.ts
packages/database/test/config.spec.ts

packages/jobs/package.json
packages/jobs/tsconfig.json
packages/jobs/src/index.ts
packages/jobs/src/job-contract.ts

packages/observability/package.json
packages/observability/tsconfig.json
packages/observability/src/index.ts
packages/observability/src/logger.ts
packages/observability/src/correlation.ts

packages/test-utils/package.json
packages/test-utils/tsconfig.json
packages/test-utils/src/index.ts
```

### 8.4 Existing Files Modified During Implementation

```text
.gitignore
README.md
docs/14_MONOREPO.md
docs/15_DEVELOPMENT_GUIDE.md
```

No other canonical document changes are expected. If implementation reveals a contract conflict, work stops until the owning document and any required ADR are reviewed.

### 8.5 Generated Files

Generated and committed:

```text
pnpm-lock.yaml
apps/web/next-env.d.ts
```

Generated and ignored:

```text
node_modules/
.turbo/
apps/web/.next/
coverage/
packages/database/generated/
```

## 9. Risks and Mitigations

### 9.1 Milestone Naming

Risk: implementation may be mistaken for canonical M3 Knowledge Engine work.

Mitigation: branch, PR, and release notes use “Repository Bootstrap / v0.1 Foundation,” with “3A” only as the external delivery label.

### 9.2 TypeScript 7 Compatibility

Risk: NestJS decorators, Prisma generation, Next.js, or test tooling may not yet support the selected compiler fully.

Mitigation: run the compatibility gate before package expansion. Fall back only to the latest compatible TypeScript 6 release and document the constraint.

### 9.3 Prisma 7 Configuration

Risk: Prisma 6-era examples may cause incorrect datasource, generator, or driver-adapter setup.

Mitigation: use `prisma.config.ts`, explicit generated output, and the PostgreSQL adapter from the first commit. Validate Prisma ownership with dependency checks.

### 9.4 ESM and Module Resolution

Risk: mixed ESM/CommonJS behavior may affect NestJS, tooling, Docker startup, or generated Prisma imports.

Mitigation: use one ESM-oriented application strategy, Node-compatible TypeScript settings, explicit file extensions where required, and `.cjs` only for tools that require it.

### 9.5 Biome Coverage

Risk: Biome cannot enforce all architecture dependency rules.

Mitigation: dependency-cruiser owns graph-level package restrictions. Biome and dependency-cruiser have non-overlapping responsibilities.

### 9.6 Turbo Cache Contamination

Risk: environment-dependent or generated artifacts may be restored incorrectly or expose sensitive inputs.

Mitigation: declare inputs and outputs explicitly, exclude secrets, and never cache development servers or migration execution.

### 9.7 Hook Reliability

Risk: developers may bypass or lack support for local Git hooks.

Mitigation: Husky is a fast local convenience only. CI repeats and authoritatively enforces all required checks.

### 9.8 Premature Package APIs

Risk: creating future engine packages now would freeze speculative exports and increase migration cost.

Mitigation: create packages only with a real owner, consumer, and milestone.

### 9.9 Dependency Drift

Risk: exact versions in this plan may have security or compatibility updates before implementation.

Mitigation: verify registry state at implementation start. Any version change is recorded in the PR and lockfile; major-version changes require explicit review.

### 9.10 Scope Leakage

Risk: generators may introduce example controllers, services, lint configuration, or application behavior outside the bootstrap.

Mitigation: review generated output file by file. Remove examples, duplicate tooling, and business placeholders before commit.

## 10. Acceptance Criteria

### 10.1 Clean Clone

From a clean clone with the pinned Node runtime:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
```

The reported versions match repository pins and installation produces no second lockfile.

### 10.2 Static Quality

```bash
pnpm biome:check
pnpm boundaries
pnpm typecheck
```

All commands succeed. A test fixture or documented validation proves that a forbidden Prisma or cross-package deep import is rejected.

### 10.3 Tests and Build

```bash
pnpm test
pnpm build
```

API health tests, worker bootstrap tests, foundation package tests, and all production builds succeed from a clean cache.

### 10.4 Prisma

```bash
pnpm prisma:validate
pnpm prisma:generate
```

Both commands succeed. Generated output remains inside the database package and no other package imports Prisma directly.

### 10.5 Containers

```bash
docker compose config
docker compose up -d postgres
docker compose ps
```

Compose configuration is valid and PostgreSQL becomes healthy. No Redis or pgvector container exists.

### 10.6 Runtime Shells

The documented development/start commands prove:

- API starts and liveness succeeds;
- API readiness reflects database availability;
- worker initializes and shuts down gracefully;
- web shell renders;
- request correlation appears in structured logs;
- no secret value appears in logs or browser output.

### 10.7 CI

- CI passes from a clean GitHub runner.
- Frozen installation is enforced.
- Turbo cache does not contain secrets.
- Dependabot configuration validates.
- Actions are immutable-version pinned.
- No step silently skips tests or type checks.

### 10.8 Architecture

- Domain packages import no NestJS, Next.js, Prisma, OpenAI, Redis, or telemetry SDK.
- Only the database package imports Prisma.
- Only composition roots import framework modules.
- Package consumers use export maps, not deep source paths.
- No AI, engine, user, subscription, notification, or live-analysis behavior exists.
- README and canonical engineering documents match actual commands and tools.

## 11. Rollback Strategy

### 11.1 Commit Structure

Implementation should be split into reviewable commits:

1. root workspace and runtime pins;
2. TypeScript, Turbo, Biome, and boundary tooling;
3. foundation packages;
4. API and worker shells;
5. web shell;
6. Prisma and PostgreSQL bootstrap;
7. containers;
8. CI, hooks, and documentation.

Each commit should keep the repository installable or clearly identify a short-lived setup boundary within the same pull request.

### 11.2 Dependency Rollback

- Revert the dependency-specific commit and lockfile together.
- Do not hand-edit the lockfile.
- If TypeScript 7 fails compatibility, update the exact TypeScript pin, regenerate the lockfile, and rerun the full matrix.
- If Prisma 7 blocks the bootstrap, stop and document the incompatibility before considering Prisma 6; do not mix Prisma major versions.

### 11.3 Configuration Rollback

- Root tooling configuration changes are reverted with their related scripts.
- Removing Biome requires restoring an approved replacement and updating MONOREPO and DEVELOPMENT GUIDE first.
- Turbo task changes must not leave stale cache assumptions; clear local/CI caches after rollback.

### 11.4 Database Rollback

No domain migration is created in this milestone. Prisma bootstrap rollback removes generated output and configuration without changing database data.

PostgreSQL local volumes may be removed only through an explicit developer command. Production data rollback is outside this milestone.

### 11.5 Runtime Rollback

API, worker, and web images are independently revertible because they are separate composition roots. A rollback uses the previous immutable image and must remain compatible with the unchanged bootstrap database configuration.

### 11.6 Pull Request Rollback

If acceptance gates cannot be met without violating architecture:

1. stop implementation;
2. preserve diagnostics;
3. revert the smallest affected commit;
4. update the owning architecture document or create an ADR;
5. obtain approval before retrying.

Force pushes, destructive resets, skipped hooks, and hidden compatibility workarounds are prohibited.

## 12. Future Milestones

### v0.1 Foundation Continuation

After repository bootstrap:

- implement PostgreSQL durable jobs under ADR-002;
- implement audit and idempotency foundations;
- implement append-only match-result versions under ADR-004;
- add approved domain schema and migrations;
- complete backup/restore and operational baselines.

### v0.2 Prompt, Provider, and Validation Foundation

- create `@fas/prompt-engine`;
- create `@fas/ai-provider`;
- add OpenAI Responses API through the provider port;
- implement structured output and validation manifests;
- add composition policies and AI release bundles.

### v0.3 Knowledge Engine

- create `@fas/knowledge-engine`;
- implement governed item/version lifecycle;
- implement source-backed metadata, tag, and PostgreSQL full-text retrieval;
- version retrieval specifications;
- preserve deterministic ordering, excerpts, and empty-result semantics.

### v0.4 Rule Engine

- create `@fas/rule-engine`;
- implement versioned deterministic conditions;
- enforce sample, confidence, scope, and limitations;
- provide explainable condition-level evaluation.

### v0.5 Case and Pre-match Analysis

- create Case, Evidence, Match, Analysis, and orchestration packages when they have real consumers;
- implement fixed evidence selection and sealed snapshots;
- integrate Knowledge, Rule, Case, Prompt, provider, and validation stages;
- publish immutable pre-match analysis revisions.

### v0.6 Review and Governed Learning

- implement verified-outcome review;
- assess claims, rules, and cases;
- create learning candidates;
- prevent automatic activation of learning.

### v0.7 Evaluation

- implement versioned assessment policy, quality gates, and reports.

### v0.8 Statistics

- implement deterministic metric definitions, projections, watermarks, sample qualification, and uncertainty.

### v0.9 Hardening

- performance and failure testing;
- security review;
- backup/restore drills;
- data-provider resilience;
- operational readiness.

### v1.0 Controlled Production Acceptance

- satisfy all architecture, quality, security, recovery, and reviewability gates;
- deploy only in a trusted controlled environment;
- retain the product non-goals unless separately approved.

### Phase 2

Redis/BullMQ, pgvector, semantic retrieval, authentication, multi-user workflows, and any live-analysis capability require measured need and separate architecture decisions.

## 13. Final Approval Gate

Implementation may start only after reviewers approve:

- scope and exclusions;
- runtime and dependency baseline;
- Biome and dependency-cruiser responsibilities;
- file creation list;
- TypeScript compatibility fallback;
- Prisma 7 configuration strategy;
- acceptance commands;
- rollback strategy.

Approval of this document authorizes repository bootstrap only. It does not authorize football-analysis business code or later milestone implementation.
