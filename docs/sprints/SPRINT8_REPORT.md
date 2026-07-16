# Sprint 8 Report — Prisma No-model Bootstrap

## 1. Sprint Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 8
- Theme: Prisma No-model Bootstrap
- Implementation date: 2026-07-16
- Starting commit: `73e278e`
- Specification: `docs/sprints/SPRINT8_SPECIFICATION.md`
- Specification revision: `docs/sprints/SPRINT8_SPECIFICATION_REVISION.md`
- Implementation status: Complete

Sprint 8 began after separate authorization, stopped when pnpm exposed a missing allowlist entry, and resumed only after the documentation-only specification revision was approved.

Sprint 8 does not close Milestone 3A, complete canonical v0.1, authorize Sprint 9, add a database model or migration, or connect an application to PostgreSQL.

## 2. Goal

Create the minimal `@fas/database` package and prove that the approved Prisma `7.8.0` stack can:

- validate an explicit PostgreSQL configuration;
- generate Prisma Client from a zero-model schema;
- compile with TypeScript `6.0.3`, ESM, `@prisma/adapter-pg`, and `pg`;
- expose only an explicit lifecycle boundary;
- generate before package build, typecheck, and test;
- remain owned exclusively by `packages/database`.

## 3. Files Created

### Database Package

- `packages/database/package.json`
- `packages/database/tsconfig.json`
- `packages/database/prisma.config.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/src/index.ts`
- `packages/database/src/client.ts`
- `packages/database/test/config.spec.ts`

### Boundary Evidence

- `tooling/dependency-cruiser/fixtures/forbidden-prisma-import.ts`

### Governance and Evidence

- `docs/sprints/SPRINT8_SPECIFICATION_REVISION.md`
- `docs/sprints/SPRINT8_REPORT.md`

The specification revision was created during the approved pause and was not an implementation-scope expansion.

## 4. Files Modified

- `.gitignore`
  - ignores `packages/database/generated/prisma/`;
- `package.json`
  - adds root Prisma validate/generate commands;
  - generates before quality, typecheck, test, and build in root validation;
- `pnpm-lock.yaml`
  - records the new database workspace importer and approved dependencies;
- `pnpm-workspace.yaml`
  - approves lifecycle builds only for exact `prisma@7.8.0` and `@prisma/engines@7.8.0`;
  - preserves the existing `sharp` approval unchanged;
- `turbo.json`
  - adds the first-class `generate` task and package-relative output;
  - passes `DATABASE_URL` without hashing it into cache metadata only through tasks that can invoke database generation;
- `vitest.config.ts`
  - adds the explicit Node.js `database` project with a non-secret validation URL;
- `dependency-cruiser.config.cjs`
  - enforces Prisma and PostgreSQL-driver ownership;
  - excludes ignored generated Prisma source from repository-authored cycle analysis;
- `scripts/validate-boundary-fixture.mjs`
  - independently verifies both controlled forbidden imports and their exact rule names;
- `README.md`
  - documents the no-model package and root Prisma commands;
- `docs/15_DEVELOPMENT_GUIDE.md`
  - documents configuration, generation, ownership, and zero-migration scope;
- `docs/PROJECT_STATE.md`
  - records Sprint 8 only after validation passed;
- `docs/sprints/SPRINT8_SPECIFICATION.md`
  - records the approved `pnpm-workspace.yaml` allowlist correction.

## 5. Exact Dependency Matrix

Runtime dependencies of `@fas/database`:

```text
@prisma/adapter-pg@7.8.0
@prisma/client@7.8.0
pg@8.22.0
```

Development dependencies:

```text
@fas/tsconfig@workspace:*
@types/pg@8.20.0
prisma@7.8.0
typescript@6.0.3
```

No `dotenv`, migration library, database server, test library, override, mixed direct Prisma version, or unrelated direct dependency was added.

## 6. Prisma Configuration and Schema

`prisma.config.ts`:

- uses `defineConfig` and `env` from `prisma/config`;
- selects `prisma/schema.prisma` explicitly;
- requires `DATABASE_URL` from the process environment;
- contains no credential, fallback, migration, seed, or `.env` loading policy.

`schema.prisma`:

- uses the `prisma-client` generator;
- outputs to `../generated/prisma`;
- declares PostgreSQL as the datasource provider;
- contains zero models, enums, or composite types;
- contains no migration, seed, preview feature, or domain name.

## 7. Client Lifecycle Boundary

The public package export contains:

- `createDatabaseClient(connectionString)`;
- `DatabaseClientLifecycle`;
- explicit `connect()` and `disconnect()` operations.

Construction uses `PrismaPg` and the generated `PrismaClient` but does not connect, read environment state, log the connection string, expose a model delegate, or define query, repository, retry, transaction, migration, or readiness behavior.

## 8. Generation Contract

The root commands are:

```bash
DATABASE_URL="<non-secret-local-validation-url>" pnpm prisma:validate
DATABASE_URL="<non-secret-local-validation-url>" pnpm prisma:generate
```

The package `build`, `typecheck`, and `test` commands each invoke package-local generation before consuming generated output.

Turborepo owns a first-class `generate` task with `generated/**` output. `DATABASE_URL` is passed through affected tasks and is not included in cache-key metadata.

