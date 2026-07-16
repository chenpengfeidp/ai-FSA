# Sprint 9 Architecture Alignment Approval — MF-08 Packaging Strategy

## 1. Approval Record

- Decision body: FAS Architecture Board
- Decision date: 2026-07-16
- Delivery milestone: Milestone 3A — Repository Bootstrap
- Architecture condition: MF-08 — Docker Build and Packaging Strategy
- Reviewed proposal: `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`
- Decision: **APPROVED**
- Approval scope: Packaging strategy only
- Sprint 9 implementation status: **NOT AUTHORIZED**

## 2. Decision

The Architecture Board approves:

> FAS will use Turbo `2.10.5` prune with `--docker` as its Milestone 3A application-image packaging strategy. Builds originate at the repository root and use application-local multi-stage Dockerfiles. Each image uses a target-specific pruned workspace and pruned root lockfile, frozen pnpm installation, a target-filtered Turbo build, builder-local generation of required artifacts, artifact-minimal final-stage copying, and an explicit non-root runtime user. The web image uses Next.js standalone output.

This decision resolves the strategy-selection prerequisite required by MF-08 before Dockerfiles may be created.

MF-08 is not fully closed until a separately authorized Sprint produces and validates implementation evidence against this decision.

## 3. Approved Architecture

### Build Context and Ownership

- Build context: repository root.
- Dockerfile ownership:
  - `apps/api/Dockerfile`;
  - `apps/worker/Dockerfile`;
  - `apps/web/Dockerfile`.
- Shared Docker scripts remain absent until demonstrated reuse justifies `tooling/` ownership.

### Pruning and Installation

- Use the repository-owned exact `turbo@2.10.5` executable.
- Run one target-specific `turbo prune --docker` per image.
- Use distinct prune output per target.
- Install with pnpm `11.13.0` under frozen-lockfile policy.
- Do not fetch a separate Turbo executable with `pnpm dlx`.

### Build

- Build from the full pruned workspace.
- Use target-filtered Turbo commands.
- Build declared workspace dependencies before the application.
- Produce required generated artifacts inside the builder.
- Do not use host-generated output as an image input.

### Runtime

- Use separate builder and final runtime stages.
- Copy only the target runtime artifacts and production dependencies.
- Do not copy the builder's full workspace or full development dependency tree.
- Use Next.js standalone output for the web image.
- Use an explicit non-root user in every runtime stage.
- Keep secrets out of image layers, build arguments, environment defaults, history, and cache metadata.

## 4. Candidate Comparison Decision

The Board reviewed Turbo prune and pnpm deploy against:

- monorepo ownership;
- shared packages;
- generated outputs;
- Next.js standalone;
- future Prisma-generated artifacts;
- runtime image size;
- reproducibility;
- build determinism;
- non-root runtime;
- long-term maintenance.

### Turbo Prune

Approved because it:

- uses the repository's existing build-system authority;
- preserves a visible target workspace graph;
- creates a pruned lockfile and Docker-layer-friendly manifest/source split;
- aligns directly with the documented Next standalone container pattern;
- requires no new workspace deployment policy;
- supports future Prisma generation inside the builder;
- supports minimal non-root final stages;
- provides one consistent packaging flow across API, worker, and web.

### pnpm Deploy

Not selected because:

- current pnpm deploy defaults require injected workspace packages or legacy behavior, neither of which is approved in FAS;
- deployment correctness becomes more dependent on package `files` fields and prebuilt workspace output;
- Next standalone remains a separate packaging mechanism, so deploy would not provide one uniform flow for all three applications;
- Turbo remains required for build ordering, making deploy an additional packaging policy rather than a simplification;
- no measured runtime-image advantage currently justifies the additional policy surface.

pnpm deploy remains a valid future alternative if measured evidence supports reconsideration and a new architecture alignment approves the change.

## 5. Shared-package and Generated-output Conditions

The approved strategy must include declared workspace dependencies through the pruned graph.

For Sprint 9:

- API and worker may include `@fas/config` and `@fas/tsconfig`;
- web may include `@fas/tsconfig`;
- `@fas/database` remains excluded because no application is an authorized consumer.

For the first future database-consuming image:

- the manifest must declare `@fas/database`;
- prune must include it mechanically;
- Prisma generation must occur inside the builder using a non-secret process environment;
- compiled database and generated runtime artifacts required by the export map must be present in the final image;
- no generated Prisma source may be copied from the host or committed;
- executable image acceptance must prove the result before database-aware readiness is claimed.

## 6. Reproducibility and Determinism Conditions

Implementation evidence must prove:

- exact Node.js, pnpm, and Turbo versions;
- frozen installation from the target's pruned lockfile;
- no dependency or lockfile mutation during image build;
- independent, inspectable prune output for API, worker, and web;
- clean builds do not depend on host `node_modules`, `.next`, `dist`, `.turbo`, or generated output;
- final-stage commands run the existing application behavior;
- every runtime process is non-root.

## 7. Assumptions

Approval assumes:

- Turbo `2.10.5` prune supports the current pnpm workspace;
- current app manifests declare every required workspace dependency;
- Next.js `16.2.10` standalone output is compatible with repository-root tracing and the pruned build context;
- Sprint 9 does not connect an application to `@fas/database`;
- exact Node.js `24.18.0` image tags are available;
- image builds can access the package registry for frozen installation.

If an assumption fails, implementation must stop. It may not silently switch to pnpm deploy, legacy deploy mode, injected workspace packages, a different Node.js version, or host-generated artifacts.

## 8. Future Implications

This approval establishes Turbo prune as the default FAS application-image packaging path.

Future work must:

- reuse the same Dockerfiles in Compose and CI;
- add executable Prisma-artifact evidence when a database consumer exists;
- preserve root build contexts and app-local Dockerfile ownership;
- avoid parallel packaging flows unless measured evidence and a new approval justify them;
- evaluate base-image digest pinning, SBOM/image scanning, and vulnerability thresholds in the appropriate security/release Sprint;
- complete MF-09 through MF-15 under their own approved scopes.

## 9. Files Created by This Governance Decision

- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`

No implementation code, Dockerfile, application source, package, architecture document, ADR, Sprint implementation report, or project-state file was modified.

## 10. Authorization Boundary

This approval authorizes **the packaging strategy only**.

It does **not** authorize:

- Sprint 9 implementation;
- creation of any Dockerfile;
- creation of `.dockerignore`;
- modification of Next.js configuration;
- Docker Compose or PostgreSQL runtime work;
- application database integration;
- worker profile behavior;
- deterministic runtime smoke;
- CI, Dependabot, security scanning, or image publication;
- modification of architecture documents or ADRs;
- Sprint 10.

Before Sprint 9 implementation can begin:

1. `docs/sprints/SPRINT9_SPECIFICATION.md` must be reviewed against this approval;
2. any remaining inconsistency must be corrected through a documentation-only revision;
3. explicit Sprint 9 implementation authorization must be granted separately.

## 11. Approval Conclusion

**MF-08 packaging strategy: APPROVED — Turbo prune.**

**Sprint 9 implementation: NOT AUTHORIZED.**

Stop after this governance decision and wait for specification review and separate implementation authorization.

