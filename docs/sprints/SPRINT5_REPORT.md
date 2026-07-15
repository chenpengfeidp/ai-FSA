# Sprint 5 Report — Configuration Foundation

## Status

Sprint 5 is complete.

The repository now has a private `@fas/config` workspace package that provides immutable, typed, validated API and worker environment configuration. API and worker startup consume process-specific loaders before NestJS initialization. No endpoint, response, web, football-domain, AI, persistence, queue, observability, container, CI, or deployment behavior was added.

## Files Changed

### Created

- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/src/environment.ts`
- `packages/config/src/index.ts`
- `packages/config/test/environment.spec.ts`
- `vitest.config.ts`
- `docs/sprints/SPRINT5_REPORT.md`

### Modified

- `package.json`
- `pnpm-lock.yaml`
- `turbo.json`
- `apps/api/package.json`
- `apps/api/src/main.ts`
- `apps/worker/package.json`
- `apps/worker/src/main.ts`
- `README.md`
- `docs/PROJECT_STATE.md`

The approved `docs/sprints/SPRINT5_SPECIFICATION.md` existed before implementation and was not modified. No architecture document, ADR, controller, NestJS module, web file, previous Sprint report, `@fas/tsconfig` file, quality-tool configuration, or non-allowlisted file changed.

## Dependency Versions

Sprint 5 added:

- Zod `4.4.3` as the only external runtime dependency of `@fas/config`;
- Vitest `4.1.10` as a root development dependency;
- `@fas/config` through `workspace:*` in API and worker;
- `@fas/tsconfig` through `workspace:*` as the configuration package compiler-policy dependency.

Validation used:

- Node.js `24.18.0`;
- pnpm `11.13.0`;
- TypeScript `6.0.3`;
- Turborepo `2.10.5`.

No dotenv, configuration framework, secret SDK, database package, provider SDK, queue package, or validation alternative was added.

## Environment Contract

Sprint 5 validates only current process inputs:

- `NODE_ENV`
  - accepts `development`, `test`, or `production`;
  - defaults to `development`;
  - belongs to API and worker runtime configuration.
- `HOST`
  - must be a non-empty string;
  - defaults to `127.0.0.1`;
  - belongs only to API HTTP configuration.
- `PORT`
  - must be a complete base-10 integer string from `1` through `65535`;
  - defaults to `3001`;
  - belongs only to API HTTP configuration.

Unknown variables are ignored by explicit process schemas. No secret or future-capability variable was introduced.

## Public API

The package exports only its root entry point and exposes:

- `RuntimeEnvironment`;
- `EnvironmentSource`;
- `RuntimeConfig`;
- `HttpConfig`;
- `ApiConfig`;
- `WorkerConfig`;
- `ConfigurationIssue`;
- `ConfigurationValidationError`;
- `loadApiConfig`;
- `loadWorkerConfig`.

There is no default export, mutable singleton, module-load environment snapshot, raw Zod schema, Zod type, browser subpath, or source deep-import path.

## Design Decisions

### Process-specific Loading

- API configuration includes runtime and HTTP values.
- Worker configuration includes runtime values only.
- Worker validation ignores API-only variables.
- Loaders read the current process environment only when no source is supplied.
- Explicit sources enable deterministic validation without mutating `process.env`.

### Immutable Output

- Top-level configuration objects are frozen.
- Nested runtime and HTTP objects are frozen.
- Public TypeScript properties are readonly.
- Source objects are never mutated.

### Safe Failure Contract

- Zod remains an internal implementation detail.
- Zod issues are mapped to package-owned variable names, stable codes, and safe messages.
- Public errors do not retain the Zod error or source object as a cause.
- Error messages, stacks, and serialized issues do not include raw invalid values.

### Consumer Integration

- API loads configuration before creating the NestJS application.
- API uses validated host and port values while preserving existing defaults.
- Worker loads configuration before creating its NestJS application context.
- Existing API endpoints and responses remain unchanged.
- Existing worker startup log and clean shutdown remain unchanged.
- API and worker no longer read `process.env` directly.

### Build and Test Integration

- `@fas/config` emits ESM JavaScript, declarations, declaration maps, and source maps under ignored `dist/`.
- API and worker workspace dependencies make their builds depend on the configuration build.
- Turborepo typechecking now also waits for dependency builds so clean consumers can resolve generated declarations.
- API and worker development commands build `@fas/config` before starting.
- Root `vitest.config.ts` uses `test.projects` and defines exactly one named Node project, `config`.
- Root `test` runs through Turborepo.
- Root `validate` now runs workspace checks, quality, typecheck, tests, and builds.
- Test outputs are empty because coverage is outside Sprint 5.

The package extends `@fas/tsconfig/node.json` but overrides `types` with an empty list because the approved Sprint dependency set does not add `@types/node` to the package. A minimal structural Node process check obtains the environment at runtime. This avoids undeclared dependency resolution while retaining the approved Node target and module policy.

## Validation Commands

Every command required by the specification was executed:

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

Additional validation covered:

- clean generated-output removal before consumer typechecking;
- API and worker package export resolution;
- valid API and worker configuration output;
- safe invalid-port and invalid-runtime failures;
- direct-process environment ownership search;
- Turborepo dry-run dependency ordering;
- bounded API liveness and version smoke checks;
- bounded worker startup and shutdown;
- dependency and version listing;
- final allowlist, whitespace, and IDE diagnostic checks.

## Validation Evidence

### Workspace and Installation

- pnpm recognized six workspace projects: root plus five child packages.
- Workspace validation reported five child workspace packages.
- `@fas/config` resolved as a private workspace package.
- Normal and frozen-lockfile installation passed.
- The lockfile was generated by pnpm.

### Focused Tests

- Vitest discovered exactly one named project: `config`.
- Vitest discovered exactly one file: `packages/config/test/environment.spec.ts`.
- All 17 configuration tests passed.
- Tests covered defaults, overrides, process separation, invalid runtime mode, empty host, seven invalid port forms, safe errors, source immutability, runtime immutability, and repeated call-time sources.

### Quality and Architecture

- Biome checked 35 files without writing or reporting violations.
- dependency-cruiser passed over 12 modules and 8 dependencies.
- The controlled dependency-cruiser negative test still rejected its fixture with `fixture-no-app-imports`.
- No direct `process.env` read remains under API or worker source.
- Zod is the only framework/library import in configuration source.
- IDE diagnostics reported no errors in changed implementation files.

### Typecheck and Build

- Configuration package typecheck and build passed.
- API, worker, and web typechecks passed.
- Configuration, API, worker, and web production builds passed.
- Next.js route generation and static build passed.
- Clean-state typechecking built `@fas/config` before API and worker consumers.
- Turborepo dry-run showed `@fas/config#build` as a dependency of API/worker build and typecheck tasks.

