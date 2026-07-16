# Sprint 9 Architecture Alignment — MF-08 Container Packaging Strategy

## 1. Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Architecture condition: MF-08 — Docker Build and Packaging Strategy
- Decision owner: Platform/Foundation
- Alignment date: 2026-07-16
- Proposal status: Approved by `SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`
- Implementation status: Not authorized

This document resolves the packaging-strategy decision required by `docs/21_ARCHITECTURE_SIGNOFF.md` before any Dockerfile is created.

It is a narrow architecture-alignment record. It does not authorize Sprint 9 implementation, create container artifacts, modify an ADR, or alter the broader deployment architecture.

## 2. Authority and Constraints

This decision follows:

- `AGENTS.md`;
- `docs/04_ARCHITECTURE.md`;
- `docs/14_MONOREPO.md`;
- `docs/20_IMPLEMENTATION_PLAN.md`;
- `docs/21_ARCHITECTURE_SIGNOFF.md`;
- `docs/PROJECT_STATE.md`;
- `docs/sprints/SPRINT8_REPORT.md`;
- `docs/sprints/SPRINT9_SPECIFICATION.md`;
- `docs/sprints/SPRINT9_SPECIFICATION_REVIEW.md`;
- `docs/sprints/SPRINT9_SPECIFICATION_REVISION.md`.

MF-08 requires one packaging path — Turbo prune or pnpm deploy — to be selected before Dockerfiles are created. The selected strategy must cover:

1. repository-root build contexts;
2. shared workspace packages;
3. Prisma-generated output;
4. Next.js standalone tracing;
5. final-stage commands;
6. non-root runtime users.

Binding repository constraints remain:

- pnpm `11.13.0` and one root lockfile;
- Turborepo `2.10.5`;
- exact direct dependency pins;
- application-local Dockerfiles;
- no public exposure;
- no Redis, BullMQ, pgvector, provider SDK, or speculative package;
- no application consumption of `@fas/database` in Sprint 9;
- generated artifacts are reproducible and uncommitted;
- implementation requires a separately approved Sprint specification.

## 3. Decision Question

Which packaging strategy should FAS use for Milestone 3A application images?

Candidates:

1. **Turbo prune** — produce a target-specific partial monorepo with a pruned lockfile and Docker-optimized `json/` and `full/` layers, then install, build, and assemble the runtime image.
2. **pnpm deploy** — build the workspace, then deploy one target package and its production dependencies into a portable output directory.

The decision is not whether FAS uses containers. Docker Compose is already the approved V1 deployment boundary. The decision is how each application image receives the smallest reproducible workspace subset without breaking package ownership.

## 4. Current Repository Evidence

The current repository has:

- three application composition roots: `@fas/api`, `@fas/web`, `@fas/worker`;
- shared dependencies through `@fas/config` and `@fas/tsconfig`;
- `@fas/database`, which owns Prisma configuration and package-local generated output but has no application consumer yet;
- explicit Turbo build/typecheck/test tasks;
- one authoritative pnpm lockfile;
- exact Node.js `24.18.0`, pnpm `11.13.0`, and Turbo `2.10.5` pins;
- Next.js without standalone output enabled yet;
- no Dockerfile or Compose file;
- no `injectWorkspacePackages` deployment policy.

Relevant official tool behavior:

- Turbo prune creates a target-specific partial monorepo and pruned lockfile. With `--docker`, manifests/lockfile are separated under `json/` from complete source under `full/`, allowing dependency-install layers to remain cached when source changes.
- Turborepo's documented Next.js Docker pattern combines prune output with Next standalone output and a non-root runner.
- pnpm deploy creates a portable target directory containing the selected package and its production dependencies.
- Current pnpm deploy defaults require injected workspace packages, or else legacy deploy behavior/configuration.

Evidence sources:

