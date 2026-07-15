# Sprint 6 Specification — Toolchain Enforcement

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 6
- Theme: Toolchain Enforcement
- Specification status: Complete
- Implementation status: Not started

This document is the official implementation specification for Sprint 6. It narrows the workspace runtime and package-manager enforcement scope in `docs/20_IMPLEMENTATION_PLAN.md` according to binding sign-off condition MF-05 in `docs/21_ARCHITECTURE_SIGNOFF.md`.

Creation of this specification does not authorize implementation. Sprint 6 requires separate explicit approval.

# Goal

Make the repository reject unsupported Node.js and pnpm versions through executable, repository-owned enforcement and negative evidence.

Sprint 6 must close the current MF-05 gap without changing application behavior, adding product functionality, introducing a new package, or beginning any other Milestone 3A capability.

The approved toolchain remains:

- Node.js `24.18.0`;
- pnpm `11.13.0`.

Sprint 6 enforces the existing baseline. It does not select new versions.

# Business Value

Exact version metadata is useful only when unsupported environments fail before producing misleading install, test, or build evidence.

Toolchain enforcement provides:

- deterministic rejection of unsupported Node.js versions;
- deterministic rejection of unsupported pnpm versions;
- clear diagnostics that identify expected and observed versions;
- one executable positive check for the active environment;
- controlled negative tests for native installation enforcement;
- protection against false clean-clone evidence produced by runtime drift;
- a stable prerequisite for later Prisma, container, and CI work;
- no dependence on a developer's globally installed version manager.

This Sprint improves repository reproducibility only. It does not change football-analysis behavior.

# Scope

## Exact Toolchain Contract

The repository must continue to use the root manifest as the canonical machine-readable version contract:

- `engines.node`: `24.18.0`;
- `engines.pnpm`: `11.13.0`;
- `packageManager`: `pnpm@11.13.0`.

The existing `.nvmrc` value must remain `24.18.0` and must agree with `engines.node`.

The implementation must not introduce a second independently maintained version matrix. Validation may read and compare these existing declarations, but it must not copy version literals into executable source.

## Native pnpm Enforcement

Add the pnpm 11 workspace settings:

```yaml
engineStrict: true
pmOnFail: error
```

The settings must be placed in `pnpm-workspace.yaml`.

The resulting native behavior must:

- reject a project whose root `engines.node` excludes the executing Node.js version;
- reject a project whose `packageManager` pnpm version does not match the executing pnpm version;
- reject before dependency scripts are required for enforcement;
- remain effective when install scripts are disabled;
- emit a non-zero exit code and an actionable version-mismatch diagnostic.

Sprint 6 must not add obsolete pnpm version-management settings. In particular, it must not introduce `managePackageManagerVersions`, `packageManagerStrict`, or `packageManagerStrictVersion`. pnpm 11 uses `pmOnFail` for package-manager mismatch behavior.

Live gate evidence proved that pnpm `11.13.0` only warns and exits successfully for the root project's unsupported Node.js version when `engineStrict` is not enabled. `engineStrict: true` is therefore required to satisfy MF-05. Its dependency-engine effect is an accepted consequence of choosing pnpm-native enforcement; implementation must not add engine overrides or exclusions to conceal an incompatibility.

## Repository-owned Toolchain Check

Create a small Node.js validation entry point:

```text
scripts/validate-toolchain.mjs
```

The script must:

- use only Node.js standard-library modules;
- read required versions from the root `package.json`;
- read `.nvmrc` and verify that it matches `engines.node`;
- inspect the executing Node.js version;
- inspect the invoking pnpm version from package-manager lifecycle metadata;
- verify that the invoking package manager is pnpm;
- reject missing, malformed, non-exact, or inconsistent version declarations;
- reject unsupported actual versions;
- emit a concise success message for the supported toolchain;
- emit a concise failure message containing expected and observed version identifiers;
- never print environment variables other than the non-secret version identifiers needed for the diagnostic;
- perform no install, network, application-start, or repository-write operation.

The check must treat exact versions as exact. A different major, minor, patch, prerelease, missing value, or malformed value must fail.

The script is a diagnostic and consistency check. Native pnpm installation enforcement remains the installation gate.

## Controlled Enforcement Tests

Create:

```text
scripts/toolchain-enforcement.test.mjs
```

The test must use Node.js's built-in test runner and standard-library modules only.

It must cover:

- the supported Node.js and pnpm versions;
- an unsupported Node.js major version;
- an unsupported Node.js patch version;
- an unsupported pnpm major version;
- an unsupported pnpm patch version;
- a non-pnpm package-manager identity;
- missing or malformed runtime metadata;
- mismatch between `.nvmrc` and `engines.node`;
- mismatch between `engines.pnpm` and `packageManager`;
- native pnpm rejection of an incompatible root Node.js engine;
- native pnpm rejection of a mismatched `packageManager` version.

