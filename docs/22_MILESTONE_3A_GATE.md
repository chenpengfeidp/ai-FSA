# Milestone 3A Architecture Gate Review

## Gate Record

- Review date: 2026-07-15
- Review baseline: `af02c48`
- Reviewed state: repository after completed Sprint 5
- Delivery scope: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Governing plan: `docs/20_IMPLEMENTATION_PLAN.md`
- Governing gate: `docs/21_ARCHITECTURE_SIGNOFF.md`
- Current architecture status: approved with conditions
- Milestone 3A completion status: incomplete
- Sprint 6 implementation status: not started and not authorized

This report evaluates whether the repository remains architecturally consistent after Sprint 5 and whether it is ready for the separately gated Sprint 6 scope.

It does not authorize Sprint 6, close Milestone 3A, or claim canonical v0.1 completion.

## Executive Decision

## Recommendation: READY FOR SPRINT 6

The repository is technically and architecturally ready for Sprint 6.

No source-architecture, package-boundary, build, test, or validation defect blocks the Toolchain Enforcement scope. The open MF-05 finding is the intended Sprint 6 deliverable, not a prerequisite that must be solved before that Sprint begins.

Two governance conditions remain before implementation may start:

1. `docs/sprints/SPRINT6_SPECIFICATION.md` and this gate report must be reviewed and tracked so the approved scope exists in a clean clone.
2. Sprint 6 must receive separate explicit implementation authorization.

Until both conditions are met, no Sprint 6 implementation change is authorized.

Milestone 3A itself is not ready for completion. Prisma bootstrap, application tests, containers, deterministic runtime smoke, Turbo environment policy, CI, and security gates remain open.

# Review Scope and Method

The review covered:

1. repository architecture consistency;
2. package boundaries;
3. toolchain consistency;
4. documentation consistency;
5. build pipeline;
6. validation pipeline;
7. monorepo structure;
8. technical debt;
9. remaining architecture findings;
10. readiness for Sprint 6.

Evidence came from:

- root and workspace manifests;
- TypeScript, Turbo, Vitest, Biome, and dependency-cruiser configuration;
- all implemented API, web, worker, configuration, and shared-compiler source;
- Sprint 1 through Sprint 5 specifications and reports;
- the implementation plan and architecture sign-off;
- the post-Sprint 5 repository audit;
- live frozen-install, quality, typecheck, test, build, and structure validation;
- a forced uncached Turbo validation run;
- three independent read-only reviews focused on architecture, pipelines, and documentation.

Sprint 6 was treated as specified but not implemented.

# Passed Items

## 1. Repository Architecture Consistency

- The implemented repository remains a TypeScript modular monolith.
- `apps/api`, `apps/web`, and `apps/worker` remain separate composition roots.
- API and worker use `@fas/config` before NestJS initialization.
- Web does not import server configuration.
- Worker uses a standalone NestJS application context and has no HTTP platform dependency.
- Worker startup contains no fake idle loop and closes cleanly.
- API exposes only the approved shell endpoints:
  - `GET /`;
  - `GET /health/live`;
  - `GET /health/ready`;
  - `GET /version`.
- No football-domain, AI-engine, authentication, persistence, queue, or business implementation exists.
- No unapproved Prisma, OpenAI, Redis, BullMQ, pgvector, or telemetry dependency exists.
- Sprint 5 changed configuration infrastructure without changing endpoint or web behavior.

The implemented shape remains narrower than the target Milestone 3A tree, as required by immediate-consumer and no-speculative-package rules.

## 2. Package Boundaries

- All five child workspace manifests use `@fas/*` names.
- `@fas/config` has one explicit root export and no deep-import escape path.
- `@fas/tsconfig` exposes only explicit compiler-configuration subpaths.
- Internal dependencies use `workspace:*`.
- API and worker consume `@fas/config` through its public export.
- No application imports another application.
- No package imports an application composition root.
- No deep `@fas/*` source import was found.
- No direct `process.env` access remains in API or worker source.
- Configuration source imports no NestJS, Next.js, Prisma, provider, queue, or telemetry framework.
- dependency-cruiser reports no violations in the implemented graph.
- The controlled negative fixture is rejected by the expected boundary rule.

