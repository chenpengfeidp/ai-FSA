# Sprint 4 Specification — Engineering Quality Foundation

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 4
- Theme: Engineering Quality Foundation
- Specification status: Complete
- Implementation status: Completed

This document is the official implementation specification for Sprint 4. It narrows Step 4 of `docs/20_IMPLEMENTATION_PLAN.md` according to the binding conditions in `docs/21_ARCHITECTURE_SIGNOFF.md`.

Sprint 4 was separately authorized and completed. Implementation evidence is recorded in `docs/sprints/SPRINT4_REPORT.md`.

# Sprint Goal

Establish one repository-wide engineering quality workflow using Biome, dependency-cruiser, Husky, lint-staged, and unified root validation scripts.

The sprint must make formatting, linting, and dependency-boundary checks executable and repeatable without changing application behavior or introducing any football-domain, AI, persistence, runtime-business, or API capability.

# Business Value

Sprint 4 reduces implementation risk before the repository gains additional packages and runtime infrastructure.

The quality foundation provides:

- one formatting and linting authority instead of overlapping tools;
- executable dependency-direction rules instead of review-only conventions;
- fast staged-file feedback before local commits;
- one authoritative root validation entry point;
- reproducible quality evidence for future sprint reviews;
- earlier detection of architectural coupling and accidental scope leakage.

This sprint creates engineering controls only. It does not create product behavior.

# Implementation Scope

## Biome

Add Biome as the repository's only formatter and source linter.

The implementation must:

- create one root `biome.json`;
- configure repository-wide checks for supported source and configuration files;
- exclude generated, dependency, build, cache, and coverage artifacts explicitly;
- avoid excluding complete application or package source trees;
- provide non-mutating check commands for validation;
- provide an explicit write command for developer-invoked formatting;
- avoid ESLint, Prettier, or another parallel formatting/linting authority;
- avoid mass-formatting unrelated files during this sprint.

Biome owns syntax-aware formatting and linting. It does not own dependency direction.

## dependency-cruiser

Add dependency-cruiser as the repository's dependency-graph policy tool.

The implementation must:

- create one root `dependency-cruiser.config.cjs`;
- validate the current `apps/` and source-bearing `packages/` graph;
- reject circular dependencies;
- reject package-to-application dependencies;
- reject direct dependencies between separate application composition roots;
- avoid inventing rules for packages or layers that do not exist;
- provide an executable negative test proving a controlled forbidden import fails;
- report violations as errors with stable rule names and actionable descriptions.

The negative test must use a dedicated tooling fixture and must not add a forbidden import to application source.

dependency-cruiser owns dependency direction. It does not replace Biome.

## Husky

Add Husky for local Git-hook installation.

The implementation must:

- install hooks through a guarded root lifecycle command;
- create only the pre-commit hook required by this sprint;
- keep the hook independent of application startup and runtime services;
- disable hook installation when `HUSKY=0`;
- avoid failure or noise during CI and production-only/container dependency installation;
- treat the hook as local convenience rather than authoritative validation.

No commit-msg, pre-push, or release hook is authorized.

## lint-staged

Add lint-staged as the staged-file selector used by the pre-commit hook.

The implementation must:

- run Biome only against supported staged files;
- allow Biome to apply safe formatting and lint fixes to those files;
- avoid running repository-wide typecheck, build, or boundary checks in pre-commit;
- avoid starting applications or accessing network services;
- avoid staging files automatically through a separate `git add` command;
- preserve partially staged work according to lint-staged's supported behavior.

The pre-commit hook must invoke lint-staged and no second lint authority.

## Unified Validation Scripts

Extend the root package scripts with one coherent command surface.

The implementation must provide:

- `format` — explicitly writes Biome formatting changes;
- `format:check` — checks formatting without writing;
- `lint` — runs Biome linting without writing;
- `check` — runs the complete non-writing Biome check;
- `boundaries` — validates the real repository dependency graph;
- `boundaries:test` — proves a controlled forbidden dependency is rejected;
- `quality` — runs Biome and both boundary validations;
- `validate` — runs workspace validation, quality checks, typecheck, and build in a deterministic order.

Existing development, workspace, typecheck, and build commands must retain their current behavior.

Vitest and a `test` stage are not introduced in this sprint. The validation pipeline must not claim test coverage that does not exist.

## Required Documentation Alignment

The implementation may make only the documentation changes required to describe the quality command surface and satisfy architecture sign-off item DA-02:

- align `docs/14_MONOREPO.md` with Biome and dependency-cruiser authority;
- align `docs/15_DEVELOPMENT_GUIDE.md` with the implemented quality commands;
- update README command guidance if required;
- record implementation evidence in the Sprint 4 report;
- update project state only after validation succeeds.

These changes must not alter product, domain, engine, persistence, or API architecture.

# Explicit Exclusions

Sprint 4 must not introduce:

- football-domain types, rules, services, entities, or use cases;
- AI providers, prompts, engines, retrieval, evaluation, or review behavior;
- database libraries, Prisma, schemas, migrations, repositories, or persistence;
- Redis, BullMQ, pgvector, object storage, queues, or scheduled work;
- runtime configuration or observability packages;
- API endpoints, controllers, DTOs, response changes, or transport contracts;
- web pages, components, styles, routes, or user-facing behavior;
- worker behavior or lifecycle changes;
- authentication, authorization, users, or public deployment support;
- Vitest, test configuration, test utilities, or application tests;
- GitHub Actions, Dependabot, CI workflows, security scanners, or release automation;
- Dockerfiles, Compose configuration, images, or runtime smoke tests;
- new workspace packages;
- ESLint, Prettier, or any duplicate lint/format authority;
- application-source refactoring or repository-wide mechanical reformatting;
- changes to TypeScript compiler policy or the `@fas/tsconfig` package;
- changes to Turborepo task semantics unless a separately reviewed blocker proves one is required.

# Files Allowed to Change

Sprint 4 implementation is restricted to the following allowlist.

## Root Tooling

- `package.json`
- `pnpm-lock.yaml`
- `biome.json`
- `dependency-cruiser.config.cjs`
- `.husky/pre-commit`

## Quality Support

- `scripts/install-git-hooks.mjs`
- `scripts/validate-boundary-fixture.mjs`
- `tooling/dependency-cruiser/fixtures/forbidden-import.ts`

## Documentation and Evidence

- `README.md`
- `docs/14_MONOREPO.md`
- `docs/15_DEVELOPMENT_GUIDE.md`
- `docs/PROJECT_STATE.md`
- `docs/sprints/SPRINT4_REPORT.md`

No file under `apps/*/src/` may change. No existing file under `packages/tsconfig/` may change.

If implementation requires a file outside this allowlist, stop and request scope review before editing it.

# Dependencies

## New External Development Dependencies

The root package may add only these exact-pinned development dependencies:

- `@biomejs/biome`: `2.5.3`
- `dependency-cruiser`: `18.1.0`
- `husky`: `9.1.7`
- `lint-staged`: `17.0.8`

The lint-staged pin must be verified against the repository's Node.js `24.18.0` and pnpm `11.13.0` baseline before installation. A compatibility failure stops implementation for review; it does not authorize an unrecorded version substitution.

## Existing Dependencies

Sprint 4 retains:

- Node.js `24.18.0`;
- pnpm `11.13.0`;
- Turborepo `2.10.5`;
- TypeScript `6.0.3`;
- `@fas/tsconfig` through `workspace:*`.

## Dependency Constraints

- All direct external dependencies remain exact-pinned.
- All four new packages are root development dependencies.
- No runtime dependency may be added.
- No application package manifest may change.
- No internal workspace dependency may be added.
- The lockfile must be generated by pnpm and must not be edited manually.

# Acceptance Criteria

Sprint 4 passes only when all of the following are true:

## Scope

- The diff contains only allowlisted files.
- No application source or `@fas/tsconfig` file changed.
- No application manifest changed.
- No runtime dependency was added.
- No football, AI, persistence, runtime-business, API, web, or worker behavior changed.
- No Vitest, CI, container, security-scanning, or release capability was introduced.

## Biome

- `biome.json` is the single formatting and linting configuration.
- Biome checks all supported committed source and configuration files.
- Generated and dependency artifacts are excluded explicitly.
- Complete `apps/` and `packages/` source trees are not broadly ignored.
- Non-writing formatting, linting, and combined check commands succeed.
- The explicit write command is not part of `validate`.
- ESLint and Prettier are absent.

## Dependency Boundaries

- The current repository graph passes dependency-cruiser validation.
- Circular dependencies are errors.
- Package-to-application imports are errors.
- Cross-application imports are errors.
- Rules describe the current repository topology without speculative package layering.
- A committed controlled fixture violates a named rule.
- `boundaries:test` succeeds only when dependency-cruiser rejects that fixture.
- The negative test fails if the fixture is unexpectedly accepted.

## Hooks and Staged Checks

- `.husky/pre-commit` runs only lint-staged.
- lint-staged runs only Biome against supported staged files.
- The hook does not run full-repository typecheck, build, or boundary validation.
- Hook installation is guarded for `HUSKY=0`, CI, and production-only/container installation.
- A disabled-hook installation completes without error.
- Hook behavior is not required for authoritative validation or CI correctness.

## Unified Validation

- All specified root scripts exist and have non-overlapping responsibilities.
- `quality` runs the full Biome check, real boundary validation, and boundary negative test.
- `validate` runs workspace checks, quality checks, typecheck, and build.
- `validate` is non-writing.
- Existing development scripts remain unchanged.
- Existing API, web, and worker typechecks and builds pass.
- Frozen-lockfile installation succeeds after lockfile generation.

## Documentation and Evidence

- `docs/14_MONOREPO.md` no longer describes ESLint as the approved repository authority.
- `docs/15_DEVELOPMENT_GUIDE.md` documents the implemented quality commands.
- README command guidance matches the implemented root scripts if README changes.
- `docs/sprints/SPRINT4_REPORT.md` records files, versions, decisions, command output, negative-test evidence, hook-guard evidence, and remaining work.
- `docs/PROJECT_STATE.md` is updated only after all acceptance evidence passes.

