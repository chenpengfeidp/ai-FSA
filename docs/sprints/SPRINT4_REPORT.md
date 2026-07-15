# Sprint 4 Report — Engineering Quality Foundation

## Status

Sprint 4 is complete.

The repository now has one formatting and source-linting authority, executable dependency-boundary checks with a controlled failure proof, staged-only local pre-commit checks, and a unified non-writing validation pipeline. No application behavior, football-domain logic, AI behavior, persistence, runtime business functionality, API contract, or workspace package was added.

## Files Changed

### Created

- `biome.json`
- `dependency-cruiser.config.cjs`
- `.husky/pre-commit`
- `scripts/install-git-hooks.mjs`
- `scripts/validate-boundary-fixture.mjs`
- `tooling/dependency-cruiser/fixtures/forbidden-import.ts`
- `docs/sprints/SPRINT4_REPORT.md`

### Modified

- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `docs/14_MONOREPO.md`
- `docs/15_DEVELOPMENT_GUIDE.md`
- `docs/PROJECT_STATE.md`

No application source, application manifest, Turborepo configuration, ADR, previous sprint report, or `packages/tsconfig` file changed during Sprint 4.

The working tree already contained the approved Sprint 3 documentation-alignment changes and Sprint 4 specification before implementation began. Those pre-existing changes were preserved and were not expanded outside their prior scope.

## Dependency Versions

Sprint 4 added these exact-pinned root development dependencies:

- `@biomejs/biome`: `2.5.3`
- `dependency-cruiser`: `18.1.0`
- `husky`: `9.1.7`
- `lint-staged`: `17.0.8`

Validation used:

- Node.js `24.18.0`
- pnpm `11.13.0`
- Turborepo `2.10.5`
- TypeScript `6.0.3`

No runtime dependency or internal workspace dependency was added.

## Design Decisions

### Biome Ownership

- Root `biome.json` is the only formatting and source-linting configuration.
- Formatting uses two spaces, double quotes, semicolons, trailing commas, and an 85-column line width compatible with the existing source.
- Generated, dependency, build, cache, coverage, and TypeScript-build artifacts are excluded explicitly.
- Complete application and package source trees remain included.
- Recommended lint rules are enabled.
- Biome assists are disabled because Sprint 4 authorizes formatting and linting, not repository-wide import reorganization.
- `noUndeclaredEnvVars` is disabled only for the Husky installation script. Its lifecycle-only environment guards are not Turborepo task inputs, and `turbo.json` was outside the Sprint 4 allowlist.

### Dependency Boundaries

- dependency-cruiser rejects circular dependencies.
- Packages cannot depend on application composition roots.
- API, web, and worker cannot import one another directly.
- Rules cover the current repository topology and do not invent future package layers.
- A dedicated tooling fixture imports the API and is rejected by the stable `fixture-no-app-imports` rule.
- The negative-test wrapper fails if the fixture is accepted or if the expected rule is absent.

### Local Hook Scope

- The Husky pre-commit hook runs only `pnpm exec lint-staged`.
- lint-staged runs Biome only for supported staged JavaScript, TypeScript, JSON, and CSS files.
- The hook does not run full typecheck, build, or dependency-boundary validation.
- Hook installation is skipped for `HUSKY=0`, CI, `NODE_ENV=production`, npm production mode, and development-dependency omission.
- Missing Git metadata also causes a clean skip.

### Unified Validation

- Leaf commands keep formatting, linting, combined Biome checks, real boundaries, and boundary proof separate.
- `quality` composes the non-writing Biome check and both boundary checks.
- `validate` runs workspace validation, quality, typecheck, and build.
- `format` is the only root quality command that intentionally writes.
- Vitest and a test stage remain outside Sprint 4.

## Validation Commands

The complete specification command matrix was executed:

```bash
pnpm install
pnpm install --frozen-lockfile

pnpm format:check
pnpm lint
pnpm check
pnpm exec biome ci .

pnpm boundaries
pnpm boundaries:test
pnpm quality

HUSKY=0 pnpm install --frozen-lockfile
CI=true HUSKY=0 pnpm install --frozen-lockfile

pnpm workspace:check
pnpm typecheck
pnpm build
pnpm validate
```

