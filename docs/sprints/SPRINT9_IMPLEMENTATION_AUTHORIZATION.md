# Sprint 9 Implementation Authorization

## 1. Authorization Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 9
- Theme: Container Image Packaging Foundation
- Authorization date: 2026-07-16
- Authorization decision: **AUTHORIZED FOR IMPLEMENTATION**
- Authorized specification: `docs/sprints/SPRINT9_SPECIFICATION.md`
- Authorization scope: Sprint 9 only

This document is the separate, explicit implementation authorization required by the Sprint 9 specification and final review.

It authorizes implementation to begin only within the approved Sprint 9 specification. It does not itself implement any deliverable, modify project state, or authorize a later Sprint.

## 2. Governance Preconditions

The following required governance steps are complete:

1. Sprint 9 specification:
   - `docs/sprints/SPRINT9_SPECIFICATION.md`
2. Blocking specification review:
   - `docs/sprints/SPRINT9_SPECIFICATION_REVIEW.md`
3. Documentation-only specification revision:
   - `docs/sprints/SPRINT9_SPECIFICATION_REVISION.md`
4. MF-08 architecture alignment:
   - `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`
5. MF-08 architecture approval:
   - `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`
6. Final specification review:
   - `docs/sprints/SPRINT9_FINAL_REVIEW.md`
7. Final review decision:
   - **APPROVED FOR IMPLEMENTATION**

The MF-08 packaging strategy is therefore approved before any Dockerfile is created, and the final specification has been reviewed against that approval.

## 3. Authorized Architecture

Implementation must apply the approved MF-08 architecture without reinterpretation:

- Turbo `2.10.5` prune with `--docker`;
- repository-root Docker build contexts;
- application-local multi-stage Dockerfiles;
- target-specific pruned workspaces and lockfiles;
- pnpm `11.13.0` frozen installation;
- target-filtered Turbo builds;
- generated artifacts created inside builder stages;
- Next.js standalone output for web;
- minimal final-stage artifact copying;
- explicit non-root runtime users.

pnpm deploy, legacy deploy mode, injected workspace package policy, host-generated build artifacts, and mixed packaging strategies are not authorized.

## 4. Authorized Implementation Scope

Sprint 9 may implement only:

1. `apps/api/Dockerfile`;
2. `apps/worker/Dockerfile`;
3. `apps/web/Dockerfile`;
4. `apps/web/next.config.ts` with the approved standalone-output setting;
5. root `.dockerignore`;
6. deterministic build, runtime, cleanup, endpoint, worker-exit, and non-root acceptance evidence defined by the specification;
7. current developer documentation updates;
8. `docs/sprints/SPRINT9_REPORT.md`;
9. `docs/PROJECT_STATE.md`, only after all acceptance criteria pass.

No implementation may begin from an older pre-review version of the specification.

## 5. Exact Implementation Allowlist

Only the following implementation files may change:

```text
.dockerignore
README.md
docs/15_DEVELOPMENT_GUIDE.md
docs/PROJECT_STATE.md
docs/sprints/SPRINT9_REPORT.md
apps/api/Dockerfile
apps/worker/Dockerfile
apps/web/Dockerfile
apps/web/next.config.ts
```

Temporary prune output must remain outside the repository and must be removed by the specified cleanup mechanism.

No other file may change. If implementation requires another file, implementation must stop and request a specification revision and any required architecture review.

## 6. Binding Restrictions

Implementation must not modify:

- `AGENTS.md`;
- `.nvmrc`;
- root or application `package.json` files;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `turbo.json`;
- `vitest.config.ts`;
- `dependency-cruiser.config.cjs`;
- any file under `packages/`;
- any application source or existing test;
- any architecture document;
- any ADR;
- any previous Sprint specification, review, revision, approval, or report;
- this authorization document;
- any Sprint 10 artifact.

Implementation must not add:

- Docker Compose;
- PostgreSQL runtime or application database integration;
- database-aware readiness;
- a worker Compose profile or artificial worker loop;
- deterministic Compose runtime smoke;
- CI, Dependabot, secret scanning, dependency scanning, or image scanning;
- image publication;
- Redis, BullMQ, pgvector, provider SDKs, or authentication;
- a new npm/pnpm dependency;
- a new workspace package;
- base-image digest hardening;
- Sprint 10 planning or implementation.

## 7. Required Validation

Implementation must run every validation command in the final specification, including:

- exact Node.js and pnpm identity;
- repository toolchain checks;
- frozen installation;
- root validation with Sprint 8's explicit non-secret `DATABASE_URL` process environment;
- temporary, target-specific Turbo prune graph checks;
- all three Docker image builds;
- deterministic API, web, and worker runtime checks;
- exact API endpoint and web-content assertions;
- bounded startup and shutdown handling;
- worker exit-code and startup-log verification;
- non-root identity checks;
- final Git and lockfile integrity checks.

Validation failures must be fixed only within the authorized allowlist and scope. All affected checks must then be rerun until every acceptance criterion passes.

No failure may be hidden through:

- skipped checks;
- weakened assertions;
- unsupported flags;
- changed dependency versions;
- unapproved environment fallbacks;
- untracked repository output;
- manual claims without executable evidence.

## 8. Required Completion Evidence

Sprint 9 is complete only when:

- all three images build from repository-root contexts;
- API and web images serve existing behavior;
- worker logs `Worker started.` and exits successfully;
- every runtime user is non-root;
- the approved Turbo-prune graph is demonstrated for each app;
- no application, package, lockfile, architecture, or ADR change occurred;
- all repository gates pass;
- `docs/sprints/SPRINT9_REPORT.md` records exact decisions, commands, outputs, failures, corrections, and remaining work;
- `docs/PROJECT_STATE.md` records completion only after validation passes;
- Milestone 3A and canonical v0.1 remain explicitly incomplete.

## 9. Stop and Escalation Conditions

Implementation must stop immediately if:

- Turbo prune cannot produce a correct target graph;
- a Dockerfile requires a file outside the allowlist;
- a new dependency or lockfile change appears necessary;
- the exact Node.js base-image tag is unavailable;
- an image requires application-source changes to start;
- a non-root runtime cannot be achieved within scope;
- Next.js standalone requires an unapproved package/configuration change;
- any architecture decision beyond the approved MF-08 strategy is required;
- Docker/registry access produces a definitive authorization, entitlement, or quota denial.

When stopped, record:

- command;
- exit status;
- relevant output;
- affected files;
- required governance decision.

Do not expand scope or continue into a neighboring Must-Fix item.

## 10. Sprint Stop Boundary

After all Sprint 9 acceptance criteria pass:

- generate `docs/sprints/SPRINT9_REPORT.md`;
- update `docs/PROJECT_STATE.md`;
- perform the final allowlist and integrity review;
- stop.

Do not continue into:

- Compose or PostgreSQL services;
- MF-09 full runtime acceptance;
- MF-10 worker profile work;
- MF-11 database-aware readiness;
- MF-12 broader cache policy;
- MF-13 deterministic runtime smoke;
- MF-14 Compose host-binding acceptance;
- MF-15 security/CI gates;
- Sprint 10.

## 11. Authorization Boundary

This authorization grants permission to implement **Sprint 9 exactly as specified**.

It does not:

- amend an architecture document or ADR;
- broaden the MF-08 approval;
- close MF-09 through MF-15;
- authorize Milestone 3A completion;
- authorize canonical v0.1 release;
- authorize Sprint 10.

Any material change requires a new documentation-only review and explicit approval before implementation continues.

## 12. Decision

# SPRINT 9 IMPLEMENTATION AUTHORIZED

Implementation may begin in a separate implementation task, using the final approved specification and this authorization record.

No implementation was performed while creating this authorization document.

