# Sprint 6 Report — Toolchain Enforcement

## 1. Sprint Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 6
- Theme: Toolchain Enforcement
- Implementation date: 2026-07-15
- Starting commit: `fe09e74`
- Starting tag: `v0.1.5-final`
- Starting worktree: clean
- Specification: `docs/sprints/SPRINT6_SPECIFICATION.md`
- Implementation status: Complete

Sprint 6 received separate explicit implementation authorization. This report records only the authorized MF-05 scope.

Sprint 6 does not close Milestone 3A, complete canonical v0.1, authorize Sprint 7, or implement another foundation capability.

## 2. Goal

Close architecture-sign-off condition MF-05 by making unsupported Node.js and pnpm versions fail through:

1. pnpm-native installation enforcement;
2. a repository-owned toolchain diagnostic;
3. controlled positive and negative enforcement tests;
4. integration into the root validation sequence.

The approved versions remain unchanged:

- Node.js `24.18.0`;
- pnpm `11.13.0`.

## 3. Files Created

### `scripts/validate-toolchain.mjs`

Repository-owned diagnostic and metadata consistency check.

It:

- uses Node.js standard-library modules only;
- reads exact required versions from root `package.json`;
- reads `.nvmrc` and verifies agreement with `engines.node`;
- validates exact `engines.node`, `engines.pnpm`, and `packageManager` declarations;
- validates the executing Node.js version;
- validates pnpm identity and version from package-manager lifecycle metadata;
- rejects missing, malformed, ranged, prerelease, or inconsistent declarations;
- emits concise expected-versus-observed diagnostics;
- performs no install, network, application-start, or repository-write operation.

No required version literal is copied into executable source.

### `scripts/toolchain-enforcement.test.mjs`

Controlled enforcement suite using the Node.js built-in test runner.

The suite contains 15 tests covering:

- supported Node.js and pnpm versions;
- unsupported Node.js major version;
- unsupported Node.js patch version;
- unsupported pnpm major version;
- unsupported pnpm patch version;
- npm identity rejection;
- Yarn identity rejection;
- missing package-manager metadata;
- malformed runtime metadata;
- `.nvmrc` and `engines.node` mismatch;
- `engines.pnpm` and `packageManager` mismatch;
- missing exact version declarations;
- malformed exact version declarations;
- native pnpm rejection of an incompatible root Node.js engine;
- native pnpm rejection of a mismatched exact package-manager version.

Native rejection fixtures:

- are created under the operating system temporary directory;
- contain no dependency or lifecycle script;
- run installation with `--ignore-scripts`;
- invoke the active pnpm entry point with the active Node.js executable;
- assert non-zero status and mismatch-specific output;
- are removed in unconditional cleanup;
- do not access the repository lockfile or dependency tree.

### `docs/sprints/SPRINT6_REPORT.md`

This implementation and validation evidence record.

## 4. Files Modified

### `package.json`

Added:

```text
toolchain:check
toolchain:test
```

Root `validate` now executes:

1. toolchain diagnostic;
2. controlled toolchain tests;
3. workspace validation;
4. quality validation;
5. typechecking;
6. existing tests;
7. production builds.

Existing scripts, dependency declarations, engine declarations, and `packageManager` remain unchanged.

### `pnpm-workspace.yaml`

Added:

```yaml
engineStrict: true
pmOnFail: error
```

No obsolete pnpm strictness or package-manager-management setting was introduced.

### `README.md`

Documented:

- supported toolchain activation;
- active version checks;
- `pnpm toolchain:check`;
- `pnpm toolchain:test`;
- pnpm-native exact-version enforcement;
- remediation without bypassing policy or mutating global tools.

### `docs/15_DEVELOPMENT_GUIDE.md`

Documented the same toolchain contract and root validation sequence while preserving root `package.json` as the machine-readable version authority.

### `docs/PROJECT_STATE.md`

Updated only after all implementation validation passed.

It now records:

- Sprint 6 completion;
- MF-05 closure;
- native and repository-owned enforcement;
- 15 controlled tests;
- no active or authorized Sprint 7;
- remaining Milestone 3A work;
- the pre-existing API compiler-resolution debt.

## 5. Files Explicitly Unchanged

Sprint 6 did not modify:

- `.nvmrc`;
- `pnpm-lock.yaml`;
- `turbo.json`;
- `vitest.config.ts`;
- Biome or dependency-cruiser configuration;
- any file under `apps/`;
- any file under `packages/`;
- any file under `tooling/`;
- any architecture document;
- any ADR;
- any previous Sprint specification or report;
- the Sprint 6 specification;
- any Sprint 7 file.

No dependency, package, endpoint, application behavior, shared-package behavior, or workspace membership changed.

## 6. Engineering Decisions

### Root Manifest Remains the Version Authority

The implementation reads exact versions from:

- `engines.node`;
- `engines.pnpm`;
- `packageManager`.

`.nvmrc` is a consistency assertion for the Node.js declaration. It is not a parallel executable version matrix.

### Native Enforcement Is the Installation Gate

`engineStrict: true` rejects an incompatible root Node.js engine. `pmOnFail: error` rejects an incompatible exact `packageManager` pnpm version.

Both controls operate before lifecycle scripts are needed and remain effective with `--ignore-scripts`.

The repository-owned script improves diagnostics and catches metadata inconsistency. It is not the sole installation gate.

### Exact Patch Versions Are Intentional

