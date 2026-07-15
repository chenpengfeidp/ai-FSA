# Sprint 3 Specification — Platform Foundation

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 3
- Theme: Platform Foundation
- Specification status: Complete
- Implementation status: Completed

This document is the official implementation specification for Sprint 3. It narrows the broader foundation-package plan in `docs/20_IMPLEMENTATION_PLAN.md` according to the immediate-consumer and deferral decisions in `docs/21_ARCHITECTURE_SIGNOFF.md`.

Sprint 3 was separately authorized and completed. Implementation evidence is recorded in `docs/sprints/SPRINT3_REPORT.md`.

# Sprint Goal

Create one reusable TypeScript configuration package and make it the shared compiler-policy source for the existing root, API, web, and worker TypeScript configurations.

The sprint establishes a real platform package with demonstrated consumers while introducing no runtime behavior, business contract, persistence concern, or speculative package API.

# Business Value

The package reduces compiler-policy drift across the three existing applications.

It provides:

- one reviewed location for strict TypeScript defaults;
- explicit NestJS and Next.js compiler variants;
- consistent TypeScript behavior across current composition roots;
- a package export contract that future packages can consume without path aliases;
- evidence that the monorepo can support a shared package with real consumers.

This is platform value, not football-domain functionality.

# Scope

Sprint 3 implementation is limited to:

1. creating `@fas/tsconfig`;
2. defining strict base, Node.js, NestJS, and Next.js configuration variants;
3. declaring explicit JSON export-map entries;
4. making the root TypeScript configuration consume the shared base;
5. making API and worker TypeScript configurations consume the NestJS variant;
6. making the web TypeScript configuration consume the Next.js variant;
7. adding explicit `workspace:*` development dependencies from each consumer;
8. regenerating the root lockfile through pnpm;
9. validating resolved compiler configurations, typechecking, and production builds;
10. recording Sprint 3 evidence and updating project state after implementation.

Application-specific settings remain local, including:

- source inclusion and exclusion;
- `rootDir` and `outDir`;
- generated Next.js type inclusion;
- application build outputs;
- application-specific declaration settings.

No file under `apps/*/src/` may change.

# Explicit Non-goals

Sprint 3 does not include:

- football business logic;
- AI behavior, prompts, providers, models, or validation;
- database or Prisma setup;
- PostgreSQL runtime configuration;
- Redis, BullMQ, queues, jobs, or schedulers;
- OpenAI or any other provider SDK;
- API DTOs or transport contracts;
- repositories or persistence ports;
- entities, aggregates, value objects, or domain models;
- shared domain primitives;
- configuration-value parsing or environment validation;
- logging, metrics, tracing, or correlation implementation;
- test utility packages;
- UI components or styling infrastructure;
- new routes, endpoints, pages, controllers, services, or workers;
- changes to application source code;
- Docker, Compose, CI, Husky, Biome, dependency-cruiser, or Vitest setup;
- path aliases that bypass package exports;
- declaration of future engine packages;
- Sprint 4 planning or implementation.

# Immediate Consumers

Every exported configuration has an identified consumer:

| Export | Immediate consumer | Reason |
|---|---|---|
| `@fas/tsconfig/base.json` | root `tsconfig.base.json` | Own repository-wide strict compiler policy |
| `@fas/tsconfig/node.json` | `nest.json` | Supply the shared NodeNext runtime baseline used by both NestJS applications |
| `@fas/tsconfig/nest.json` | `apps/api/tsconfig.json`, `apps/worker/tsconfig.json` | Supply decorator metadata and Node runtime settings |
| `@fas/tsconfig/next.json` | `apps/web/tsconfig.json` | Supply browser libraries, bundler resolution, JSX, and Next.js plugin settings |

The Node.js variant is retained because the NestJS variant consumes it immediately. It is not justified only by hypothetical future packages.

No export may be added without naming an existing consumer in the Sprint 3 report.

# Packages to Create

## `@fas/tsconfig`

Purpose:

- own reusable TypeScript compiler policy;
- expose framework-specific JSON configurations;
- eliminate copied common compiler options;
- remain free of runtime code and runtime dependencies.

Package requirements:

- package name: `@fas/tsconfig`;
- version: `0.0.0`;
- private: `true`;
- explicit export map;
- no default package export;
- no `src/` directory;
- no JavaScript or TypeScript source;
- no build output;
- no runtime dependencies;
- no postinstall or lifecycle scripts.

No other package may be created in Sprint 3.

The following planned packages remain deferred because this sprint cannot provide a valid immediate consumer without application-source, domain, transport, persistence, or runtime behavior:

- `@fas/config`;
- `@fas/observability`;
- `@fas/api-contracts`;
- `@fas/domain`;
- `@fas/database`;
- `@fas/jobs`;
- `@fas/test-utils`;
- all engine packages.

# Directory Structure

The intended Sprint 3 structure is:

```text
packages/
└── tsconfig/
    ├── package.json
    ├── base.json
    ├── node.json
    ├── nest.json
    └── next.json
```

Existing consumer files permitted to change during implementation:

```text
package.json
pnpm-lock.yaml
tsconfig.base.json
apps/api/package.json
apps/api/tsconfig.json
apps/web/package.json
apps/web/tsconfig.json
apps/worker/package.json
apps/worker/tsconfig.json
docs/PROJECT_STATE.md
docs/sprints/SPRINT3_REPORT.md
```

No other existing file is in scope.

# Dependencies

## New External Dependencies

None.

## Internal Dependencies

The root package and each application declare:

```json
{
  "devDependencies": {
    "@fas/tsconfig": "workspace:*"
  }
}
```

These declarations make package ownership and consumption explicit in the workspace graph.

## Existing Toolchain

Sprint 3 retains:

- Node.js `24.18.0`;
- pnpm `11.13.0`;
- TypeScript `6.0.3`;
- Turborepo `2.10.5`.

No dependency version changes are authorized.

The lockfile may change only through `pnpm install`; it must not be edited manually.

# Public APIs

The package exposes exactly four JSON subpaths:

```json
{
  "exports": {
    "./base.json": "./base.json",
    "./node.json": "./node.json",
    "./nest.json": "./nest.json",
    "./next.json": "./next.json"
  }
}
```

There is no `"."` export because the package has no runtime or TypeScript module API.

## `base.json`

Owns compiler settings shared by all current consumers:

- strict typechecking;
- unchecked indexed-access protection;
- exact optional-property types;
- implicit override and return checks;
- fallthrough prevention;
- consistent file-name casing;
- isolated modules;
- JSON module resolution;
- source-map and declaration defaults where generally applicable;
- skip-library-check policy;
- no-emit default.

It must not contain framework-specific libraries, decorators, JSX, output paths, source includes, or path aliases.

## `node.json`

Extends `base.json` and owns:

- the approved ECMAScript target and library;
- `NodeNext` module and module resolution;
- Node.js type availability;
- Node-compatible ESM behavior.

## `nest.json`

Extends `node.json` and owns only NestJS compiler requirements:

- experimental decorators;
- decorator metadata emission.

Application output paths and declaration choices remain in the API and worker configurations.

## `next.json`

Extends `base.json` and owns:

- DOM and iterable libraries;
- ES module output;
- bundler module resolution;
- preserved JSX;
- incremental compilation;
- the Next.js TypeScript plugin;
- browser/framework type availability required by the web shell.

Generated type paths and application source includes remain in `apps/web/tsconfig.json`.

# Validation Strategy

Validation is consumer-driven because the package contains declarative compiler policy rather than executable logic.

## Configuration Validation

- Parse every JSON file successfully.
- Resolve each application configuration with TypeScript `--showConfig`.
- Confirm the root consumes `base.json`.
- Confirm API and worker consume `nest.json`.
- Confirm web consumes `next.json`.
- Confirm all four exported subpaths resolve through the package export map.
- Confirm no unexported deep path is required by a consumer.

## Workspace Validation

- Run pnpm installation from the repository root.
- Confirm the workspace recognizes `@fas/tsconfig`.
- Confirm all four immediate-consumer dependency declarations use `workspace:*`.
- Inspect the Turborepo graph for unintended package relationships.

## Regression Validation

- Typecheck all existing applications.
- Build all existing applications.
- Confirm API, web, and worker source files are unchanged.
- Confirm no runtime dependency or prohibited package was added.