Native rejection tests must:

- create isolated projects under the operating system temporary directory;
- contain no dependencies and no lifecycle scripts;
- invoke pnpm installation with scripts disabled;
- assert a non-zero exit code;
- assert that failure output identifies the relevant Node.js or pnpm mismatch;
- clean up temporary files in success and failure paths;
- leave the repository, root lockfile, and root `node_modules` unchanged;
- require no Docker daemon, version manager, network request, or globally installed alternate Node.js/pnpm version.

The temporary incompatible-engine fixture proves native Node.js engine rejection using the active runtime against an intentionally incompatible fixture declaration. The temporary package-manager fixture proves native pnpm version rejection using the active pnpm against an intentionally incompatible exact `packageManager` declaration with `pmOnFail: error`.

Tests must fail if a fixture is rejected for an unrelated reason.

## Root Command Integration

Add root scripts with these responsibilities:

- `toolchain:check`
  - runs `scripts/validate-toolchain.mjs`;
- `toolchain:test`
  - runs `node --test scripts/toolchain-enforcement.test.mjs`.

Update root validation so toolchain validation occurs before workspace, quality, TypeScript, test, and build evidence is accepted.

The implementation must preserve the existing relative order of:

1. workspace validation;
2. quality validation;
3. typechecking;
4. tests;
5. builds.

Toolchain checks may precede that sequence. Existing commands and semantics must remain available.

## Documentation and Evidence

Update current documentation only where needed to describe:

- the exact supported Node.js and pnpm versions;
- the supported bootstrap command;
- the native pnpm enforcement setting;
- `pnpm toolchain:check`;
- `pnpm toolchain:test`;
- the fact that `pnpm validate` includes toolchain enforcement;
- clear remediation when an unsupported toolchain is detected.

Sprint completion must generate `docs/sprints/SPRINT6_REPORT.md` and update `docs/PROJECT_STATE.md`.

# Explicit Non-goals

Sprint 6 must not introduce:

- a Node.js or pnpm version upgrade;
- Corepack installation or global package-manager mutation;
- automatic download or replacement of the executing pnpm version;
- Volta, asdf, mise, nvm installation, or another version-manager dependency;
- Docker-based toolchain validation;
- CI workflows or GitHub Actions;
- Dependabot configuration;
- Prisma, PostgreSQL, schemas, migrations, or database packages;
- application tests beyond preserving the existing suite;
- Vitest project expansion;
- configuration package expansion;
- browser-safe or secret configuration;
- API endpoints, response changes, controllers, modules, or services;
- web behavior, styling, routing, or build changes;
- worker behavior or lifecycle changes;
- domain, AI, engine, persistence, job, queue, storage, observability, or authentication behavior;
- new workspace packages;
- external runtime or development dependencies;
- lockfile regeneration unless validation proves pnpm itself changed it unexpectedly and implementation stops for review;
- architecture-document or ADR changes;
- Sprint 7 planning or implementation.

Sprint 6 must not use a lifecycle script as the sole installation enforcement mechanism. Native pnpm rejection must pass controlled tests with lifecycle scripts disabled.

# Packages Affected

No application or shared workspace package is affected.

The only package manifest allowed to change is the private repository root package:

```text
ai-fsa
```

Its change is limited to repository maintenance scripts. Existing dependency and version declarations must remain unchanged.

The following must not change:

- `@fas/api`;
- `@fas/web`;
- `@fas/worker`;
- `@fas/config`;
- `@fas/tsconfig`.

# Files Allowed to Change

Implementation is restricted to this exact allowlist.

## Root Toolchain Configuration

```text
package.json
pnpm-workspace.yaml
```

## Validation Scripts

```text
scripts/validate-toolchain.mjs
scripts/toolchain-enforcement.test.mjs
```

## Documentation and Evidence

```text
README.md
docs/15_DEVELOPMENT_GUIDE.md
docs/PROJECT_STATE.md
docs/sprints/SPRINT6_REPORT.md
```

No other file may change.

In particular, implementation must not modify:

- `AGENTS.md`;
- `.nvmrc`;
- `pnpm-lock.yaml`;
- `turbo.json`;
- `vitest.config.ts`;
- `biome.json`;
- `dependency-cruiser.config.cjs`;
- `scripts/validate-workspace.mjs`;
- any file under `apps/`;
- any file under `packages/`;
- any file under `tooling/`;
- any numbered architecture document;
- any ADR;
- any previous Sprint specification or report;
- `docs/sprints/REPOSITORY_AUDIT_REPORT.md`;
- `docs/sprints/SPRINT6_SPECIFICATION.md`.

If implementation requires a change outside the allowlist, stop and request a specification revision.

# Dependencies

Sprint 6 adds no dependency.