The current boundary rule set is proportionate to the implemented packages. Additional Prisma, framework-neutrality, and deep-import rules remain future work when their target packages exist.

## 3. Toolchain Consistency

- `.nvmrc`, root `engines.node`, and documentation agree on Node.js `24.18.0`.
- Root `engines.pnpm`, `packageManager`, and documentation agree on pnpm `11.13.0`.
- Turborepo is exact-pinned at `2.10.5`.
- TypeScript is exact-pinned at the approved compatibility baseline `6.0.3`.
- Biome, dependency-cruiser, Husky, lint-staged, Vitest, Zod, Next.js, React, and NestJS versions agree across manifests and project state.
- All implemented direct external dependencies use exact versions.
- No direct-version drift was found across the six workspace manifests.
- One root `pnpm-lock.yaml` remains authoritative.
- No npm or Yarn lockfile exists.
- pnpm build-script and minimum-release-age controls remain configured.

The exact versions are declared consistently. Hard rejection of unsupported executing versions remains open under MF-05.

## 4. Documentation Consistency

- `docs/PROJECT_STATE.md` correctly records Sprint 5 as complete and Milestone 3A as incomplete.
- `docs/20_IMPLEMENTATION_PLAN.md` records Sprints 1 through 5 as complete.
- `docs/sprints/SPRINT5_SPECIFICATION.md` records implementation as completed.
- `docs/sprints/SPRINT5_REPORT.md` matches the implemented configuration package, consumers, dependencies, tests, and validation commands.
- README describes both implemented shared platform packages and the runtime configuration contract.
- AGENTS, MONOREPO, and DEVELOPMENT GUIDE describe the current quality, test, and configuration baseline.
- Numbered canonical documents were contiguous from 00 through 21 before this gate report.
- Sprint specifications and reports remain under `docs/sprints/`.
- The pre-gate documentation scan covered 42 repository-owned Markdown files, 474 links, and 48 heading anchors with zero broken targets.
- Tool versions documented in project state match manifests.

Historical Sprint reports retain the state observed at their completion. Later alignment documents and current project state remain authoritative for current delivery status.

## 5. Build Pipeline

- `pnpm build` uses Turborepo.
- Build tasks depend on dependency builds.
- `@fas/config#build` precedes API and worker builds.
- Configuration emits JavaScript and declarations through its explicit package build.
- API and worker build successfully through Nest CLI.
- Web builds successfully through Next.js.
- Next.js generated types are reproducible and ignored.
- Build outputs are declared under `dist/**` and `.next/**`, excluding Next cache.
- Development tasks remain persistent and uncached.
- Configuration is built before API and worker development commands.

The forced uncached review run completed all configuration, API, worker, and web build tasks successfully.

## 6. Validation Pipeline

- Root `validate` executes:
  1. workspace validation;
  2. quality validation;
  3. typechecking;
  4. tests;
  5. builds.
- Workspace validation recognizes five child workspaces.
- Biome is the single formatter and source linter.
- dependency-cruiser owns graph-level dependency direction.
- The executable boundary negative test passes.
- API, web, worker, and configuration typechecking pass.
- Vitest discovers exactly the current `config` project.
- All 17 configuration contract tests pass.
- Production builds pass.
- Frozen installation passes under the supported toolchain.
- `git diff --check` passes.

The normal gate run passed. A second Turbo run forced cache bypass and completed nine typecheck, test, and build tasks with zero cached tasks and zero failures.

## 7. Monorepo Structure

- The repository has one pnpm workspace with `apps/*` and `packages/*` globs.
- Tracked application roots are:
  - `@fas/api`;
  - `@fas/web`;
  - `@fas/worker`.
- Tracked shared platform packages are:
  - `@fas/config`;
  - `@fas/tsconfig`.
- No future domain, engine, database, job, observability, UI, or test-utility package manifest was created speculatively.
- Root scripts, tooling fixtures, and application source remain in their documented ownership locations.
- `.github/` contains no premature CI or Dependabot implementation.
- No Docker or Compose artifact was introduced before packaging strategy approval.