No unit-test suite is required for static JSON files. Compiler resolution and all-consumer builds are the executable contract tests.

# Acceptance Criteria

Sprint 3 passes only when all of the following are true:

- `packages/tsconfig/package.json` exists as `@fas/tsconfig`.
- The package is private and has an explicit export map.
- Exactly four configuration files are exported.
- The package contains no `src/` directory or executable code.
- The package has no runtime dependencies.
- Every export has the immediate consumer documented above.
- Root, API, web, and worker declare `@fas/tsconfig` through `workspace:*`.
- Common compiler policy is not duplicated in consumer configurations.
- Application-specific compiler settings remain local.
- No path alias bypasses package exports.
- `pnpm install` succeeds.
- `pnpm install --frozen-lockfile` succeeds after lockfile generation.
- `pnpm workspace:check` succeeds and reports four child workspace packages.
- TypeScript resolves all four consumer configurations.
- `pnpm typecheck` succeeds.
- `pnpm build` succeeds.
- `pnpm validate` succeeds.
- No application source file changes.
- No football, AI, database, DTO, repository, entity, or domain-model code exists in the Sprint 3 diff.
- No prohibited dependency appears in any changed manifest or lockfile.
- `docs/sprints/SPRINT3_REPORT.md` records files, decisions, validation evidence, and remaining work.
- `docs/PROJECT_STATE.md` is updated only after implementation evidence is complete.

# Risks

## Configuration Drift

Risk: shared options remain copied in application configurations.

Mitigation: consumer files retain only application-specific overrides and includes; resolved configurations are reviewed.

## Framework Incompatibility

Risk: moving options changes NestJS decorator compilation or Next.js type generation.

Mitigation: run TypeScript resolution, all workspace typechecks, and all production builds.

## Package Resolution

Risk: TypeScript cannot resolve JSON configs through pnpm workspace package exports.

Mitigation: validate each `extends` path before removing existing inherited settings; stop rather than add path aliases or filesystem deep imports.

## Over-generalization

Risk: the package accumulates settings for hypothetical consumers.

Mitigation: every export is tied to a current root or application consumer; no additional variant is allowed.

## Duplicate Authority

Risk: root `tsconfig.base.json` and package `base.json` both define common policy.

Mitigation: package `base.json` becomes the policy owner; root `tsconfig.base.json` becomes a consumer entry point and does not repeat common options.

## Scope Leakage

Risk: platform foundation expands into environment configuration, logging, contracts, tests, or application refactoring.

Mitigation: create only `@fas/tsconfig`, restrict changed files to the allowlist, and reject all `apps/*/src/` changes.

# Stop Boundary

Sprint 3 stops after:

- the shared TypeScript configuration package is created;
- all four immediate consumers are wired through manifests and TypeScript configuration files;
- the lockfile is regenerated;
- configuration resolution, typecheck, build, and validation evidence pass;
- the Sprint 3 report and project-state update are complete.

Do not continue into:

- runtime environment configuration;
- observability;
- API contracts;
- domain packages;
- database or jobs;
- testing infrastructure;
- quality-tool installation;
- containers or CI;
- Sprint 4 planning or implementation.

Any required application-source change is a scope violation and stops the sprint for review.

# Deliverables

Sprint 3 implementation deliverables are:

1. `packages/tsconfig/package.json`
2. `packages/tsconfig/base.json`
3. `packages/tsconfig/node.json`
4. `packages/tsconfig/nest.json`
5. `packages/tsconfig/next.json`
6. updated root and application package manifests with explicit workspace dependencies
7. updated root and application TypeScript consumer configurations
8. regenerated `pnpm-lock.yaml`
9. `docs/sprints/SPRINT3_REPORT.md`
10. updated `docs/PROJECT_STATE.md`

No other deliverable is authorized.

# Sprint Completion Definition

Sprint 3 is complete when the repository has one non-speculative platform package, each public export has a current consumer, all existing application behavior remains unchanged, and the complete validation matrix passes from the repository root.

Completion must be demonstrated by recorded command output and a reviewed diff, not inferred from file presence.

Sprint 3 completion does not complete Milestone 3A or canonical v0.1. It does not authorize Sprint 4.