Additional evidence commands covered:

- direct controlled-fixture dependency-cruiser execution;
- the actual `.husky/pre-commit` hook with one controlled staged TypeScript file;
- direct production and omitted-development-dependency hook guards;
- exact dependency listing;
- application and shared-configuration diff checks;
- whitespace and IDE diagnostics.

## Validation Evidence

- `pnpm install` succeeded for all five workspace projects and ran the guarded prepare lifecycle.
- Frozen-lockfile installation succeeded.
- Biome formatting, linting, combined check, and CI modes checked 29 files without writing or reporting violations.
- The real dependency graph passed with 8 modules and 3 dependencies cruised.
- Workspace validation passed and reported four child workspace packages.
- API, web, and worker typechecks passed.
- API, web, and worker production builds passed.
- Next.js route type generation and static-page generation passed.
- The unified `pnpm validate` pipeline passed in the required order.
- Direct dependency listing confirmed all approved exact versions.
- No ESLint, Prettier, Vitest, Prisma, Redis, BullMQ, or OpenAI dependency was added to the root manifest.
- `git diff --check` passed.
- Git reported no application or `packages/tsconfig` diff.
- IDE diagnostics reported no errors in the new quality configuration and scripts.

The active shell initially selected Node.js 22.20.0. Implementation and all acceptance evidence were run after explicitly activating the pinned Node.js 24.18.0 runtime.

## dependency-cruiser Negative-test Evidence

Direct fixture validation produced the expected error:

```text
error fixture-no-app-imports:
tooling/dependency-cruiser/fixtures/forbidden-import.ts
→ apps/api/src/app.module.ts

1 dependency violations (1 errors, 0 warnings)
```

`pnpm boundaries:test` then passed with:

```text
Boundary negative test passed: dependency-cruiser rejected the fixture with "fixture-no-app-imports".
```

This proves that acceptance depends on observing the expected rejection rather than merely receiving a successful dependency-cruiser invocation.

## Husky Guard Evidence

- `HUSKY=0 pnpm install --frozen-lockfile` exited successfully.
- `CI=true HUSKY=0 pnpm install --frozen-lockfile` exited successfully and the prepare lifecycle completed without hook installation work.
- Direct `NODE_ENV=production` and `npm_config_omit=dev` guard invocations exited successfully.
- The actual pre-commit hook processed exactly one controlled staged TypeScript fixture through Biome.
- lint-staged backed up state, ran the configured staged-file task, applied no unrelated changes, cleaned up, and exited successfully.
- The controlled fixture was removed from the index after validation, restoring the original unstaged state.

Husky remains local developer feedback only. Root validation does not depend on a hook being installed or executed.

## Implementation Issues Resolved

- The initial Biome check exposed formatting differences in pre-existing allowlisted and non-allowlisted source. The configuration line width was selected to preserve current source formatting instead of creating a prohibited mechanical source diff.
- Biome's import-organization assist would have changed an existing non-allowlisted script, so assists were disabled while recommended linting remained enabled.
- Environment-variable lint warnings were narrowed to the lifecycle installation script rather than changing the non-allowlisted Turborepo configuration or disabling the rule repository-wide.

No acceptance issue required an architecture, source, API, or runtime change.

## Known Limitations

- Biome assists are disabled; formatting and recommended source linting remain active.
- dependency-cruiser currently validates a deliberately small graph with eight modules. Future package-specific rules require real packages and immediate consumers.
- The boundary fixture proves executable rejection but is not application code and is not part of production builds.
- Local Git hooks can be bypassed or unavailable; authoritative enforcement remains `pnpm validate` and future CI.
- No automated application tests or Vitest configuration exist yet.
- No CI, security scanning, persistence, container, runtime configuration, or observability capability was introduced.

## Remaining Work

Remaining Milestone 3A work includes:

- Vitest project discovery and automated application tests;
- typed runtime configuration and observability when immediate consumers are authorized;
- Prisma no-model and PostgreSQL bootstrap;
- container packaging and deterministic runtime smoke validation;
- security gates and CI.

Sprint 4 does not complete Milestone 3A or canonical v0.1. Sprint 5 was not started.