Validation accepts only normalized `x.y.z` declarations and exact matches. Ranges, prereleases, missing values, malformed values, and different patch releases fail.

This implements the approved reproducibility policy rather than semver compatibility.

### No Dependency Was Added

Parsing, filesystem access, process execution, temporary fixture management, assertions, and tests use Node.js standard-library modules.

### Controlled Tests Use the Invoking pnpm

Native fixtures execute the active pnpm entry point identified by lifecycle metadata through the active Node.js executable.

This avoids:

- assuming a second global pnpm location;
- downloading another package manager;
- using a version-manager dependency;
- requiring Docker or network access.

## 7. Positive Evidence

### Toolchain Identity and Configuration

Observed:

```text
node --version                  v24.18.0
pnpm --version                 11.13.0
pnpm config get engineStrict  true
pnpm config get pmOnFail      error
```

`pnpm toolchain:check` passed with:

```text
Toolchain validation passed: Node.js v24.18.0; pnpm 11.13.0.
```

### Supported Installation

Both commands passed:

```bash
pnpm install
pnpm install --frozen-lockfile
```

Observed:

- all six workspace projects were in scope;
- the dependency tree was already up to date;
- pnpm `11.13.0` completed successfully;
- no lockfile content changed.

### Workspace

`pnpm workspace:check` passed and discovered five child packages:

- `@fas/api`;
- `@fas/web`;
- `@fas/worker`;
- `@fas/config`;
- `@fas/tsconfig`.

## 8. Controlled Negative Evidence

`pnpm toolchain:test` passed all 15 tests.

The suite proved:

- unsupported Node.js major and patch values fail;
- unsupported pnpm major and patch values fail;
- npm and Yarn identities fail;
- missing and malformed metadata fail;
- declaration inconsistencies fail;
- exact patch-level policy is enforced;
- pnpm installation rejects an incompatible root Node.js engine;
- pnpm installation rejects a mismatched exact package-manager version;
- both native rejection tests use `--ignore-scripts`;
- each native failure is non-zero and contains the intended mismatch identifiers;
- no unrelated dependency, network, lifecycle, or workspace failure satisfies the assertions;
- temporary fixtures are removed.

Native fixtures intentionally declare versions derived from the root authority rather than copying required version literals.

## 9. Existing Repository Gates

Every required command passed:

```bash
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

Evidence:

- Biome checked 37 files with no fixes required;
- dependency-cruiser found zero violations across 12 modules and 8 dependencies;
- the controlled architecture boundary rejection passed;
- five typecheck tasks passed;
- the existing Vitest configuration project passed 17 of 17 tests;
- configuration, API, worker, and web build tasks passed;
- root validation ran toolchain enforcement before all existing gates;
- root validation exit code was zero.

Turborepo reused valid local cache entries during this run. The final pre-Sprint 6 gate separately recorded forced uncached build, test, and typecheck evidence.

## 10. Validation Failures and Corrections

### Working-directory Sandbox Mismatch

The first combined validation invocation executed pnpm against the other open workspace root and reported:

```text
ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND
```

Its configuration lookups returned `undefined` because that directory was not this repository.

Correction:

- reran the same validation from the absolute football-analysis-system repository context;
- made no repository change for this execution-environment issue;
- obtained the required `true`, `error`, and passing command results.

### Initial Biome Check

The first focused Biome check reported:

- formatting differences in both new scripts;
- `noUndeclaredEnvVars` warnings for direct lifecycle metadata access.

Correction:

- accessed the two documented lifecycle metadata keys through `Reflect.get`;
- formatted only the two new Sprint 6 scripts;
- reran the focused Biome check successfully;
- reran the complete quality and root validation gates successfully.

No lint rule, Turbo environment policy, or global configuration was weakened.

## 11. Fallbacks

No compatibility fallback, dependency override, engine exclusion, version change, lifecycle-only workaround, Docker path, CI path, or version-manager integration was used.

The approved Node.js `24.18.0`, pnpm `11.13.0`, existing dependencies, and exact Sprint allowlist were sufficient.

## 12. Final Integrity Review

The final implementation review confirmed:

- all implementation changes are allowlisted;
- no direct dependency changed;
- `pnpm-lock.yaml` has no content change;
- `.nvmrc` remains `24.18.0`;
- root Node.js and pnpm declarations remain exact and unchanged;
- no executable script copies the required Node.js or pnpm version literal;
- no application source changed;
- no workspace package source or manifest changed;
- no architecture document or ADR changed;
- no previous Sprint artifact changed;
- no Sprint 7 file exists;
- `git diff --check` passes.

## 13. Remaining Work

MF-05 is closed.

Milestone 3A remains incomplete. Open work includes:

- Prisma no-model generation and persistence bootstrap;
- application-level API, worker, and web tests;
- container packaging and executable acceptance;
- database-aware readiness;
- deterministic runtime smoke;
- Turbo environment/cache policy;
- CI and baseline security gates.

The API currently resolves a transitive TypeScript `5.9.3` compiler for its local `tsc` command while the approved declared baseline is `6.0.3`. Correcting that requires application manifest and lockfile changes outside Sprint 6 and remains separately gated debt.

No remaining item authorizes Sprint 7.

## 14. Acceptance Result

Every Sprint 6 acceptance criterion passed.

## Sprint 6: COMPLETE

Milestone 3A and canonical v0.1 remain incomplete.

The repository must stop at this boundary and wait for review and separate authorization before any later implementation Sprint.
