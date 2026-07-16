# Sprint 9 Specification Revision — Blocking Review Corrections

## Revision Record

- Date: 2026-07-16
- Sprint: 9
- Specification: `docs/sprints/SPRINT9_SPECIFICATION.md`
- Review source: `docs/sprints/SPRINT9_SPECIFICATION_REVIEW.md`
- Revision type: Documentation-only blocking-issue correction
- Implementation status: Not started and not authorized
- MF-08 packaging-strategy status: Separate approval still required

## Purpose

This revision resolves the five blocking specification issues identified by the Sprint 9 specification review.

It does not:

- select or approve an MF-08 packaging strategy;
- authorize Sprint 9 implementation;
- create a Dockerfile;
- modify application or package code;
- modify architecture documents or ADRs;
- expand the Sprint 9 implementation scope.

## Blocking Issues Resolved

### 1. MF-08 Decision Removed from the Implementation Specification

The specification no longer selects Turbo prune over pnpm deploy as an architecture decision.

It now requires a separate, reviewed, and tracked Architecture Board approval before implementation authorization. That prerequisite must select the strategy and cover:

- shared packages;
- Prisma-generated output;
- Next.js standalone tracing;
- final-stage commands;
- non-root runtime users;
- repository-root build contexts;
- application-local Dockerfile ownership.

The implementation contract remains conditionally scoped to the prune-based Turbo workflow so the approved Sprint 9 implementation scope does not expand. If the separate approval selects another strategy, the specification must be revised and reviewed again.

The Sprint report may record conformance evidence only; it cannot make or retroactively approve the decision.

### 2. Prune Validation No Longer Creates Repository State

The specification now:

- uses the repository-owned `turbo@2.10.5` executable through `pnpm exec`;
- does not use `pnpm dlx`;
- creates three distinct prune outputs under one `mktemp` directory outside the repository;
- verifies the expected API, worker, and web workspace subsets;
- verifies `@fas/database` is absent from each Sprint 9 image graph;
- removes temporary output through a cleanup trap;
- confirms no repository-local `out/` remains.

No implementation allowlist expansion was required.

### 3. Sprint 8 `DATABASE_URL` Pattern Restored

Root validation now supplies an explicit, fixed, non-secret process-environment value:

```bash
VALIDATION_DATABASE_URL="postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation"
DATABASE_URL="$VALIDATION_DATABASE_URL" pnpm validate
```

The specification adds no `.env` loading, committed secret, or fallback URL.

### 4. API Container Listener Corrected Without Source Changes

Runtime validation now distinguishes:

- container-internal listening: `HOST=0.0.0.0`;
- host exposure: `-p 127.0.0.1:3001:3001`.

This uses the API's existing `@fas/config` contract and requires no application-source or manifest change.

The web container similarly receives `HOSTNAME=0.0.0.0` internally while publishing only to host loopback.

This is Sprint 9 build/run evidence only and does not claim MF-14 Compose-level host-binding closure.

### 5. Runtime Validation Made Deterministic

The specification now provides executable validation blocks with:

- deterministic API, web, worker, and identity-check container names;
- cleanup before execution;
- cleanup traps for success, failure, interruption, and timeout;
- bounded HTTP readiness polling;
- per-request timeouts;
- exact response assertions for all four API endpoints, including `GET /`;
- web content assertions for both existing bootstrap strings;
- bounded API/web shutdown;
- acceptance of existing signal-derived exit behavior without changing application source;
- worker exit-code and startup-log verification;
- explicit non-root checks using an entrypoint override;
- temporary worker-log cleanup.

No validation script or implementation file was added, so the implementation allowlist remains unchanged.

## Scope Confirmation

Sprint 9 scope remains exactly:

- apply a separately approved prune-based packaging strategy;
- create application-local Dockerfiles for API, worker, and web;
- add Next.js standalone configuration;
- add `.dockerignore`;
- build and run the existing application shells;
- collect deterministic build, runtime, and non-root evidence;
- update current developer documentation, Sprint report, and project state only after acceptance passes.

Still excluded:

- Compose;
- PostgreSQL runtime;
- application database integration;
- worker Compose profile;
- MF-13 runtime smoke;
- MF-14 Compose host-binding acceptance;
- CI, Dependabot, or security scanning;
- Sprint 10.

## Files Modified by This Revision

- `docs/sprints/SPRINT9_SPECIFICATION.md`
- `docs/sprints/SPRINT9_SPECIFICATION_REVISION.md`

No implementation file, Dockerfile, application source, package, architecture document, ADR, Sprint report, or `docs/PROJECT_STATE.md` file was modified.

## Authorization State

Sprint 9 implementation remains unauthorized.

Implementation may be considered only after:

1. separate MF-08 packaging-strategy approval is tracked;
2. the revised Sprint 9 specification is reviewed against that approval;
3. explicit Sprint 9 implementation authorization is granted.

## Stop Confirmation

This task ends with the specification revision. No Sprint 9 implementation has begun.