# Validation Commands

Run all commands from the repository root with the pinned Node.js and pnpm versions.

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

Implementation review must also verify:

- the controlled forbidden-import fixture produces the expected dependency-cruiser rule violation;
- the boundary test converts that expected rejection into a passing test result;
- lint-staged resolves its configuration and processes only a controlled supported staged file;
- the Git index and working tree are restored after hook validation;
- `git diff --check` reports no whitespace errors;
- the final diff contains no non-allowlisted or generated files.

Validation must not depend on a running API, web application, worker, database, container, or network service.

# Risks

## Existing Formatting Drift

Risk: enabling repository-wide Biome checks reveals pre-existing formatting issues that would require a broad source diff.

Mitigation: choose a minimal approved ruleset and explicit generated-file exclusions. Do not hide application source. If compliance requires non-allowlisted source changes, stop for scope review rather than mass-format the repository.

## Boundary False Positives

Risk: dependency-cruiser reports framework-generated, type-only, or configuration dependencies as architecture violations.

Mitigation: scan committed source-bearing paths, use precise path rules, and document each exclusion. Do not disable a rule globally to suppress one unexplained result.

## Weak Boundary Evidence

Risk: the real graph passes only because it contains no prohibited edge, leaving enforcement unproven.

Mitigation: require a controlled forbidden-import fixture and a test that asserts dependency-cruiser exits unsuccessfully with the expected rule.

## Hook Installation Failures

Risk: Husky's lifecycle installation fails or emits noise when Git metadata or development dependencies are unavailable.

Mitigation: use an explicit installation guard, honor `HUSKY=0`, and prove disabled CI and production-style behavior. Do not use an unconditional failure-swallowing command as the primary guard.

## Pre-commit Scope Growth

Risk: local commits become slow or unreliable if the hook runs repository-wide checks.

Mitigation: pre-commit invokes only lint-staged, and lint-staged invokes only Biome on supported staged files. Full validation remains a separate authoritative command.

## Validation Duplication

Risk: root scripts call overlapping commands repeatedly or diverge in behavior.

Mitigation: define small leaf commands and compose them once through `quality` and `validate`. Document one ownership purpose for each command.

## Tool Version Compatibility

Risk: an exact-pinned tool is incompatible with Node.js 24, pnpm 11, ESM, or the current repository files.

Mitigation: verify installation and direct invocation before finalizing the lockfile. Record evidence and stop on incompatibility rather than silently changing pins or adding a duplicate tool.

## Scope Leakage

Risk: quality setup expands into tests, CI, application cleanup, package refactoring, or architecture redesign.

Mitigation: enforce the file allowlist and explicit exclusions. Any required application-source, manifest, TypeScript-policy, or Turborepo-semantic change stops the sprint for review.

# Stop Boundary

Sprint 4 stops after:

- Biome formatting and linting are configured;
- dependency-cruiser validates the current graph;
- the controlled boundary failure proof passes;
- Husky and lint-staged provide staged-only local checks;
- unified root quality and validation scripts pass;
- required Biome/dependency-cruiser documentation terminology is aligned;
- the Sprint 4 report and project-state update are complete.

Do not continue into:

- Vitest or application test infrastructure;
- CI or GitHub Actions;
- dependency, secret, or image scanning;
- runtime configuration or observability;
- Prisma, PostgreSQL, or durable jobs;
- Docker or Compose;
- domain or contract packages;
- API, web, or worker behavior;
- Sprint 5 planning or implementation.

Any application-source change, runtime behavior change, API change, unapproved dependency, or non-allowlisted file requirement is a scope violation and stops the sprint for review.

# Deliverables

Sprint 4 implementation deliverables are:

1. `biome.json`
2. `dependency-cruiser.config.cjs`
3. `.husky/pre-commit`
4. `scripts/install-git-hooks.mjs`
5. `scripts/validate-boundary-fixture.mjs`
6. `tooling/dependency-cruiser/fixtures/forbidden-import.ts`
7. updated root `package.json` with exact-pinned quality dependencies and unified scripts
8. regenerated `pnpm-lock.yaml`
9. aligned quality-tool terminology in `docs/14_MONOREPO.md`
10. updated quality commands in `docs/15_DEVELOPMENT_GUIDE.md`
11. README command alignment if required
12. `docs/sprints/SPRINT4_REPORT.md`
13. updated `docs/PROJECT_STATE.md`

No other deliverable is authorized.

# Sprint Completion Definition

Sprint 4 is complete when the repository has one formatting/linting authority, executable dependency-boundary enforcement with negative proof, fast staged-only local checks, and one non-writing root validation pipeline that preserves all existing application behavior.

Completion must be demonstrated by recorded command output and a reviewed allowlist diff, not inferred from configuration-file presence.

Sprint 4 completion does not complete Milestone 3A or canonical v0.1. It does not authorize Sprint 5.