- [Turborepo Docker guide](https://turborepo.com/docs/guides/tools/docker)
- [Turborepo prune reference](https://turborepo.com/docs/reference/prune)
- [pnpm deploy reference](https://pnpm.io/cli/deploy)
- [pnpm Docker guide](https://pnpm.io/docker)

## 5. Evaluation Criteria

The selected strategy must:

- preserve package ownership rather than flattening the monorepo conceptually;
- include only the target app and actual workspace dependencies;
- support build-time generated artifacts without committing them;
- support Next.js standalone output without carrying the full workspace into runtime;
- support future `@fas/database` consumers and Prisma Client generation;
- allow minimal production runtime images;
- derive reproducibly from the pinned root lockfile;
- remain deterministic in clean builds;
- support explicit non-root runtime users;
- remain understandable and maintainable for future agents.

## 6. Candidate A — Turbo Prune

### 6.1 Mechanism

For each application, a builder runs:

```text
turbo prune --scope=@fas/<app> --docker
```

The output contains:

- a pruned lockfile;
- `json/` package manifests for a dependency-install layer;
- `full/` source for the target app and transitive workspace dependencies.

The image then:

1. installs from the pruned lockfile with frozen policy;
2. copies the full pruned workspace;
3. runs the target-filtered Turbo build;
4. copies only required runtime artifacts into a non-root final stage.

### 6.2 Monorepo Ownership

Strong fit.

Turbo derives the package subset from the existing workspace dependency graph. Application packages remain composition roots, and shared packages remain separately owned rather than copied into app source.

### 6.3 Shared Packages

Strong fit.

API and worker prune output includes `@fas/config` and `@fas/tsconfig`; web includes `@fas/tsconfig`. Future dependencies are included only after manifests declare them.

### 6.4 Generated Outputs

Strong with an explicit build-stage rule.

Generated files must be produced after `full/` source is copied and before target compilation. They are never expected in the Docker build context or committed repository state.

### 6.5 Next.js Standalone

Strong fit and directly documented by Turborepo.

The builder creates `.next/standalone` and `.next/static`; the final web stage copies only standalone runtime output and static assets.

### 6.6 Prisma-generated Artifacts

Compatible, with future implementation conditions.

Sprint 9 does not include `@fas/database` in any app graph. When an authorized application later depends on it:

1. Turbo prune must include `@fas/database` from the declared workspace dependency;
2. the builder must provide a non-secret validation `DATABASE_URL`;
3. the database package's build/generate dependency must run before compilation;
4. the final stage must copy the built database package and generated runtime files required by its export map;
5. no generated source is copied from the host or committed.

The future container acceptance sprint must prove this path before claiming database-aware image readiness.

### 6.7 Runtime Image Size

Good, but not automatic.

Prune reduces dependency and source inputs. Final size depends on copying only production dependencies and target runtime artifacts. The builder's full `node_modules` must not be copied wholesale into the runtime stage.

Next standalone tracing provides an additional reduction for web.

### 6.8 Reproducibility

Strong fit.

Pruned installs derive from the committed root lockfile and can use `pnpm install --frozen-lockfile`. The exact Turbo executable is already pinned and repository-owned.

### 6.9 Build Determinism

Strong fit.

The pruned dependency graph is target-specific and can be inspected independently for API, worker, and web. Clean build stages prevent hidden host-generated state.

### 6.10 Non-root Runtime

Neutral/strong.

Turbo prune does not decide runtime identity, but its multi-stage flow cleanly supports an explicit non-root `USER` in final stages with owned copied files.

### 6.11 Long-term Maintenance

Strong fit.

FAS already uses Turbo as its workspace task graph. Prune adds no second package-deployment policy and uses official Docker guidance that future agents can recognize.

The main maintenance cost is multi-stage Dockerfile complexity and the need to keep generated-output copying explicit.

## 7. Candidate B — pnpm Deploy

### 7.1 Mechanism

After installing and building the workspace, pnpm deploy can create a portable package:

```text
pnpm --filter @fas/<app> --prod deploy <target>
```

The target includes the selected package and production dependencies in an isolated `node_modules`.

### 7.2 Monorepo Ownership

Good fit.

Deployment is package-filtered and uses pnpm's workspace graph. The result is operationally flattened into a portable package, which is useful for runtime but provides less direct visibility into the pruned build graph.

### 7.3 Shared Packages

Potentially strong, but requires a new repository policy.

Current pnpm deploy defaults require injected workspace packages (or legacy behavior). FAS does not currently enable this setting. Selecting deploy would require a deliberate `pnpm-workspace.yaml` policy change and acceptance evidence for every shared package.

### 7.4 Generated Outputs

Good only after build ordering is solved.

Deploy copies the package state that exists at deployment time. Generated files and built shared-package output must already exist and must be included by package file rules. This can create hidden coupling between build order, each package's `files` field, and deploy output.

### 7.5 Next.js Standalone

Weaker fit for this repository.

Next standalone already creates a traced runtime tree. pnpm deploy would either duplicate that packaging responsibility or require a separate web-specific final-stage path while API/worker use deploy. That reduces strategy uniformity.

### 7.6 Prisma-generated Artifacts

Compatible but more manifest-sensitive.

Future database deploy correctness would depend on:

- generation and compilation occurring before deploy;
- `@fas/database` package `files`/exports including all runtime artifacts;
- injected workspace package behavior preserving built output;
- deploy not omitting generated runtime files because they were ignored or outside package-file rules.

This is feasible but creates more coupling to package-publication metadata than FAS currently needs.

### 7.7 Runtime Image Size

Strong fit for Node applications.

`--prod deploy` creates a portable production dependency tree, which can simplify small API/worker final stages.

The advantage is smaller for web because Next standalone already owns tracing and runtime minimization.

### 7.8 Reproducibility

Strong in principle.

Deploy uses pnpm's lockfile and workspace graph. In this repository it would first require an approved injected-workspace policy (or legacy mode), creating an additional configuration decision and validation surface.

### 7.9 Build Determinism

Good, provided build-before-deploy is explicit.

Deploy can package stale built output if invoked without a clean target build. It is not itself the task graph and must be coordinated with Turbo or recursive build commands.

### 7.10 Non-root Runtime

Neutral/strong.

Like prune, deploy output can be copied into a final stage with an explicit non-root user.

### 7.11 Long-term Maintenance

Mixed fit.

Portable output is attractive for API/worker. However, FAS would maintain:

- Turbo for build orchestration;
- pnpm deploy policy for Node app packaging;
- Next standalone as a separate web packaging path;
- injected-workspace configuration and package-file metadata as deployment-critical controls.

That is more policy surface than the current bootstrap needs.

## 8. Comparative Matrix

| Criterion | Turbo prune | pnpm deploy |
| --- | --- | --- |
| Monorepo ownership | Strong: preserves visible target workspace graph | Good: package-filtered, then flattened for runtime |
| Shared packages | Strong with existing manifests | Good, but requires injected-workspace or legacy policy |
| Generated outputs | Strong when generated in builder | Good, but tightly coupled to build order and package `files` |
| Next standalone | Strong, officially documented combination | Mixed; overlaps with standalone responsibility |
| Future Prisma artifacts | Strong with explicit builder generation/copy | Feasible, but more package-metadata-sensitive |
| Runtime image size | Good with disciplined final-stage copying | Strong for API/worker; less benefit for web |
| Reproducibility | Strong: pruned root lockfile + frozen install | Strong after new deploy policy is approved |
| Build determinism | Strong: inspectable target graph | Good: requires separate clean build discipline |
| Non-root runtime | Supported in final stage | Supported in final stage |
| Long-term maintenance | One existing orchestration model | Additional deploy/injection policy plus separate web path |
| New repository policy | None for strategy selection | Requires workspace deployment policy |
| Consistency across three apps | Strong | Mixed because web remains standalone-specific |

## 9. Selected Architecture

**Approved strategy: Turbo prune with `--docker`, repository-root build contexts, application-local multi-stage Dockerfiles, and artifact-minimal non-root final stages.**

The decision is:

1. use the repository-owned, exact Turbo `2.10.5` executable;
2. prune one target application per image;
3. use distinct, target-specific prune output;
4. install from the pruned lockfile under frozen pnpm policy;
5. build through the target-filtered Turbo graph;
6. generate required artifacts inside the builder, never on the host as an image input;
7. use Next standalone output for the web runtime;
8. copy only target runtime artifacts and production dependencies to final stages;
9. run final stages as explicit non-root users;
10. keep Docker build contexts at repository root and Dockerfiles app-local.

This closes the **strategy-selection prerequisite** in MF-08. MF-08 implementation evidence is still required before the condition is fully closed.

## 10. Why pnpm Deploy Was Not Selected

pnpm deploy is not rejected as technically unsound. It was not selected because it is a weaker fit for the current FAS baseline:

1. it requires an injected-workspace-packages policy or legacy mode that FAS has not approved;
2. it makes package `files`/build output part of deployment correctness before FAS has a real application consumer of `@fas/database`;
3. it does not remove the need for Next standalone, producing two packaging idioms across three apps;
4. Turbo remains necessary for builds, so deploy adds a second deployment graph/policy rather than replacing an existing tool;
5. Turbo prune satisfies the current need without adding dependencies or workspace policy.

Future reconsideration is allowed if:

- runtime image measurements show a material disadvantage;
- pnpm deploy becomes the repository's approved workspace-publication mechanism;
- multiple non-Next Node services demonstrate repeated final-stage dependency-copy complexity;
- the change is reviewed through a new architecture alignment.

No implementation may mix Turbo prune and pnpm deploy ad hoc.

## 11. Binding Implementation Conditions

Any implementation consuming this decision must:

- use repository-root build contexts;
- keep Dockerfiles under their owning application;
- use exact Node.js `24.18.0` base-image tags unless a separately approved compatibility exception exists;
- use pinned pnpm/Turbo versions already owned by the repository;
- use frozen lockfile installation;
- prevent host `node_modules`, `.next`, `dist`, `.turbo`, environment files, and generated Prisma source from entering the build context;
- use distinct target prune outputs;
- verify the pruned graph contains only the target and declared workspace dependencies;
- avoid copying builder-wide dependencies into final stages;
- use Next standalone for web;
- use an explicit non-root user in every final stage;
- keep secrets out of layers, build arguments, image history, logs, and cache metadata;
- generate future Prisma artifacts in the builder with a non-secret process environment;
- preserve package export maps and avoid deep imports;
- stop if a required artifact is absent rather than copy an ungoverned host directory.

## 12. Assumptions

- `turbo prune --docker` in Turbo `2.10.5` supports the repository's pnpm workspace and one root lockfile.
- Each current app can build from a pruned graph with its declared workspace dependencies.
- Next.js `16.2.10` standalone output remains compatible with the selected multi-stage pattern.
- Sprint 9 images do not consume `@fas/database`; Prisma compatibility is a future-condition design, not current runtime evidence.
- Container image building has access to the package registry required by frozen pnpm installation.
- Base-image digest pinning remains release-hardening work; exact version tags are required in Sprint 9.
- Compose topology, published-port policy, worker profiles, runtime smoke, CI, and scanners remain separately governed.

If an assumption fails during implementation, Sprint 9 must stop and record evidence. It must not switch to pnpm deploy or alter workspace policy without a revised architecture approval.

## 13. Future Implications

### 13.1 First Database-consuming Image

The first authorized app-to-database integration must add executable container evidence that:

- prune includes `@fas/database`;
- Prisma generation occurs inside the builder;
- both source-generated and compiled runtime artifact paths are understood;
- the final image contains exactly the files required by `@fas/database` exports;
- no secret database URL is persisted in a layer.

### 13.2 Compose and Runtime Acceptance

This approval does not close:

- MF-09 executable Compose acceptance;
- MF-10 worker profile/lifecycle acceptance;
- MF-11 database-aware readiness;
- MF-12 full Turbo environment/cache policy;
- MF-13 deterministic runtime smoke;
- MF-14 localhost-only Compose exposure;
- MF-15 security gates.

### 13.3 CI

Future CI must use the same Dockerfiles and repository-root contexts. It must not maintain a parallel packaging implementation.

### 13.4 Maintenance

If Dockerfiles develop repeated logic, shared scripts may move under `tooling/` only after at least two genuine consumers exist and a later sprint allows the change.

## 14. Risks and Controls

| Risk | Control |
| --- | --- |
| Prune graph omits required global files | Validate all three pruned graphs and builds; add only demonstrated global inputs through an approved Turbo policy change |
| Runtime image copies dev dependencies | Separate builder/runtime stages and inspect final contents/image history |
| Next standalone misses monorepo files | Build from pruned root and validate runnable standalone image |
| Future Prisma output absent | Generate in builder and verify `@fas/database` runtime exports before database-aware acceptance |
| Secret leaks into layers | Use non-secret validation URL only; no secrets in ARG/ENV/COPY/cache |
| Root runtime user | Explicit `USER` plus executable identity check |
| Strategy drift | Boundary review and Sprint report compare Dockerfiles to this approval |

## 15. Approval Text

The Architecture Board is requested to approve:

> For Milestone 3A container packaging, FAS will use Turbo `2.10.5` prune with `--docker`, repository-root build contexts, application-local multi-stage Dockerfiles, frozen pnpm installation from pruned lockfiles, target-filtered Turbo builds, Next.js standalone output for web, builder-local generation of required artifacts, minimal final-stage artifact copying, and explicit non-root runtime users. pnpm deploy is not selected because it requires an additional workspace deployment policy, adds package-file/deploy coupling, and does not provide one uniform strategy across Next standalone and Node applications.

## 16. Authorization Boundary

Approval of this document authorizes **only the MF-08 packaging strategy**.

It does not authorize:

- Sprint 9 implementation;
- any Dockerfile or `.dockerignore`;
- Next.js configuration changes;
- Docker Compose;
- PostgreSQL runtime;
- application database integration;
- CI, security scanning, or image publication;
- architecture-document or ADR changes;
- Sprint 10.

Sprint 9 implementation still requires:

1. the separate approval record;
2. specification review against this decision;
3. explicit implementation authorization.

