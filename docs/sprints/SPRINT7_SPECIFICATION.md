# Sprint 7 Specification — TypeScript Compiler Baseline Alignment

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 7
- Theme: TypeScript Compiler Baseline Alignment
- Specification status: Complete
- Implementation status: Not started

This document is the official implementation specification for Sprint 7.

It follows:

- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/20_IMPLEMENTATION_PLAN.md`;
- `docs/21_ARCHITECTURE_SIGNOFF.md`;
- `docs/22_MILESTONE_3A_GATE.md`;
- `docs/23_RELEASE_BASELINE.md`;
- the completed Sprint 6 evidence;
- the compiler-resolution finding in `docs/sprints/FINAL_REPOSITORY_HEALTH_REPORT.md`.

Creation of this specification does not authorize implementation. Sprint 7 requires separate explicit approval.

# Goal

Make every implemented workspace that directly invokes the TypeScript compiler resolve the approved TypeScript `6.0.3` baseline through an explicit package dependency.

Sprint 7 closes the current compiler-resolution inconsistency:

```text
root:             TypeScript 6.0.3
@fas/api:         TypeScript 5.9.3
@fas/worker:      TypeScript 6.0.3
@fas/config:      TypeScript 6.0.3
@fas/web:         TypeScript 6.0.3
```

The API currently reaches TypeScript `5.9.3` transitively through the NestJS CLI because its manifest invokes `tsc` without declaring TypeScript directly.

The worker and configuration package currently reach the root compiler through workspace resolution rather than an explicit package-owned dependency.

Sprint 7 must make compiler ownership deterministic without:

- changing the approved TypeScript version;
- changing TypeScript configuration policy;
- changing application or package source;
- removing or overriding a valid NestJS CLI transitive dependency;
- beginning Prisma or another Milestone 3A capability.

# Business Value

Shared compiler configuration is reliable only when every compiler invocation uses the same approved compiler implementation.

Explicit compiler ownership provides:

- deterministic package-local `tsc` resolution;
- consistent patch-level TypeScript behavior across root and workspaces;
- reproducible typecheck evidence in clean clones;
- reduced dependence on hoisting and transitive dependency layout;
- clearer compatibility evidence for NestJS, Next.js, and shared packages;
- a stable prerequisite for later Prisma generation and package expansion;
- simpler diagnosis when a future compiler upgrade is proposed.

This Sprint improves build reproducibility only. It changes no football-analysis behavior.

# Scope

## Approved Compiler Contract

The approved TypeScript version remains:

```text
6.0.3
```

The root `package.json` remains the repository-level declaration of the approved compiler baseline.

Every implemented workspace with a script that directly invokes `tsc` must also declare the same exact version as a development dependency.

The implementation must not introduce:

- a TypeScript version range;
- a second approved compiler version;
- a package-manager override;
- a copied compiler executable;
- a wrapper that conceals actual compiler resolution.

## Explicit Package-local Compiler Ownership

Add the existing exact development dependency:

```json
"typescript": "6.0.3"
```

to:

- `@fas/api`;
- `@fas/worker`;
- `@fas/config`.

These packages own scripts that directly invoke `tsc` or require deterministic TypeScript compilation.

The implementation must preserve:

- package names;
- package versions;
- package privacy;
- ESM declarations;
- all existing scripts;
- all existing dependencies;
- all existing shared TypeScript configuration references.

## Existing Compiler Owners

The following already declare TypeScript `6.0.3` directly and must not change:

- root package `ai-fsa`;
- `@fas/web`.

`@fas/tsconfig` contains declarative JSON configuration only. It does not execute `tsc` and must not gain a TypeScript runtime or development dependency.

## Lockfile Alignment

Regenerate only the affected lockfile importer metadata through pnpm.

The lockfile must show exact TypeScript `6.0.3` development dependencies for:

- `apps/api`;
- `apps/worker`;
- `packages/config`.

The implementation must not:

- edit `pnpm-lock.yaml` by hand;
- change unrelated importer entries;
- upgrade or downgrade any dependency;
- remove a transitive TypeScript version required by existing tooling;
- add an override to force the complete transitive graph onto one compiler version.

TypeScript `5.9.3` may remain in the lockfile if the NestJS CLI dependency graph still requires or resolves it internally. Sprint 7 governs workspace-owned compiler entry points, not third-party internal dependency implementation.

## Resolution Evidence

Validation must prove the effective package-local compiler version from:

- repository root;
- `apps/api`;
- `apps/web`;
- `apps/worker`;
- `packages/config`.

Every command must report:

```text
Version 6.0.3
```

The evidence must use the package manager's normal executable resolution. It must not invoke a hard-coded path into pnpm's content-addressable store.

## Compatibility Evidence

The implementation must preserve:

- shared strict compiler policy from `@fas/tsconfig`;
- API typechecking;
- worker typechecking;
- configuration-package typechecking and declaration output;
- Next.js type generation and typechecking;
- NestJS API and worker builds;
- existing Vitest configuration tests;
- all Sprint 6 toolchain enforcement.

No source change may be used to make the compatibility gates pass.

## Documentation and Evidence

Sprint completion must:

- generate `docs/sprints/SPRINT7_REPORT.md`;
- update `docs/PROJECT_STATE.md` only after all acceptance criteria pass.

The report must distinguish:

- direct compiler ownership;
- effective package-local compiler resolution;
- third-party transitive compiler versions;
- Sprint completion;
- Milestone 3A and canonical v0.1 completion.

# Explicit Non-goals

Sprint 7 must not introduce:

- a TypeScript version upgrade or downgrade;
- a Node.js or pnpm version change;
- a NestJS, Next.js, React, Vitest, Zod, or tooling version change;
- pnpm `overrides`, `packageExtensions`, dependency rules, or engine exclusions;
- removal of TypeScript `5.9.3` solely because it exists transitively;
- changes to `@fas/tsconfig` JSON policy;
- new TypeScript configuration files;
- compiler wrappers or executable validation scripts;
- application source changes;
- shared-package source changes;
- API endpoint, response, module, controller, or service changes;
- web behavior, routing, styling, or build-configuration changes;
- worker behavior or lifecycle changes;
- configuration contract expansion;
- new tests beyond preserving and executing the existing suites;
- a new workspace package;
- Prisma, PostgreSQL, schema, migration, or database-package work;
- container, Compose, CI, security scanning, runtime-smoke, or observability work;
- Turbo environment/cache policy work;
- authentication, domain, AI, engine, job, queue, storage, or provider behavior;
- architecture-document or ADR changes;
- DA-04 remediation;
- Sprint 8 planning or implementation.

Sprint 7 must not treat the presence of any transitive TypeScript version as a failure when all workspace-owned compiler entry points resolve the approved direct baseline.

# Packages Affected

## Manifests Changed

### `@fas/api`

Add TypeScript `6.0.3` as an exact development dependency.

No script, dependency, export, source, or behavior change is permitted.

### `@fas/worker`

Add TypeScript `6.0.3` as an exact development dependency.

No script, dependency, export, source, or behavior change is permitted.

### `@fas/config`

Add TypeScript `6.0.3` as an exact development dependency.

No script, dependency, export, source, test, or behavior change is permitted.

## Validation-only Packages

The following are validated but not modified:

- root package `ai-fsa`;
- `@fas/web`;
- `@fas/tsconfig`.

No other package is affected.

# Files Allowed to Change

Implementation is restricted to this exact allowlist.

## Package Manifests

```text
apps/api/package.json
apps/worker/package.json
packages/config/package.json
```

## Dependency Lock

```text
pnpm-lock.yaml
```

## State and Evidence

```text
docs/PROJECT_STATE.md
docs/sprints/SPRINT7_REPORT.md
```

No other file may change.

In particular, implementation must not modify:

- root `package.json`;
- `pnpm-workspace.yaml`;
- `.nvmrc`;
- `turbo.json`;
- `tsconfig.base.json`;
- any `tsconfig.json` under `apps/` or `packages/`;
- `vitest.config.ts`;
- Biome or dependency-cruiser configuration;
- any file under `scripts/`;
- any application source file;
- any shared-package source or test file;
- any file under `tooling/`;
- `README.md`;
- `AGENTS.md`;
- `docs/15_DEVELOPMENT_GUIDE.md`;
- any numbered architecture document;
- any ADR;
- any previous Sprint specification or report;
- `docs/sprints/SPRINT7_SPECIFICATION.md`;
- any Sprint 8 file.

If implementation requires a change outside the allowlist, stop and request a specification revision.

# Dependencies

Sprint 7 adds no new dependency identity and selects no new version.

It adds the already approved and locked direct development dependency:

```text
typescript@6.0.3
```

to three existing workspace importers.

Dependency rules:

- use pnpm from the repository root;
- use the supported Node.js `24.18.0` and pnpm `11.13.0`;
- add the dependency through pnpm rather than editing the lockfile manually;
- preserve exact version syntax;
- preserve every existing dependency declaration;
- accept normal lockfile importer updates for the three affected packages;
- stop if pnpm changes an unrelated direct dependency version or importer;
- do not add a semver, compiler-resolution, or test dependency.

# Acceptance Criteria

## Manifest Alignment

- `apps/api/package.json` declares `typescript` exactly `6.0.3` in `devDependencies`.
- `apps/worker/package.json` declares `typescript` exactly `6.0.3` in `devDependencies`.
- `packages/config/package.json` declares `typescript` exactly `6.0.3` in `devDependencies`.
- Root `package.json` retains TypeScript `6.0.3`.
- `apps/web/package.json` retains TypeScript `6.0.3`.
- `packages/tsconfig/package.json` remains unchanged and contains no TypeScript dependency.
- No version range is introduced.
- No other dependency declaration changes.

## Lockfile Integrity

- The root lockfile remains the only lockfile.
- The API, worker, and configuration importers record TypeScript `6.0.3`.
- No unrelated importer changes.
- No unrelated dependency version changes.
- No pnpm override or package extension is introduced.
- The lockfile is generated by pnpm, not manually edited.
- Frozen installation succeeds after the update.

## Compiler Resolution

- Root compiler resolution reports `Version 6.0.3`.
- API package-local compiler resolution reports `Version 6.0.3`.
- Web package-local compiler resolution reports `Version 6.0.3`.
- Worker package-local compiler resolution reports `Version 6.0.3`.
- Configuration package-local compiler resolution reports `Version 6.0.3`.
- No workspace-owned `tsc` script depends on a transitive NestJS CLI compiler or root hoisting.
- Validation uses normal pnpm executable resolution.
- Third-party transitive TypeScript versions are reported accurately rather than hidden.

## Repository Compatibility

- Sprint 6 toolchain checks pass.
- Workspace validation passes.
- Biome and dependency-boundary checks pass.
- All TypeScript typechecks pass.
- Existing Vitest configuration tests pass.
- API, web, worker, and configuration builds pass.
- Root validation passes.
- No application source or behavior changes.
- No shared-package source, export, configuration, or behavior changes.
- No architecture document or ADR changes.

## Documentation and Evidence

- `docs/sprints/SPRINT7_REPORT.md` records files changed.
- The report records manifest and lockfile changes.
- The report records effective compiler versions for every implemented compiler consumer.
- The report records any remaining transitive TypeScript version separately.
- The report records positive validation, failures, corrections, and remaining work.
- `docs/PROJECT_STATE.md` records Sprint 7 only after all acceptance criteria pass.
- Documentation does not claim Milestone 3A or canonical v0.1 completion.
- Sprint 8 is not started.

# Validation Commands

Run all commands from the repository root with the supported toolchain.

## Toolchain Identity

```bash
node --version
pnpm --version
pnpm toolchain:check
pnpm toolchain:test
```

Required results:

- Node.js reports `v24.18.0`;
- pnpm reports `11.13.0`;
- the repository-owned toolchain diagnostic passes;
- all controlled Sprint 6 enforcement tests pass.

## Installation and Workspace

```bash
pnpm install
pnpm install --frozen-lockfile
pnpm workspace:check
```

Required results:

- both installation commands succeed;
- the lockfile is current;
- five child workspace packages are discovered;
- no second lockfile appears.

## Compiler Resolution

```bash
pnpm exec tsc --version
pnpm --dir apps/api exec tsc --version
pnpm --dir apps/web exec tsc --version
pnpm --dir apps/worker exec tsc --version
pnpm --dir packages/config exec tsc --version
pnpm why typescript --recursive
```

Required results:

- every explicit compiler command reports `Version 6.0.3`;
- dependency inspection shows direct TypeScript `6.0.3` ownership in root, API, web, worker, and configuration importers;
- any retained third-party transitive compiler is attributable to its owning external tool.

## Existing Repository Gates

```bash
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

