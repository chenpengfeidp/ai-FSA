# Sprint 7 Report — TypeScript Compiler Baseline Alignment

## 1. Sprint Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 7
- Theme: TypeScript Compiler Baseline Alignment
- Implementation date: 2026-07-16
- Starting commit: `dfa5fad`
- Starting worktree: clean
- Specification: `docs/sprints/SPRINT7_SPECIFICATION.md`
- Implementation status: Complete

Sprint 7 received separate explicit implementation authorization. This report records only the approved compiler-ownership alignment.

Sprint 7 does not close Milestone 3A, complete canonical v0.1, authorize Sprint 8, or begin Prisma or another foundation capability.

## 2. Goal

Make every implemented workspace that directly invokes TypeScript resolve the approved TypeScript `6.0.3` baseline through an explicit package-owned development dependency.

The Sprint addressed the pre-existing resolution state where:

- root, web, worker, and configuration resolved TypeScript `6.0.3`;
- API resolved TypeScript `5.9.3` transitively through the NestJS CLI;
- worker and configuration did not declare their own compiler dependency.

## 3. Files Modified

### `apps/api/package.json`

Added:

```json
"typescript": "6.0.3"
```

to `devDependencies`.

No API script, runtime dependency, source, endpoint, response, module, controller, service, export, or behavior changed.

### `apps/worker/package.json`

Added:

```json
"typescript": "6.0.3"
```

to `devDependencies`.

No worker script, runtime dependency, source, lifecycle, export, or behavior changed.

### `packages/config/package.json`

Added:

```json
"typescript": "6.0.3"
```

to `devDependencies`.

No configuration script, runtime dependency, source, test, public API, export, or behavior changed.

### `pnpm-lock.yaml`

pnpm added exact TypeScript `6.0.3` development-dependency importer entries for:

- `apps/api`;
- `apps/worker`;
- `packages/config`.

No unrelated importer, dependency version, snapshot, override, package extension, or workspace link changed.

### `docs/PROJECT_STATE.md`

Updated only after implementation and all required validation commands passed.

It now records:

- Sprint 7 completion;
- explicit TypeScript compiler ownership;
- uniform workspace-owned compiler resolution;
- the retained NestJS CLI transitive compiler;
- no active or authorized Sprint 8;
- remaining Milestone 3A work.

## 4. Files Created

### `docs/sprints/SPRINT7_REPORT.md`

This implementation and validation evidence record.

## 5. Files Explicitly Unchanged

Sprint 7 did not modify:

- root `package.json`;
- `pnpm-workspace.yaml`;
- `.nvmrc`;
- `turbo.json`;
- `tsconfig.base.json`;
- any application or package `tsconfig.json`;
- `vitest.config.ts`;
- any script;
- any application source file;
- any shared-package source or test file;
- `@fas/tsconfig`;
- `@fas/web`;
- any tooling configuration;
- `README.md`;
- `AGENTS.md`;
- `docs/15_DEVELOPMENT_GUIDE.md`;
- any architecture document;
- any ADR;
- any previous Sprint specification or report;
- the Sprint 7 specification;
- any Sprint 8 file.

## 6. Dependency Change

Sprint 7 selected no new dependency identity and no new version.

The existing approved and locked dependency:

```text
typescript@6.0.3
```

became a direct development dependency of three additional workspace importers.

The change was performed through pnpm:

```bash
pnpm --filter @fas/api --filter @fas/worker --filter @fas/config add --save-dev --save-exact typescript@6.0.3
```

pnpm reported:

- the lockfile passed supply-chain policy;
- no package download was needed;
- no package was newly added to the content-addressable store;
- pnpm `11.13.0` completed successfully.

## 7. Engineering Decisions

### Explicit Ownership at Compiler Entry Points

Every workspace that owns a `tsc` command now declares the compiler directly:

- root `ai-fsa`;
- `@fas/api`;
- `@fas/web`;
- `@fas/worker`;
- `@fas/config`.

`@fas/tsconfig` remains a declarative JSON configuration package and does not declare or execute TypeScript.

### Exact Existing Baseline

All direct compiler declarations use exact TypeScript `6.0.3`.

No version range, compiler upgrade, compiler downgrade, wrapper, package-manager override, or second approved baseline was introduced.

### Direct and Transitive Compilers Remain Distinct

`pnpm why typescript --recursive` reports two installed TypeScript versions:

- TypeScript `6.0.3` is directly owned by root, API, web, worker, and configuration;
- TypeScript `5.9.3` remains internal to the NestJS CLI dependency graph.

Sprint 7 does not treat a valid third-party internal dependency as a workspace compiler entry point. No override or dependency removal was used to force graph-wide deduplication.

### Compiler Policy Remains Centralized

The compiler executable is now package-owned, while compiler policy remains owned by `@fas/tsconfig`.

No TypeScript configuration changed.

## 8. Compiler Resolution Evidence

The required package-context commands produced:

```text
repository root:  Version 6.0.3
@fas/api:         Version 6.0.3
@fas/web:         Version 6.0.3
@fas/worker:      Version 6.0.3
@fas/config:      Version 6.0.3
```

Commands:

```bash
pnpm exec tsc --version
pnpm --dir apps/api exec tsc --version
pnpm --dir apps/web exec tsc --version
pnpm --dir apps/worker exec tsc --version
pnpm --dir packages/config exec tsc --version
```

All commands used normal pnpm executable resolution. No path into pnpm's content-addressable store was used.

## 9. Transitive Compiler Evidence

`pnpm why typescript --recursive` reported:

```text
typescript@5.9.3
└─ @nestjs/cli@11.0.24 and its internal tooling graph

typescript@6.0.3
├─ @fas/api
├─ @fas/config
├─ @fas/web
├─ @fas/worker
└─ ai-fsa
```

The retained TypeScript `5.9.3` instance is attributable to:

- `@nestjs/cli`;
- `@nestjs/schematics`;
- `fork-ts-checker-webpack-plugin`;
- their internal dependency chain.

It is not used by a workspace-owned direct `tsc` entry point.

## 10. Toolchain and Installation Evidence

Observed toolchain:

```text
node --version   v24.18.0
pnpm --version   11.13.0
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

- repository-owned toolchain validation passed;
- all 15 controlled toolchain enforcement tests passed;
- normal installation passed;
- frozen installation passed;
- lockfile resolution was current;
- five child workspace packages were discovered;
- no second lockfile appeared.

## 11. Repository Compatibility Evidence

Every required command passed:

```bash
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

Observed evidence:

- Biome checked 37 files with no fix required;
- dependency-cruiser found zero violations across 12 modules and 8 dependencies;
- the controlled boundary rejection passed;
- five typecheck tasks passed;
- the first post-alignment typecheck run executed all five tasks without cache;
- the existing configuration test project passed 17 of 17 tests;
- configuration, API, worker, and web builds passed;
- the first post-alignment build run executed the affected API, worker, and web tasks without cache;
- integrated root validation reran toolchain enforcement before existing repository gates;
- root validation exited successfully.

No source or compiler-policy change was required.

## 12. Validation Failures and Corrections

No implementation or validation command failed.

No fallback, source correction, compiler-policy change, version change, package-manager override, dependency override, or lockfile repair was required.

## 13. Final Integrity Review

The final review confirmed:

- all changed files are in the Sprint 7 allowlist;
- TypeScript `6.0.3` is the only new direct declaration;
- only the API, worker, and configuration lockfile importers changed;
- no dependency version changed;
- no unrelated lockfile snapshot changed;
- no application or shared-package source changed;
- no TypeScript configuration changed;
- no architecture document or ADR changed;
- no previous Sprint artifact changed;
- `git diff --check` passes;
- no Sprint 8 file exists.

## 14. Remaining Work

The workspace-owned compiler-resolution inconsistency is closed.

Milestone 3A remains incomplete. Open work includes:

- Prisma no-model generation and persistence bootstrap;
- remaining Prisma and container compatibility evidence;
- application-level API, worker, and web tests;
- database-aware readiness;
- Turbo environment/cache policy;
- container packaging and executable acceptance;
- deterministic runtime smoke;
- CI and baseline security gates.

The NestJS CLI's internal transitive TypeScript `5.9.3` remains intentionally installed. It is not unresolved workspace compiler debt and must not be removed without an independently justified dependency change.

No remaining item authorizes Sprint 8.

## 15. Acceptance Result

Every Sprint 7 acceptance criterion passed.

## Sprint 7: COMPLETE

Milestone 3A and canonical v0.1 remain incomplete.

The repository must stop at this boundary and wait for review and separate authorization before any later implementation Sprint.