### Runtime and Export Resolution

API-context import resolution returned:

```json
{"runtime":{"environment":"test"},"http":{"host":"127.0.0.1","port":3101}}
```

Worker-context import resolution returned:

```json
{"runtime":{"environment":"test"}}
```

The bounded API smoke test:

- started on `127.0.0.1:3101`;
- returned `{"status":"ok"}` from `/health/live`;
- returned the unchanged version response.

The bounded worker smoke test logged `Worker started.` and exited cleanly.

An invalid API port failed before NestJS initialization with:

```text
ConfigurationValidationError: Invalid environment configuration: PORT.
```

The canary invalid value was absent from the error message, stack, and issues.

## Implementation Issues Resolved

- The first package typecheck ran before the newly declared Zod dependency was linked. Running the required workspace installation resolved it.
- The initial package Vitest script inherited the package working directory, so the root include pattern found no tests. The script now sets the repository root explicitly and discovers the `config` project.
- Initial Biome validation requested formatting changes only in new configuration files; those files were formatted without touching unrelated source.
- Turborepo initially expected coverage output from tests even though coverage is excluded. The test task now declares no outputs.
- Ignored stale dependency links from an older local `packages/config` artifact were removed. Clean package typechecking then exposed an undeclared Node type dependency. The package now retains `@fas/tsconfig/node.json` while overriding ambient types and using a minimal runtime process structure, so clean validation passes without adding an unapproved dependency.
- A direct unbounded worker start was rejected by execution safety review. A bounded child-process smoke test proved the same startup and shutdown behavior.

No issue required an architecture, ADR, endpoint, response, web, persistence, AI, queue, observability, container, or CI change.

## Known Limitations

- Only `NODE_ENV`, API `HOST`, and API `PORT` are supported.
- No browser-safe export exists.
- No secret configuration exists.
- No `.env` loading exists.
- Database, jobs, storage, providers, observability, and feature flags have no configuration contract.
- API readiness does not yet cover database or schema compatibility.
- Vitest contains only the configuration project; application test projects remain future work.
- Development commands build configuration once before watch mode and do not watch configuration source concurrently.
- The implementation-plan progress overlay and Sprint 5 specification status remain at their pre-implementation snapshots because Sprint 5 did not authorize modifying those documents.

## Remaining Work

Remaining Milestone 3A work includes:

- automated API, worker, and web tests beyond configuration;
- database and Prisma no-model configuration;
- typed configuration expansion only when those capabilities have immediate consumers;
- observability and correlation;
- container packaging and deterministic runtime smoke validation;
- security gates and CI.

Sprint 5 does not complete Milestone 3A or canonical v0.1. Sprint 6 was not started.
