# Sprint 5 Specification — Configuration Foundation

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 5
- Theme: Configuration Foundation
- Specification status: Complete
- Implementation status: Completed

This document is the official implementation specification for Sprint 5. It narrows the typed-runtime-configuration scope in `docs/20_IMPLEMENTATION_PLAN.md` according to the binding conditions in `docs/21_ARCHITECTURE_SIGNOFF.md`.

Sprint 5 was separately authorized and completed. Implementation evidence is recorded in `docs/sprints/SPRINT5_REPORT.md`.

# Goal

Create a reusable `@fas/config` package that owns typed, validated environment configuration for the API, worker, and future server-side packages.

Sprint 5 must replace direct environment parsing in the API composition root, make API and worker startup consume explicit process-specific configuration, and fail safely when supported configuration is invalid.

The sprint introduces configuration infrastructure only. It does not add business behavior, persistence, AI behavior, new API contracts, or deployment infrastructure.

# Business Value

Typed startup configuration reduces hidden runtime assumptions before database, jobs, observability, providers, and containers are introduced.

The configuration foundation provides:

- one owner for environment parsing and validation;
- deterministic startup failure for malformed values;
- process-specific configuration instead of one oversized global schema;
- immutable typed values for composition roots and future adapters;
- safe validation errors that do not disclose raw environment values;
- testable parsing without mutating global `process.env`;
- a stable expansion point for future server-side capabilities;
- evidence that API and worker use the same configuration policy.

This sprint improves runtime correctness without changing football-analysis behavior.

# Scope

## Configuration Package

Create one private workspace package:

```text
packages/config/
├── package.json
├── tsconfig.json
├── src/
│   ├── environment.ts
│   └── index.ts
└── test/
    └── environment.spec.ts
```

The package must:

- use the workspace name `@fas/config`;
- use ESM and strict TypeScript;
- extend `@fas/tsconfig/node.json`;
- expose one explicit root export and no deep-import escape path;
- contain no NestJS, Next.js, Prisma, database, AI-provider, job, telemetry, or web dependency;
- use Zod internally for runtime validation;
- return package-owned immutable configuration contracts;
- avoid exporting raw Zod schemas or Zod-specific public types;
- have no side effects when imported;
- read `process.env` only when a loader is called without an explicit source;
- support deterministic validation through an explicit environment source.

## Supported Environment Contract

Sprint 5 supports only variables with current API or worker consumers:

- `NODE_ENV`
  - accepted values: `development`, `test`, `production`;
  - default: `development`;
  - consumed by API and worker configuration.
- `HOST`
  - non-empty string;
  - default: `127.0.0.1`;
  - consumed only by API HTTP configuration.
- `PORT`
  - strict base-10 integer from `1` through `65535`;
  - default: `3001`;
  - consumed only by API HTTP configuration.

Parsing must reject partial numeric values such as `3001x`, non-finite values, fractional values, zero, negative values, and values above `65535`.

Defaults preserve current shell behavior. No secret, database, provider, queue, object-storage, observability, or feature-flag variable is introduced.

## API Integration

The API composition root must:

- declare `@fas/config` through `workspace:*`;
- call the API configuration loader before creating the NestJS application;
- use the validated HTTP host and port instead of reading `process.env`;
- preserve default host `127.0.0.1` and port `3001`;
- preserve all existing endpoints and response bodies;
- fail before listening when configuration is invalid;
- allow the existing top-level bootstrap error handling to report a safe configuration failure.

No controller, module, endpoint, readiness response, or transport contract may change.

Successful API startup proves required configuration has already been validated. Database-aware readiness remains outside this sprint.

## Worker Integration

The worker composition root must:

- declare `@fas/config` through `workspace:*`;
- call the worker configuration loader before creating the NestJS application context;
- validate the supported runtime environment before worker initialization;
- preserve the existing `Worker started.` log and clean shutdown behavior;
- fail before NestJS initialization when configuration is invalid.

No queue, poller, schedule, artificial idle loop, job handler, or new worker behavior may be added.

## Build and Development Integration

The implementation must ensure a clean clone can resolve and execute `@fas/config`:

- configuration build output and declarations must be reproducible and ignored when generated;
- API and worker production builds must depend on the configuration package build through the workspace graph;
- API and worker typechecks must resolve package declarations from a clean workspace;
- API and worker development commands must prepare the configuration package before runtime startup;
- package exports must resolve at runtime without TypeScript path aliases or filesystem deep imports.

Changes to `turbo.json` are permitted only if required to make dependency build/typecheck ordering explicit. No unrelated task semantics may change.

## Focused Validation Support

Add the approved Vitest baseline only because configuration parsing has immediate executable test cases.

The implementation must:

- exact-pin Vitest `4.1.10` as a root development dependency;
- create root `vitest.config.ts`;
- use `test.projects`, not the removed workspace configuration;
- define exactly one named Node project for `@fas/config`;
- discover only the Sprint 5 configuration tests;
- add a root `test` command;
- include tests in the non-writing root `validate` pipeline;
- avoid adding empty application test projects or shared test utilities.

This is not a general application-testing sprint.

## Allowed Change Surface

Sprint 5 implementation is restricted to:

### Root

- `package.json`
- `pnpm-lock.yaml`
- `turbo.json`, only when dependency ordering requires it
- `vitest.config.ts`
- `README.md`, only for configuration variables and validation commands

### Configuration Package

- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/src/environment.ts`
- `packages/config/src/index.ts`
- `packages/config/test/environment.spec.ts`

### Immediate Consumers

- `apps/api/package.json`
- `apps/api/src/main.ts`
- `apps/worker/package.json`
- `apps/worker/src/main.ts`

### Evidence and State

- `docs/PROJECT_STATE.md`
- `docs/sprints/SPRINT5_REPORT.md`

No other file is authorized. If implementation requires a file outside this list, stop and request scope review.

# Non-goals

Sprint 5 must not introduce:

- football-domain entities, rules, services, use cases, or contracts;
- AI providers, prompts, retrieval, engines, evaluation, or review behavior;
- Prisma, PostgreSQL, schemas, migrations, repositories, or persistence;
- Redis, BullMQ, pgvector, queues, schedules, or durable jobs;
- object storage;
- logging, correlation, tracing, metrics, or an observability package;
- API endpoints, DTOs, response changes, controllers, or module changes;
- web configuration, browser-safe exports, `NEXT_PUBLIC_*` variables, or web source changes;
- secrets, credentials, provider keys, database URLs, or secret-loading infrastructure;
- `.env` file loading, dotenv, or automatic local environment mutation;
- a committed `.env` file;
- feature flags or environment-controlled domain policy;
- NestJS configuration modules or global modules;
- a service locator, mutable configuration singleton, or dependency-injection container inside `@fas/config`;
- raw Zod schemas or Zod errors in the public API;
- application-wide test projects, integration tests, end-to-end tests, coverage tooling, or `@fas/test-utils`;
- Docker, Compose, CI, security scanning, or deployment changes;
- Turborepo changes unrelated to configuration dependency ordering;
- changes to `@fas/tsconfig`, Biome, dependency-cruiser, Husky, or lint-staged;
- changes to ADRs, previous Sprint reports, or canonical architecture decisions;
- Sprint 6 planning or implementation.

# Package Definition

## Identity

- Package name: `@fas/config`
- Visibility: private workspace package
- Module format: ESM
- Runtime: Node.js `24.18.0`
- Compiler policy: `@fas/tsconfig/node.json`
- Runtime dependency: Zod `4.4.3`, exact-pinned
- Development dependency: `@fas/tsconfig` through `workspace:*`

API and worker must declare `@fas/config` through `workspace:*`.

## Ownership

`@fas/config` is the only shared package authorized to parse and validate server environment variables.

Composition roots may select the correct process loader and receive the resulting immutable object. They must not:

- parse strings into numbers or booleans;
- apply configuration defaults;
- import Zod schemas;
- inspect another process's configuration;
- expose configuration through API contracts;
- log source environment objects.

Future packages may consume typed configuration values passed by a composition root. They must not read `process.env` directly.

## Dependencies

The implementation may add only:

- `zod@4.4.3` to `@fas/config` runtime dependencies;
- `vitest@4.1.10` to root development dependencies;
- `@fas/config` workspace dependencies to API and worker;
- `@fas/tsconfig` workspace development dependency to `@fas/config`.

No dotenv, configuration framework, secret manager SDK, validation alternative, or runtime dependency may be added.

## Export Policy

The package must:

- expose only `"."`;
- provide explicit ESM runtime and declaration targets;
- emit build output under `packages/config/dist/`;
- export no default value;
- export no mutable singleton;
- export no environment snapshot created at module load;
- export no `src/*` deep path;
- keep Zod as an implementation detail.

A browser-safe subpath is deferred until the web application has an approved immediate configuration consumer.

# Public API

The public API is limited to the following conceptual surface:

```typescript
export type RuntimeEnvironment = "development" | "test" | "production";

export type EnvironmentSource = Readonly<
  Record<string, string | undefined>
>;

export interface RuntimeConfig {
  readonly environment: RuntimeEnvironment;
}

export interface HttpConfig {
  readonly host: string;
  readonly port: number;
}

export interface ApiConfig {
  readonly runtime: RuntimeConfig;
  readonly http: HttpConfig;
}

export interface WorkerConfig {
  readonly runtime: RuntimeConfig;
}

export interface ConfigurationIssue {
  readonly variable: string;
  readonly code: string;
  readonly message: string;
}

export class ConfigurationValidationError extends Error {
  readonly issues: readonly ConfigurationIssue[];
}

export function loadApiConfig(
  source?: EnvironmentSource,
): ApiConfig;

export function loadWorkerConfig(
  source?: EnvironmentSource,
): WorkerConfig;
```

The exact formatting may follow repository conventions, but the implementation must not expand this surface.

## Loader Semantics

- Omitting `source` reads the current `process.env` at call time.
- Providing `source` performs deterministic validation without reading or mutating global environment state.
- Loaders do not mutate the source object.
- Returned objects and nested objects are immutable at type and runtime levels.
- Unknown variables are ignored because each process selects an explicit allowlist.
- Invalid input throws `ConfigurationValidationError`.
- Public issues identify variable names and stable problem categories.
- Errors, issues, messages, logs, and stacks must not contain raw invalid values or the full source object.
- No configuration object is created during module import.

# Validation

## Unit Validation

The configuration test project must cover:

- defaults for API configuration;
- defaults for worker configuration;
- valid `NODE_ENV`, `HOST`, and `PORT` overrides;
- strict conversion of valid port strings to numbers;
- rejection of unknown `NODE_ENV` values;
- rejection of empty hosts;
- rejection of non-numeric, partially numeric, fractional, zero, negative, and out-of-range ports;
- API and worker process-specific schemas;
- source-object immutability;
- returned object and nested-object runtime immutability;
- stable package-owned validation errors;
- absence of raw invalid values in errors and serialized issues;
- repeated calls using the supplied source rather than stale module state.

Tests must not mutate `process.env` globally.

## Configuration Resolution

Validation must prove:

- the root Vitest configuration discovers exactly the `@fas/config` project;
- package exports resolve from API and worker;
- TypeScript resolves package declarations from a clean generated state;
- production builds order `@fas/config` before API and worker;
- no path alias or deep source import is required;
- API and worker contain no direct `process.env` read after integration;
- API defaults remain host `127.0.0.1` and port `3001`;
- worker startup and shutdown behavior is unchanged.

## Validation Commands

Run from the repository root with Node.js `24.18.0` and pnpm `11.13.0`:

```bash
pnpm install
pnpm install --frozen-lockfile

pnpm workspace:check
pnpm --filter @fas/config typecheck
pnpm --filter @fas/config build
pnpm --filter @fas/config test
pnpm test

pnpm quality
pnpm typecheck
pnpm build
pnpm validate
```

Implementation review must additionally record:

- the Vitest project name and discovered configuration test file;
- one valid API configuration result with no secrets;
- one expected invalid-port failure containing no raw invalid value;
- one expected invalid-runtime-environment failure;
- package export resolution from API and worker contexts;
- the Turborepo dry-run dependency order for configuration, API, and worker;
- a diff proving no API controller, web source, or non-allowlisted file changed;
- `git diff --check` output.

# Acceptance Criteria

Sprint 5 passes only when all of the following are true:

## Package

- `packages/config` exists as private package `@fas/config`.
- It has one explicit root export and no deep-import escape path.
- It extends `@fas/tsconfig/node.json`.
- It contains only the approved source, test, manifest, and TypeScript files.
- It has no framework or infrastructure dependency.
- Zod `4.4.3` is its only external runtime dependency.
- Zod does not appear in the public type surface.
- Importing the package does not read environment state or create configuration.
- Build output and declarations are reproducible and uncommitted.

## Public Contract

- Public exports do not exceed the defined API.
- API and worker loaders return process-specific immutable contracts.
- Defaults match current runtime behavior.
- Ports are parsed strictly and validated within range.
- Validation failures use `ConfigurationValidationError`.
- Error issues expose variable names and safe codes/messages only.
- Raw invalid values and complete environment sources never appear in public errors.
- Loaders accept explicit sources without mutating them or global `process.env`.

## Consumers

- API and worker declare `@fas/config` with `workspace:*`.
- API uses validated host and port values.
- Worker validates runtime configuration before NestJS initialization.
- API and worker no longer read `process.env` directly.
- API endpoints and responses are unchanged.
- Worker startup log and clean shutdown are unchanged.
- Web source and manifest are unchanged.
- No other workspace consumes `@fas/config`.

## Validation Infrastructure

- Vitest is exact-pinned at `4.1.10`.
- Root `vitest.config.ts` uses explicit `test.projects`.
- Exactly one named Node project discovers the configuration tests.
- Root and package test commands succeed.
- Root `validate` includes tests and remains non-writing.
- No empty test project or shared test-utility package is created.

## Repository Quality

- Installation and frozen-lockfile installation succeed.
- Workspace validation recognizes `@fas/config`.
- The lockfile is generated by pnpm.
- Biome and dependency-cruiser checks pass.
- The controlled dependency-cruiser negative test still passes.
- Configuration, API, and worker typechecks pass.
- Configuration, API, web, and worker production builds pass.
- Package export resolution succeeds without path aliases.
- The final diff contains only allowed files.
- No football, AI, persistence, API-contract, web, queue, observability, container, CI, or deployment behavior is added.
- `docs/sprints/SPRINT5_REPORT.md` records implementation and validation evidence.
- `docs/PROJECT_STATE.md` is updated only after all acceptance evidence passes.

# Risks

## Configuration Becomes a Global Dumping Ground

Risk: unrelated variables accumulate in one oversized schema and force every process to require capabilities it cannot execute.

Mitigation: keep explicit API and worker loaders, share only the small runtime schema, and add variables only with an immediate process consumer.

## Secret Exposure

Risk: validation errors or startup logging include raw environment values.

Mitigation: map Zod issues into package-owned safe issues, never expose input values, and test failure serialization using canary values.

## Behavior Regression

Risk: replacing API parsing changes default host or port behavior.

Mitigation: preserve exact defaults, validate strict conversion, and compare startup configuration before and after integration.

## Module-load State

Risk: configuration is parsed at import time, making tests order-dependent and preserving stale environment state.

Mitigation: loaders read at call time, accept explicit immutable sources, and have no exported singleton.

## Package Build Ordering

Risk: API or worker resolves missing configuration output in a clean clone.

Mitigation: declare workspace dependencies, explicit exports, reproducible declarations, dependency build ordering, and clean-state resolution checks.

## Test Infrastructure Expansion

Risk: adding Vitest expands into empty application projects, broad test utilities, or unrelated testing work.

Mitigation: define exactly one configuration project and reject every test file or project outside the Sprint 5 allowlist.

## Browser Secret Leakage

Risk: a shared configuration package is imported into the web bundle before a safe public contract exists.

Mitigation: do not add a browser export or web dependency in this sprint. A future browser-safe subpath requires an approved web consumer and explicit allowlist.

## Policy Through Environment Flags

Risk: environment variables begin to redefine domain, AI, validation, or publication policy.

Mitigation: restrict Sprint 5 variables to process mode and API listener settings. Governed behavior remains in versioned domain records.

## Scope Leakage

Risk: configuration work expands into observability, readiness redesign, persistence, `.env` loading, containers, or deployment.

Mitigation: enforce the allowlist and stop when an additional capability or file is required.

# Stop Boundary

Sprint 5 stops after:

- `@fas/config` is created with the approved public API;
- current API and worker variables are typed and validated;
- API and worker use process-specific loaders;
- package build, typecheck, tests, and export resolution pass;
- focused Vitest discovery and validation pass;
- all repository quality, typecheck, test, build, and validation commands pass;
- the Sprint 5 report and project-state update are complete.

Do not continue into:

- browser-safe configuration;
- secrets or provider configuration;
- database or Prisma configuration;
- observability or correlation;
- readiness response redesign;
- `.env` loading;
- containers or CI;
- application-wide testing;
- domain, AI, jobs, storage, or persistence work;
- Sprint 6 planning or implementation.

Any API contract change, web change, new runtime capability, secret variable, non-allowlisted file requirement, or architecture conflict stops the sprint for review.

# Deliverables

Sprint 5 implementation deliverables are:

1. `packages/config/package.json`
2. `packages/config/tsconfig.json`
3. `packages/config/src/environment.ts`
4. `packages/config/src/index.ts`
5. `packages/config/test/environment.spec.ts`
6. root `vitest.config.ts` with one explicit configuration project
7. updated root `package.json` with exact Vitest pin and test/validation scripts
8. regenerated `pnpm-lock.yaml`
9. updated API manifest and composition root
10. updated worker manifest and composition root
11. dependency-order adjustment in `turbo.json` only if clean-state validation requires it
12. README configuration and command documentation if required
13. `docs/sprints/SPRINT5_REPORT.md`
14. updated `docs/PROJECT_STATE.md`

No other deliverable is authorized.

# Sprint Completion Definition

Sprint 5 is complete when API and worker startup receive immutable, process-specific configuration from `@fas/config`, invalid supported values fail safely without disclosing raw input, focused executable tests prove the contract, and the complete repository validation pipeline passes without behavior outside the approved scope.

Completion must be demonstrated by recorded command output and a reviewed allowlist diff, not inferred from file presence.

Sprint 5 completion does not complete Milestone 3A or canonical v0.1. It does not authorize Sprint 6.
