# FAS Milestone 3 Implementation Plan

## 1. Status and Authority

- Status: Approved with conditions
- Scope: Repository Bootstrap
- Delivery label: Milestone 3A
- Canonical roadmap mapping: v0.1 / M1 Foundation
- Implementation state: In progress — Sprints 1 through 5 complete; Milestone 3A incomplete

This document is the official implementation blueprint for the repository bootstrap. It translates the architecture contracts into an executable delivery plan without defining football-analysis business behavior.

The delivery label “Milestone 3A” does not replace canonical milestone naming. In [16_IMPLEMENTATION_ROADMAP](./16_IMPLEMENTATION_ROADMAP.md), repository bootstrap belongs to v0.1 / M1 Foundation; M3 remains the Knowledge Engine milestone.

[21_ARCHITECTURE_SIGNOFF](./21_ARCHITECTURE_SIGNOFF.md) is the governing approval addendum. Its must-fix, deferral, documentation-alignment, and rejected-item decisions narrow this plan wherever the documents differ.

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

### 1.1 Demonstrated Implementation Progress

- Sprint 1 established the pnpm/Turborepo repository foundation and runtime pins.
- Sprint 2 created the minimal API, web, and worker shells.
- Sprint 3 created and connected `@fas/tsconfig`.
- Sprint 4 added Biome, dependency-cruiser, guarded Husky/lint-staged checks, and unified validation.
- Sprint 5 created and connected `@fas/config`, added focused configuration tests, and integrated test execution into root validation.
- Application tests beyond the configuration contract, Prisma no-model bootstrap, containers, deterministic runtime smoke validation, security gates, and CI remain planned and unimplemented.

Current repository truth and sprint evidence are maintained in [PROJECT_STATE](./PROJECT_STATE.md) and `docs/sprints/`. Planned files and commands below are not evidence of implementation until their owning sprint report records successful validation.

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
- Vitest test projects;
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

The following is the target Milestone 3A end state. Sprints 1 through 5 implemented only the subset recorded in `docs/PROJECT_STATE.md`; unimplemented entries remain planned and must not be treated as current repository contents.

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
│   └── tsconfig/
│       ├── base.json
│       ├── nest.json
│       ├── next.json
│       ├── node.json
│       └── package.json
├── docs/
├── .editorconfig
├── .env.example
├── .gitignore
├── .nvmrc
├── biome.json
├── compose.yaml
├── dependency-cruiser.config.cjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── vitest.config.ts
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

Is the only shared package that reads and validates runtime configuration. Its implemented server-side contract covers API and worker startup. A separate browser-safe contract remains a conditional target and must prevent secrets from entering web bundles when authorized.

### `packages/database`

Is the sole owner of Prisma configuration, generated client, PostgreSQL adapter, schema, and future migrations. No Prisma type or delegate may be re-exported as a domain contract.

### `packages/jobs`

Owns provider-neutral durable-job contracts. The bootstrap defines only stable job envelope primitives needed by later PostgreSQL implementation; it does not introduce BullMQ.

### `packages/observability`

Owns structured logging, correlation identifiers, redaction defaults, and future metrics/tracing adapters. Domain packages must not import telemetry SDKs.

### `packages/tsconfig`

`@fas/tsconfig` owns reusable strict compiler configurations for pure Node packages, NestJS applications, and Next.js.

### `packages/test-utils`

Owns cross-package deterministic test utilities with at least two real consumers. Package-specific builders remain with their owner.

## 6. Dependency Decisions

### 6.1 Runtime and Toolchain Baseline

- Node.js: `24.18.0` LTS
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `6.0.3`, the approved compatibility baseline
- Biome: `2.5.3`
- Husky: `9.1.7`
- lint-staged: `17.0.8`
- dependency-cruiser: `18.1.0`
- Vitest: `4.1.10`, installed for the focused configuration test project

Node 24 satisfies the minimum runtime requirements of Next.js 16, NestJS 11, Prisma 7, pnpm 11, Vitest 4, and dependency-cruiser 18.