Implementation may use only:

- Node.js `24.18.0` standard-library modules;
- pnpm `11.13.0` existing CLI behavior;
- existing repository commands.

The Node.js built-in test runner must be used for toolchain enforcement tests. Vitest must remain limited to its currently configured project.

No semver library is required because the policy accepts exact normalized versions only. Validation must perform explicit exact-version parsing and comparison rather than adding a dependency.

# Acceptance Criteria

## Version Authority

- Root `engines.node` remains exactly `24.18.0`.
- Root `engines.pnpm` remains exactly `11.13.0`.
- Root `packageManager` remains exactly `pnpm@11.13.0`.
- `.nvmrc` remains exactly `24.18.0`.
- Validation proves these declarations agree.
- No executable source contains a copied required-version literal.

## Native Installation Enforcement

- `pnpm-workspace.yaml` configures `pmOnFail: error`.
- `pnpm-workspace.yaml` configures `engineStrict: true`.
- pnpm configuration resolution reports `error` for `pmOnFail`.
- pnpm configuration resolution reports `true` for `engineStrict`.
- A controlled install with an incompatible root Node.js engine fails.
- A controlled install with an incompatible exact pnpm package-manager version fails.
- Both controlled installs use `--ignore-scripts`.
- Both failures are non-zero and identify the relevant mismatch.
- No dependency, lifecycle script, network request, Docker container, or alternate globally installed toolchain is required.
- Temporary fixture state is removed after validation.

## Repository-owned Check

- `pnpm toolchain:check` succeeds under Node.js `24.18.0` and pnpm `11.13.0`.
- Unsupported or malformed synthetic values fail deterministically.
- Failure output includes expected and observed non-secret version identifiers.
- Failure output does not dump process environments or unrelated paths.
- The check performs no repository write.

## Negative Tests

- `pnpm toolchain:test` uses the Node.js built-in test runner.
- It includes positive, policy-negative, metadata-consistency, and native-install rejection cases.
- Tests prove exact patch-level enforcement.
- Tests reject npm or Yarn identity as unsupported.
- Tests distinguish the intended rejection from an unrelated install failure.
- Tests leave no persistent fixture, lockfile, or dependency tree.

## Root Integration

- Root `package.json` exposes `toolchain:check` and `toolchain:test`.
- Root `validate` runs toolchain enforcement before accepting other repository evidence.
- Existing root scripts remain available.
- No direct dependency changes.
- No lockfile content changes.

## Repository Integrity

- Normal frozen installation succeeds with the supported toolchain.
- Workspace validation succeeds.
- Biome and dependency-boundary validation succeed.
- Typechecking succeeds.
- Existing Vitest configuration tests succeed.
- Production builds succeed.
- No application source or behavior changes.
- No workspace package source or manifest changes.
- No architecture document or ADR changes.

## Documentation and Evidence

- README documents supported activation, check, test, and remediation commands.
- The Development Guide describes the same enforcement contract without introducing a second version source.
- `docs/sprints/SPRINT6_REPORT.md` records files changed, decisions, positive evidence, controlled negative evidence, failures, fallbacks, and remaining work.
- `docs/PROJECT_STATE.md` records Sprint 6 only after all acceptance criteria pass.
- Documentation does not claim Milestone 3A or canonical v0.1 completion.
- Sprint 7 is not started.

# Validation Commands

Run from the repository root with the supported toolchain.

## Toolchain Identity and Configuration

```bash
node --version
pnpm --version
pnpm config get engineStrict
pnpm config get pmOnFail
pnpm toolchain:check
pnpm toolchain:test
```

Required results:

- Node reports `v24.18.0`;
- pnpm reports `11.13.0`;
- `engineStrict` reports `true`;
- `pmOnFail` reports `error`;
- the positive toolchain check passes;
- all controlled positive and negative tests pass.

## Installation and Workspace

```bash
pnpm install
pnpm install --frozen-lockfile
pnpm workspace:check
```

Both install commands must execute the repository's native version enforcement and succeed under the supported toolchain. No second lockfile or lockfile change may appear.

## Existing Repository Gates