## 8. Sprint 5 Architecture Evidence

- `@fas/config` is private, ESM, strict, and side-effect free.
- Zod remains internal and is not exposed through public types.
- API and worker loaders are process-specific.
- Returned configuration objects are readonly and frozen.
- Validation errors expose package-owned codes and safe messages.
- Raw invalid values are not retained in public issues.
- API host and port defaults preserve prior shell behavior.
- Worker ignores API-only variables.
- API and worker no longer parse environment variables independently.
- The package has no browser export or secret surface.
- Focused tests cover defaults, overrides, invalid modes, invalid hosts, invalid ports, source immutability, output immutability, safe failures, and repeated calls.
- Sprint 5 introduced no package or capability outside its approved boundary.

# Remaining Findings

## R-01 — Runtime and Package-manager Enforcement

- Sign-off condition: MF-05.
- Severity for Milestone 3A: blocking.
- Severity for starting Sprint 6: expected Sprint scope, not a technical prerequisite.

Current evidence:

- exact Node.js and pnpm metadata exists;
- `pnpm config get engineStrict` resolves to `undefined`;
- `pnpm config get pmOnFail` resolves to `undefined`;
- no repository-owned toolchain check exists;
- no controlled unsupported-version rejection test exists;
- root validation does not yet include toolchain enforcement.

Direct gate validation confirmed that `pnpm install --frozen-lockfile --ignore-scripts` completes successfully under Node.js `22.20.0` with only an unsupported-engine warning. The same command fails with `ERR_PNPM_UNSUPPORTED_ENGINE` when `engineStrict` is enabled for the invocation. This demonstrates both the MF-05 gap and the required pnpm-native Node.js enforcement setting.

The Sprint 6 specification was corrected during gate review to require both `engineStrict: true` and `pmOnFail: error`, plus repository-owned diagnostics, negative enforcement tests, and root validation integration.

## R-02 — Prisma Generation and No-model Bootstrap

- Sign-off conditions: MF-01 and MF-02.
- Severity for Milestone 3A: blocking.
- Severity for Sprint 6: non-blocking and out of scope.

No database package, Prisma config, schema, client, validation command, generation command, or Turbo `generate` task exists.

Exact `pg` and `dotenv` decisions remain intentionally unresolved until an authorized Prisma Sprint confirms necessity and compatibility.

## R-03 — Application Test Coverage

- Severity for Milestone 3A: blocking.
- Severity for Sprint 6: non-blocking and out of scope.

Vitest currently contains only the configuration project. API health, worker bootstrap, web, and composed application tests remain absent.

Turbo dry-run displays non-existent test commands for packages without test scripts. Turbo correctly skips them, but the output makes the remaining application-test gap explicit.

## R-04 — Container Packaging and Host Exposure

- Sign-off conditions: MF-08, MF-09, MF-10, and MF-14.
- Severity for Milestone 3A: blocking.
- Severity for Sprint 6: non-blocking and out of scope.

No packaging strategy, Dockerfile, Compose file, non-default worker profile, application image build, rendered host-binding check, or executable container acceptance exists.

The current worker lifecycle is compliant for its non-persistent shell: it initializes and closes without an artificial loop.

## R-05 — Operational Readiness and Runtime Smoke

- Sign-off conditions: MF-11 and MF-13.
- Severity for Milestone 3A: blocking.
- Severity for Sprint 6: non-blocking and out of scope.

The shell endpoints exist, but readiness is static and cannot yet reflect database or schema compatibility. Sprint 5 recorded bounded manual smoke evidence, but the repository has no deterministic executable workflow covering readiness transitions, correlation, redaction canaries, timeouts, signal behavior, and cleanup.

## R-06 — Turbo Environment and Cache Policy

- Sign-off condition: MF-12.
- Severity for Milestone 3A: blocking before build-affecting environment values, containers, or CI.
- Severity for Sprint 6: non-blocking.

Turbo currently declares no explicit build-affecting environment keys or secret pass-through policy.

No current public build variable or build-time secret consumer exists, so the absence does not invalidate Sprints 1 through 5. The policy must be added before such consumers appear.