TypeScript `6.0.3` is the approved baseline after the previously proposed compiler failed the NestJS CLI compatibility gate because it did not expose the required programmatic compiler API.

The clean bootstrap compatibility gate still verifies:

- NestJS decorator compilation;
- Next.js production build;
- Prisma generation;
- Vitest execution;
- declaration generation for shared packages.

Any future TypeScript version change requires recorded compatibility evidence and an update to this document before merge.

### 6.2 Web Dependencies

- Next.js: `16.2.10`
- React: `19.2.7`
- React DOM: `19.2.7`
- TailwindCSS: deferred until an approved user-facing workflow has an immediate styling requirement
- matching React and Node type packages

shadcn/ui is not installed during bootstrap because it produces source components. It is introduced with the first approved UI component requirement.

### 6.3 API and Worker Dependencies

- `@nestjs/common`: `11.1.28`
- `@nestjs/core`: `11.1.28`
- `@nestjs/platform-express`: `11.1.28`, API only
- NestJS CLI: `11.0.24`
- `reflect-metadata`: `0.2.2`
- `rxjs`: `7.8.2`
- NestJS Swagger: deferred to v0.2 under sign-off decision DF-01
- Zod: `4.4.3`, installed as the runtime validation dependency of `@fas/config`

Express is the v0.1 HTTP adapter because it is NestJS's default and introduces the least bootstrap risk. A Fastify migration requires measured need and transport compatibility tests.

The worker uses a standalone NestJS application context and does not depend on an HTTP platform package.

### 6.4 Database Dependencies

- Prisma CLI: `7.8.0`
- Prisma Client: `7.8.0`
- Prisma PostgreSQL adapter: `7.8.0`
- `pg`: exact Prisma-compatible version to be selected and recorded by the authorized Prisma bootstrap Sprint
- `dotenv`: exact version to be selected and recorded by the authorized Prisma bootstrap Sprint if it remains necessary
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
5. Validate the approved TypeScript `6.0.3` baseline before proceeding.

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
3. Add root Vitest configuration with explicit projects.
4. Add Husky after workspace installation.
5. Run only staged Biome checks in pre-commit.
6. Keep complete typecheck, test, boundary, and build checks in CI.

Exit gate: an intentionally forbidden import fails boundary validation.

### Step 5 — Foundation Packages

Create packages in dependency order:

1. `@fas/tsconfig`;
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

Create incrementally. Existing files are retained; remaining entries are planned:

```text
.nvmrc
.editorconfig
.env.example
biome.json
compose.yaml
dependency-cruiser.config.cjs
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
turbo.json
vitest.config.ts
.github/dependabot.yml
.github/workflows/ci.yml
.husky/pre-commit
```

### 8.2 Applications

Create incrementally. The current Sprint 2 shells consolidate operational endpoints in `apps/api/src/app.controller.ts`; health modules, tests, Dockerfiles, and other listed files remain planned until their owning sprint:

```text
apps/api/Dockerfile
apps/api/package.json
apps/api/tsconfig.json
apps/api/tsconfig.build.json
apps/api/src/main.ts
apps/api/src/app.controller.ts
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
apps/worker/src/worker.module.ts
apps/worker/test/bootstrap.spec.ts

apps/web/Dockerfile
apps/web/package.json
apps/web/tsconfig.json
apps/web/next.config.ts
apps/web/postcss.config.mjs
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
apps/web/src/app/globals.css
```

### 8.3 Packages

Create only with an immediate consumer. `packages/tsconfig` and the server-side subset of `packages/config` are implemented; every other entry remains conditional under the sign-off deferrals and must not be scaffolded from this list alone:

```text
packages/tsconfig/package.json
packages/tsconfig/base.json
packages/tsconfig/node.json
packages/tsconfig/nest.json
packages/tsconfig/next.json

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
packages/config/test/environment.spec.ts

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
```

Generated and ignored:

```text
node_modules/
.turbo/
apps/web/.next/
apps/web/next-env.d.ts
coverage/
packages/database/generated/
```

## 9. Risks and Mitigations

### 9.1 Milestone Naming