```bash
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

All existing gates must pass.

## Final Integrity Review

```bash
pnpm list --depth 0
git diff --check
git status --short
```

The final review must confirm:

- no dependency was added;
- no lockfile content changed;
- only allowlisted implementation files changed;
- existing uncommitted work was preserved;
- no application, package, architecture, ADR, or Sprint 7 file changed.

# Risks

## Duplicate Version Authority

Risk: validation code copies Node.js or pnpm literals and drifts from the root manifest.

Mitigation: read required versions from `package.json` and use `.nvmrc` only as a consistency assertion.

## Obsolete pnpm Settings

Risk: implementation uses pnpm 10 settings that were replaced in pnpm 11.

Mitigation: use `pmOnFail: error`; do not add superseded package-manager strictness settings.

## Dependency-engine Scope Expansion

Risk: enabling `engineStrict` changes installation behavior for transitive dependencies rather than only closing MF-05.

Mitigation: accept this documented pnpm-native behavior, run normal and frozen installation across the complete current dependency graph, and stop on any incompatibility. Do not add dependency-engine overrides or exceptions within Sprint 6.

## Script-only Enforcement

Risk: a lifecycle-only check can be bypassed with `--ignore-scripts`.

Mitigation: require native Node.js and pnpm rejection tests with install scripts disabled. Repository-owned scripts provide diagnostics and evidence, not the sole gate.

## Fixture False Positive

Risk: a temporary install fails because of network, dependency, script, or workspace contamination rather than version mismatch.

Mitigation: use dependency-free isolated temporary projects, disable scripts, avoid network requirements, and assert mismatch-specific output.

## Fixture Leakage

Risk: negative tests leave temporary files or mutate the repository lockfile or dependency tree.

Mitigation: use operating-system temporary directories and unconditional cleanup; compare repository state before completion.

## Package-manager Metadata Variance

Risk: lifecycle metadata differs by invocation path and causes a supported pnpm process to be misidentified.

Mitigation: parse only documented pnpm user-agent structure, cover missing and malformed metadata, and keep native pnpm enforcement authoritative.

## Overly Broad Exactness

Risk: exact patch enforcement surprises developers who have a newer compatible patch installed.

Mitigation: exact enforcement is an explicit MF-05 and repository reproducibility requirement. Version changes require separate compatibility evidence and documentation alignment.

## Existing Worktree Changes

Risk: implementation overwrites or misattributes uncommitted Sprint 5 and audit changes.

Mitigation: record the baseline status, edit only the Sprint 6 allowlist, and report Sprint 6 changes separately.

## Scope Leakage

Risk: toolchain enforcement expands into CI, containers, dependencies, application tests, or version upgrades.

Mitigation: stop at local native enforcement, controlled tests, root command integration, documentation, report, and project-state update.

# Stop Boundary

Sprint 6 stops when:

- exact Node.js and pnpm declarations remain consistent;
- `engineStrict: true` is active;
- `pmOnFail: error` is active;
- `pnpm toolchain:check` passes under the supported toolchain;
- controlled policy and native-install rejection tests pass;
- normal and frozen installation pass;
- all existing repository gates pass;
- documentation is aligned;
- `docs/sprints/SPRINT6_REPORT.md` is generated;
- `docs/PROJECT_STATE.md` is updated.

After reaching this boundary:

- do not begin Prisma or database bootstrap;
- do not add CI or container validation;
- do not expand application test infrastructure;
- do not modify application or shared-package code;
- do not change Node.js, pnpm, TypeScript, or dependency versions;
- do not address DA-04;
- do not create another canonical document;
- do not plan or implement Sprint 7;
- stop and wait for review.

If native pnpm behavior cannot satisfy MF-05 with the approved versions and allowlist, stop. Record the observed command, exit status, output, and relevant pnpm documentation. Do not add a dependency, lifecycle-only workaround, version manager, container, or CI change without a revised specification.

# Deliverables

Sprint 6 implementation must deliver:

1. Native enforcement configuration
   - `engineStrict: true` in `pnpm-workspace.yaml`;
   - `pmOnFail: error` in `pnpm-workspace.yaml`.
2. Repository-owned validation
   - `scripts/validate-toolchain.mjs`;
   - `pnpm toolchain:check`.
3. Controlled enforcement evidence
   - `scripts/toolchain-enforcement.test.mjs`;
   - `pnpm toolchain:test`;
   - positive, policy-negative, and native-install rejection coverage.
4. Root integration
   - toolchain enforcement in `pnpm validate`;
   - no changed dependency or lockfile content.
5. Documentation
   - supported activation, validation, failure, and remediation instructions.
6. Evidence and state
   - `docs/sprints/SPRINT6_REPORT.md`;
   - updated `docs/PROJECT_STATE.md`.

# Sprint Completion Definition

Sprint 6 is complete only when:

1. every changed file is in the allowlist;
2. no dependency or lockfile content changed;
3. native pnpm enforcement rejects incompatible Node.js and pnpm declarations with scripts disabled;
4. exact patch-level policy tests pass;
5. supported normal and frozen installs pass;
6. workspace, quality, typecheck, existing test, build, and root validation commands pass;
7. no application, package, architecture, ADR, or Sprint 7 behavior changed;
8. documentation describes current enforcement without duplicating version authority;
9. the Sprint 6 report records positive and negative evidence;
10. project state is updated only after validation succeeds;
11. Milestone 3A and canonical v0.1 remain explicitly incomplete;
12. implementation stops before Sprint 7.