## R-07 — CI and Security Gates

- Sign-off condition: MF-15.
- Severity for Milestone 3A: blocking.
- Severity for Sprint 6: non-blocking and out of scope.

No CI workflow, Dependabot configuration, high-severity dependency gate, committed-secret scan, or image vulnerability scan exists.

A filename review found no tracked `.env`, credential, private-key, or secret-named file. This is a hygiene observation, not a substitute for MF-15 automation.

## R-08 — Compatibility Gate Completion

- Sign-off condition: MF-06.
- Severity for Milestone 3A: blocking for the unimplemented portions.
- Severity for Sprint 6: non-blocking.

TypeScript, ESM, NestJS decorators, API startup, worker startup, Next build, and Vitest have evidence under TypeScript `6.0.3`. Prisma generation and container execution remain untested because those capabilities do not yet exist.

## R-09 — Boundary Enforcement Breadth

- Severity for Sprint 6: non-blocking.

Current rules cover cycles, packages-to-apps, cross-application imports, and an executable fixture. They do not yet encode Prisma ownership, framework imports in domain packages, provider ownership, or all deep-import restrictions.

No current violation exists because the affected packages and dependencies are absent. Extend rules in the same Sprint that creates each immediate target.

## R-10 — Documentation Follow-up

- Severity for Sprint 6: non-blocking governance housekeeping.

Current observations:

- `docs/PROJECT_STATE.md` still says Sprint 6 is not scoped, while an untracked completed specification now exists;
- `docs/sprints/REPOSITORY_AUDIT_REPORT.md` contains point-in-time statements that Sprint 5 evidence was uncommitted;
- `docs/sprints/SPRINT5_REPORT.md` contains a point-in-time statement that the plan and specification had not yet been aligned;
- creating this document consumes canonical number 22, so the audit's earlier recommendation for `docs/22_PERSISTENCE_ARCHITECTURE.md` is no longer available;
- README and current document indexes do not yet include this gate report;
- DA-04 still requires ADR-004 visibility before result persistence;
- DA-05 rollback language remains oriented around dependency-specific commits instead of the accepted whole-PR or independently merged-slice strategy.

The point-in-time Sprint evidence is not rewritten by this gate. Current mutable governance documents should be aligned when Sprint 6 is authorized or during the next documentation-only maintenance change.

## R-11 — Local Ignored Artifact Hygiene

- Severity: non-blocking and local-only.

The working directory contains ignored stale artifacts under `packages/logger/` and `packages/shared-types/`, plus empty future-package directories without manifests. They are not tracked, are not workspace members, and do not exist in a clean clone.

They do not affect repository architecture evidence. Local cleanup may be performed separately with explicit user approval.

## R-12 — Configuration Package Type Environment

- Severity: non-blocking.

`@fas/config` overrides inherited ambient types with an empty list and obtains the Node process environment through a minimal structural runtime type. This was an explicit Sprint 5 response to the approved dependency allowlist and passes clean typecheck/build/tests.

If the package later imports Node built-ins or expands its Node API surface, an authorized dependency decision should replace the workaround rather than extending local ambient declarations.

# Blocking Issues

## Blocking Immediate Sprint 6 Implementation

No technical architecture issue blocks the approved Sprint 6 scope.

The following process gates block implementation until resolved:

1. `docs/sprints/SPRINT6_SPECIFICATION.md` is currently untracked.
2. This gate report is newly generated and must be reviewed.
3. Sprint 6 has not received separate explicit implementation authorization.
4. The implementation branch or worktree must satisfy the change-isolation requirement before code changes begin.

These are governance and review conditions, not defects in the Sprint 5 implementation.

## Blocking Milestone 3A Completion

Milestone 3A cannot be declared complete until evidence closes:

- MF-01 — Prisma generation graph;
- MF-02 — no-model Prisma bootstrap;
- MF-05 — runtime and package-manager enforcement;
- remaining MF-06 compatibility checks;
- MF-08 — container packaging strategy;
- MF-09 — executable container acceptance;
- the remaining MF-10 worker profile/lifecycle acceptance;
- the database/schema portion of MF-11 readiness;
- MF-12 — Turbo environment and cache policy;
- MF-13 — deterministic runtime smoke;
- MF-14 — localhost-only Compose exposure;
- MF-15 — CI and baseline security gates;
- application-level automated tests;
- the final clean-clone and CI evidence set required by the sign-off.