All existing gates must pass without source or configuration changes.

## Final Integrity Review

```bash
pnpm list --depth 0
git diff --check
git status --short
git diff -- pnpm-lock.yaml
```

The final review must confirm:

- only allowlisted files changed;
- TypeScript `6.0.3` is the only new direct declaration;
- no unrelated lockfile content changed;
- no application or shared-package source changed;
- no architecture document or ADR changed;
- no previous Sprint artifact changed;
- existing uncommitted work, if any, was preserved;
- no Sprint 8 file changed.

# Risks

## Lockfile Overreach

Risk: adding direct dependencies causes unrelated lockfile re-resolution.

Mitigation:

- use the pinned pnpm version;
- inspect importer and snapshot changes;
- accept only changes attributable to the three new direct declarations;
- stop if unrelated versions move.

## Confusing Direct and Transitive Compilers

Risk: implementation treats any remaining TypeScript `5.9.3` lockfile entry as a failed alignment.

Mitigation:

- validate package-owned executable resolution;
- report third-party transitive compiler ownership separately;
- do not add overrides or remove tooling dependencies to force graph-wide deduplication.

## Incomplete Workspace Alignment

Risk: only the API is fixed because it currently demonstrates the visible mismatch, leaving worker or configuration dependent on root hoisting.

Mitigation:

- add direct ownership to every non-web workspace that invokes `tsc`;
- validate each workspace from its package context.

## TypeScript Compatibility Regression

Risk: explicit package-local resolution exposes a build or typecheck difference that cached or transitive resolution previously concealed.

Mitigation:

- run typecheck and build for the complete workspace;
- run the existing test suite;
- do not modify source or compiler policy to mask a failure;
- stop and record evidence if TypeScript `6.0.3` cannot satisfy an existing package.

## Duplicate Version Authority

Risk: workspace manifests drift independently from the root compiler baseline.

Mitigation:

- use the same exact approved version;
- validate every direct declaration;
- treat package manifests as explicit executable ownership while root documentation remains the repository-level baseline.

## Dependency Scope Leakage

Risk: a narrow compiler-alignment task expands into NestJS upgrades, pnpm overrides, TypeScript configuration changes, or broader dependency cleanup.

Mitigation:

- add only the existing TypeScript `6.0.3` dependency to the three allowlisted manifests;
- reject unrelated cleanup.

## Existing Worktree Changes

Risk: unrelated uncommitted work is overwritten or attributed to Sprint 7.

Mitigation:

- record initial status;
- preserve all existing work;
- edit only allowlisted files;
- report Sprint 7 changes separately.

## Future-capability Leakage