Deleting the ignored generated directory and invoking root generation recreated the Prisma Client successfully. Git continued to report the generated directory as ignored and untracked.

## 9. Positive and Negative Prisma Evidence

Prisma `7.8.0` CLI help reported:

```text
--require-models   Do not allow generating a client without models
```

It reported no affirmative no-model flag.

Default validation and generation passed from:

- repository-root context;
- `packages/database` context.

The controlled package-context command:

```bash
DATABASE_URL="<non-secret-local-validation-url>" pnpm exec prisma generate --config prisma.config.ts --require-models
```

exited with status `1` and identified that `schema.prisma` has no models. The failure occurred after config and schema resolution and was not an option, dependency, path, or environment failure.

## 10. Tests and Boundary Evidence

Vitest discovered:

- 17 existing `config` tests;
- 4 new `database` tests.

All 21 tests passed without a PostgreSQL service or network request.

Database tests prove:

- PostgreSQL generator and datasource configuration;
- absence of models, enums, and composite types;
- package-local generated output;
- side-effect-free lifecycle construction;
- safe rejection of an empty connection string.

dependency-cruiser:

- accepted the implemented application and package graph;
- rejected the existing application-import fixture with `fixture-no-app-imports`;
- rejected the new Prisma fixture with `no-prisma-outside-database`.

No application or other package imports `@fas/database`, Prisma, generated Prisma files, or `pg`.

## 11. Toolchain and Installation Evidence

Observed:

```text
Node.js v24.18.0
pnpm 11.13.0
```

The following passed:

```bash
pnpm toolchain:check
pnpm toolchain:test
pnpm install
pnpm install --frozen-lockfile
pnpm workspace:check
```

Evidence:

- all 15 controlled toolchain tests passed;
- normal and frozen installation passed;
- workspace build policy added only the two exact Prisma lifecycle approvals and preserved the pre-existing `sharp` decision;
- six child workspace packages were discovered;
- one root lockfile remained authoritative.

## 12. Repository Validation Evidence

Every required gate passed:

```bash
pnpm quality
pnpm typecheck
pnpm test
pnpm build
DATABASE_URL="<non-secret-local-validation-url>" pnpm validate
```

Observed:

- Biome checked 44 files without an error;
- dependency-cruiser found zero implemented-graph violations;
- six workspace typecheck tasks passed;
- both Vitest projects and all 21 tests passed;
- configuration, database, API, worker, and web builds passed;
- integrated root validation performed Prisma validation and generation before repository static and build gates;
- root validation exited successfully.

## 13. Validation Failures and Corrections

### Missing pnpm Build Decision

The initial `pnpm install` exited with `ERR_PNPM_IGNORED_BUILDS` because pnpm `11.13.0` requires explicit lifecycle-build decisions for `prisma` and `@prisma/engines`.

Implementation stopped. The package manager's attempted out-of-allowlist workspace-policy edit was reverted. After approval of `SPRINT8_SPECIFICATION_REVISION.md`, exact-version approvals were added and installation passed.

### Turbo Environment Isolation

The first root `typecheck` attempt failed because Turbo did not pass `DATABASE_URL` to the database package's generation subprocess.

Task-level `passThroughEnv` entries were added only to `generate`, `build`, `typecheck`, and `test`. This preserves the explicit process-environment contract without storing the value in cache metadata. The affected gates then passed.

### Negative-evidence Wrapper Wording

The first shell assertion around the expected `--require-models` failure looked for different wording than Prisma emitted. Prisma itself failed correctly because the schema had no models.

The evidence wrapper was rerun against Prisma's actual `You don't have any models defined` diagnostic and passed with the expected non-zero status. No implementation or Prisma command changed.

### Generated-code Cycle Exclusion

The first dependency graph run observed cycles inside Prisma-generated source.

Ignored generated output was excluded from repository-authored cycle analysis. Ownership remains covered by source rules and the controlled forbidden Prisma fixture. The implemented graph then passed.

## 14. Scope and Integrity

Sprint 8 changed no:

- file under `apps/`;
- existing shared-package source, test, manifest, or TypeScript config;
- file under `packages/tsconfig`;
- architecture document;
- ADR;
- Prisma model, enum, composite type, migration, or seed;
- API endpoint, worker behavior, web behavior, authentication, AI, queue, durable-job, container, CI, or Sprint 9 artifact.

The only workspace build approvals added are exact `prisma@7.8.0` and `@prisma/engines@7.8.0`. The existing `sharp` approval is unchanged.

Generated Prisma output remains ignored and untracked.

## 15. Remaining Work

Milestone 3A and canonical v0.1 remain incomplete. Deferred work includes:

- reviewed domain persistence models and migrations;
- PostgreSQL runtime and application integration;
- database-aware readiness;
- durable PostgreSQL jobs;
- container compatibility and acceptance;
- broader application tests;
- remaining Turbo environment/cache policy;
- deterministic runtime smoke;
- CI and security gates.

None of these items is authorized by Sprint 8.

## 16. Acceptance Result

Every revised Sprint 8 acceptance criterion passed.

## Sprint 8: COMPLETE

The repository stops at the no-model persistence bootstrap boundary. Sprint 9 has not begun and requires separate specification and authorization.