Sprint 6 closes only MF-05. It must not absorb the other findings.

# Non-blocking Improvements

The following improvements do not block Sprint 6:

- replace broad shell copy “Repository Bootstrap Completed” when application behavior is separately authorized;
- typecheck test-source TypeScript explicitly if test infrastructure expands;
- add package-specific test scripts as API, worker, and web tests are introduced;
- extend dependency-cruiser rules with each new owned dependency boundary;
- convert the hard-coded API version response to approved build identity when release metadata has an immediate consumer;
- watch `@fas/config` during application development if cross-package edit frequency justifies it;
- remove ignored local stale package artifacts;
- align DA-05 rollback wording;
- refresh current document indexes after this gate is accepted;
- clarify historical report statements without rewriting their original evidence.

None should be added to Sprint 6 unless its specification is formally revised.

# Technical Debt Summary

## Current Platform Debt

- hard toolchain rejection is absent;
- application-level test coverage is absent;
- API readiness is shell-only;
- no executable runtime smoke workflow exists;
- Turbo environment/cache inputs are not classified;
- current boundary rules cover only implemented graph concerns;
- configuration package Node typing uses a deliberate minimal workaround.

## Deferred Infrastructure Debt

- Prisma no-model bootstrap and generated-client graph;
- PostgreSQL adapter and exact future dependency matrix;
- container packaging and Compose topology;
- worker profile behavior;
- CI and security automation;
- correlation and observability;
- database-aware readiness.

## Documentation Debt

- DA-04 ADR-004 visibility before result persistence;
- DA-05 rollback alignment;
- Sprint 6 and gate indexing after approval;
- canonical number 22 persistence-document recommendation now superseded;
- point-in-time statements in older evidence documents.

These items remain visible but must be assigned to separately approved Sprints.

# Readiness for Sprint 6

## Prerequisites Satisfied

- Sprint 5 is complete and committed at `af02c48`.
- The baseline branch matches the remote at review start.
- The supported Node.js and pnpm versions are exact-pinned.
- Workspace structure is valid.
- Direct dependency versions are consistent.
- Package boundaries pass.
- Frozen installation passes under the supported toolchain.
- Full root validation passes.
- Forced uncached typecheck, test, and build pass.
- MF-05 is explicitly identified in project state and the architecture sign-off.
- Sprint 6 has one cohesive target: Toolchain Enforcement.
- Sprint 6 adds no product, domain, AI, persistence, container, CI, or application behavior.
- The Sprint 6 allowlist isolates root toolchain configuration, validation scripts, and current documentation.

## Required Entry Actions

Before implementation:

1. review and track `docs/sprints/SPRINT6_SPECIFICATION.md`;
2. review and track this gate report;
3. grant explicit Sprint 6 implementation authorization;
4. start from the supported Node.js `24.18.0` and pnpm `11.13.0`;
5. confirm the worktree contains no unrelated change;
6. implement only the Sprint 6 allowlist;
7. stop at the Sprint 6 boundary.

## Sprint 6 Exit Expectation

Sprint 6 should:

- close MF-05 with `engineStrict: true`, `pmOnFail: error`, and native Node.js/pnpm mismatch rejection;
- add repository-owned positive and negative evidence;
- integrate toolchain enforcement ahead of existing validation;
- add no dependency;
- change no application or shared-package source;
- leave the lockfile unchanged;
- preserve all current passing gates;
- generate its report and update project state only after validation.

# Final Recommendation

## READY FOR SPRINT 6

The post-Sprint 5 architecture is consistent, bounded, validated, and suitable for the Toolchain Enforcement Sprint.

This recommendation means architecture readiness only. It does not authorize implementation.

Sprint 6 may begin only after its specification and this gate report are reviewed, tracked, and followed by explicit implementation approval.

Milestone 3A remains incomplete and must not be declared complete after Sprint 6.