Risk: compiler alignment is used as an opportunity to begin Prisma, persistence, application tests, containers, CI, or Sprint 8.

Mitigation:

- stop after direct compiler ownership, lockfile alignment, validation, report, and project-state update.

# Stop Boundary

Sprint 7 stops when:

- API, worker, and configuration manifests directly declare TypeScript `6.0.3`;
- pnpm has aligned only the affected lockfile importers;
- root, API, web, worker, and configuration compiler commands report `Version 6.0.3`;
- supported normal and frozen installation pass;
- toolchain, workspace, quality, typecheck, test, build, and root validation pass;
- no source or compiler-policy file changed;
- `docs/sprints/SPRINT7_REPORT.md` is generated;
- `docs/PROJECT_STATE.md` is updated.

After reaching this boundary:

- do not remove or override third-party transitive compiler versions;
- do not modify TypeScript configuration;
- do not begin Prisma or persistence bootstrap;
- do not add application tests;
- do not add CI or container validation;
- do not modify application or shared-package source;
- do not change Node.js, pnpm, TypeScript, or another dependency version;
- do not address DA-04;
- do not create another canonical document;
- do not plan or implement Sprint 8;
- stop and wait for review.

If explicit TypeScript `6.0.3` ownership cannot satisfy existing typecheck or build commands within the allowlist, stop. Record the command, exit status, compiler resolution, output, and affected package. Do not change source, compiler policy, package-manager overrides, or dependency versions without a revised specification.

# Deliverables

Sprint 7 implementation must deliver:

1. API compiler ownership
   - exact TypeScript `6.0.3` development dependency.
2. Worker compiler ownership
   - exact TypeScript `6.0.3` development dependency.
3. Configuration compiler ownership
   - exact TypeScript `6.0.3` development dependency.
4. Lockfile alignment
   - three affected importer updates only.
5. Resolution evidence
   - root, API, web, worker, and configuration resolve `Version 6.0.3`.
6. Compatibility evidence
   - installation, toolchain, workspace, quality, typecheck, test, build, and root validation pass.
7. Sprint evidence
   - `docs/sprints/SPRINT7_REPORT.md`.
8. Current state
   - updated `docs/PROJECT_STATE.md`.

# Sprint Completion Definition

Sprint 7 is complete only when:

1. every changed file is in the allowlist;
2. API, worker, and configuration directly declare TypeScript `6.0.3`;
3. no dependency other than the existing approved TypeScript package is added to an importer;
4. no dependency version changes;
5. lockfile changes are limited to the three affected importers and necessary pnpm resolution metadata;
6. every implemented package that invokes `tsc` resolves `Version 6.0.3`;
7. retained third-party transitive compiler versions are accurately reported;
8. normal and frozen installation pass;
9. toolchain, workspace, quality, typecheck, existing tests, build, and root validation pass;
10. no application, package source, compiler policy, architecture, ADR, or Sprint 8 behavior changes;
11. the Sprint 7 report records positive evidence, failures, corrections, and remaining work;
12. project state is updated only after validation succeeds;
13. Milestone 3A and canonical v0.1 remain explicitly incomplete;
14. implementation stops before Prisma, persistence, application-test expansion, or Sprint 8.