Risk: implementation may be mistaken for canonical M3 Knowledge Engine work.

Mitigation: branch, PR, and release notes use “Repository Bootstrap / v0.1 Foundation,” with “3A” only as the external delivery label.

### 9.2 TypeScript Compatibility

Risk: Prisma generation, Next.js, or test tooling may expose incompatibilities with the approved TypeScript `6.0.3` baseline as the bootstrap expands.

Mitigation: retain TypeScript `6.0.3` and run the compatibility gate before each affected package expansion. Any compiler change requires recorded evidence and document alignment.

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

Status after Sprint 5: supported-toolchain clean installation demonstrated; explicit unsupported-runtime and package-manager rejection evidence remains open under sign-off condition MF-05.

From a clean clone with the pinned Node runtime:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
```

The reported versions match repository pins and installation produces no second lockfile.

### 10.2 Static Quality

Status after Sprint 5: demonstrated.

```bash
pnpm quality
pnpm typecheck
```

All commands succeed. The controlled dependency-cruiser fixture proves that a forbidden dependency is rejected.

### 10.3 Tests and Build

Status after Sprint 5: build and focused configuration tests demonstrated; application tests remain planned.

Demonstrated:

```bash
pnpm test
pnpm build
```

The implemented Vitest project discovers and passes the `@fas/config` contract tests. Remaining acceptance requires API health tests, worker bootstrap tests, and other justified application or foundation-package tests to succeed from a clean cache when their owning Sprints authorize them.

### 10.4 Prisma

Status after Sprint 5: planned and not implemented.

```bash
pnpm prisma:validate
pnpm prisma:generate
```

When implemented, acceptance requires both commands to succeed, generated output to remain inside the database package, and no other package to import Prisma directly.

### 10.5 Containers

Status after Sprint 5: planned and not implemented.

```bash
docker compose config
docker compose up -d postgres
docker compose ps
```

When implemented, acceptance requires valid Compose configuration, a healthy PostgreSQL service, and no Redis or pgvector container.

### 10.6 Runtime Shells

Status after Sprint 5: API, worker, and web shell startup/build behavior is demonstrated. API and worker configuration validation is demonstrated. Database-aware readiness, correlation, and full redaction acceptance remain planned.

Demonstrated:

- API starts and liveness succeeds;
- worker initializes and shuts down gracefully;
- web shell renders;
- API and worker reject invalid supported configuration before NestJS initialization without exposing raw invalid values;

Remaining runtime acceptance requires:

- API readiness reflects database availability;
- request correlation appears in structured logs;
- no secret value appears in logs or browser output.

### 10.7 CI

Status after Sprint 5: planned and not implemented.

When implemented, acceptance requires:

- CI to pass from a clean GitHub runner;
- frozen installation enforcement;
- Turbo cache to contain no secrets;
- valid Dependabot configuration;
- immutable-version-pinned Actions;
- no step to silently skip tests or type checks.

### 10.8 Architecture

- Domain packages import no NestJS, Next.js, Prisma, OpenAI, Redis, or telemetry SDK.
- Only the database package imports Prisma.
- Only composition roots import framework modules.
- Package consumers use export maps, not deep source paths.
- No AI, engine, user, subscription, notification, or live-analysis behavior exists.
- README and the Development Guide match actual commands and tools.

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
- If TypeScript `6.0.3` fails compatibility with a newly introduced bootstrap tool, stop, record the evidence, update the approved exact pin and this document, regenerate the lockfile, and rerun the full matrix.
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

Initial repository-bootstrap implementation was authorized by [21_ARCHITECTURE_SIGNOFF](./21_ARCHITECTURE_SIGNOFF.md). Each remaining implementation slice may proceed only through an approved sprint specification that confirms:

- scope and exclusions;
- runtime and dependency baseline;
- Biome and dependency-cruiser responsibilities;
- file creation list;
- TypeScript compatibility fallback;
- Prisma 7 configuration strategy;
- acceptance commands;
- rollback strategy.

This plan and its sign-off authorize repository bootstrap only. They do not authorize football-analysis business code or later milestone implementation.
