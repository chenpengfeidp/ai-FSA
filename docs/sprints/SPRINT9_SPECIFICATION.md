# Sprint 9 Specification — Container Image Packaging Foundation

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 9
- Theme: Container Image Packaging Foundation (MF-08, partial MF-09)
- Specification status: Final-review aligned; MF-08 strategy approved; pending implementation authorization
- Implementation status: Not started and not authorized

This document defines the proposed Sprint 9 implementation boundary. Creating this specification does not authorize implementation.

It follows:

- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/20_IMPLEMENTATION_PLAN.md`;
- `docs/21_ARCHITECTURE_SIGNOFF.md`;
- `docs/sprints/SPRINT8_REPORT.md`;
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`;
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`.

It also incorporates the blocking findings in:

- `docs/sprints/SPRINT9_SPECIFICATION_REVIEW.md`;
- `docs/sprints/SPRINT9_SPECIFICATION_REVISION.md`.

## Mandatory MF-08 Prerequisite

This implementation specification does **not** choose between Turbo prune, pnpm deploy, or another packaging strategy.

The prerequisite is satisfied by:

- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`;
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`.

The Architecture Board selected Turbo `2.10.5` prune with `--docker` and approved repository-root build contexts plus application-local Dockerfiles. That approval covers shared packages, future Prisma-generated output, Next.js standalone tracing, final-stage commands, and non-root runtime users.

The approval satisfies the prerequisite because it:

1. selects the MF-08 packaging strategy;
2. explains how it covers shared packages, Prisma-generated output, Next.js standalone tracing, final-stage commands, and non-root runtime users;
3. approves repository-root build contexts and application-local Dockerfiles;
4. exists in the repository before any Dockerfile is created.

The implementation contract below consumes that approved Turbo-prune workflow without reinterpreting it. The Sprint report records conformance evidence; it must not make or retroactively alter the packaging decision.

## Why This Sprint, In This Order

`docs/20_IMPLEMENTATION_PLAN.md` Section 8 ("Bootstrap Order") places containers (Step 8) immediately after Prisma bootstrap (Step 7, closed by Sprint 8) and before GitHub Actions (Step 9).

`docs/21_ARCHITECTURE_SIGNOFF.md` records the following Must-Fix conditions as still open after Sprint 8:

- **MF-08 — Docker Build and Packaging Strategy**: a documented packaging path must be chosen *before* Dockerfiles are created.
- **MF-09 — Executable Container Acceptance** (partial): image build must be proven; full Compose runtime acceptance is explicitly out of scope for this sprint (see Non-goals).

`docs/PROJECT_STATE.md` lists MF-08 and MF-09 as open Milestone 3A conditions and states that Sprint 8 intentionally excluded Dockerfiles, Compose, CI, and security scanning.

Per `AGENTS.md` ("prefer small, reversible, reviewable changes"), this sprint narrows Implementation-Plan Step 8 to applying the separately approved packaging strategy and producing buildable per-application images only. Compose topology, the PostgreSQL service, the worker profile decision (MF-10), host-binding acceptance (MF-14), and full runtime smoke (MF-13) are deferred to a later sprint because they depend on images already existing and are separately scoped Must-Fix items with their own target milestones.

## Goals

1. Verify the separately approved MF-08 packaging strategy is tracked, then implement it without making or changing that architecture decision.
2. Add one buildable, minimal, non-root Dockerfile per application composition root: `apps/api`, `apps/worker`, `apps/web`.
3. Prove each image builds successfully from a repository-root build context using only committed files.
4. Prove the API and web images start and serve their existing bootstrap endpoints without requiring PostgreSQL, Compose, or any unapproved runtime dependency.
5. Prove the worker image starts, logs `Worker started.`, and exits cleanly, matching its existing non-persistent Sprint 2 behavior.
6. Leave Compose, the worker Compose profile, PostgreSQL container, host-binding acceptance, CI, and security scanning entirely for later sprints.

## Business Value

Milestone 3A cannot claim bootstrap completion while its approved deployment boundary (Docker Compose, per ADR-001 and `docs/04_ARCHITECTURE.md`) is undemonstrated. An unbuildable image would invalidate any later container-acceptance or CI claim.

Resolving the packaging strategy through the mandatory prerequisite, before any Dockerfile exists, avoids retrofitting shared-package and generated-output handling into three independently authored, inconsistent Dockerfiles. Sprint 9 then applies that decision without becoming a parallel architecture authority.

Proving buildable, runnable images now — without yet wiring Postgres or Compose — isolates packaging risk from runtime/orchestration risk, so a Sprint 10 Compose failure cannot be confused with a Sprint 9 image-build failure.

## Architecture Intent

- Containers remain a v1 deployment boundary owned by `docs/04_ARCHITECTURE.md` and ADR-001; this sprint does not redesign that boundary, it demonstrates it.
- Each application composition root remains independently buildable and revertible, consistent with `docs/20_IMPLEMENTATION_PLAN.md` Section 11.5 (Runtime Rollback).
- Dockerfiles are application-local (`apps/<app>/Dockerfile`), matching the accepted ownership choice in sign-off item DA-07 and `docs/14_MONOREPO.md`. No shared `tooling/docker` directory is introduced because there is exactly one build context (the repository root) and no cross-application Docker logic to deduplicate yet.
- The separately approved packaging strategy is consumed as a build-time mechanism only. This specification does not select or redesign it. It creates no new runtime port, adapter, or domain contract and does not change any application's public behavior.
- No image gains a PostgreSQL dependency, environment secret, or `@fas/database` import. Applications remain non-consumers of `@fas/database`, consistent with Sprint 8's stop boundary; database-aware readiness (remaining MF-11) is explicitly deferred.
- No architecture document, ADR, or numbered document changes. If image construction reveals a genuine architecture gap (for example, an unapproved dependency needed for a minimal runtime image), implementation must stop and request a specification revision rather than silently deciding architecture inside a Dockerfile.

## Package and Application Ownership

| Owner | Responsibility in this Sprint |
| --- | --- |
| `apps/api` | Owns `apps/api/Dockerfile`; builds and runs the existing NestJS API shell only. |
| `apps/worker` | Owns `apps/worker/Dockerfile`; builds and runs the existing non-persistent worker shell only. |
| `apps/web` | Owns `apps/web/Dockerfile` and the new `apps/web/next.config.ts`; builds and runs the existing Next.js homepage shell only. |
| Root (`ai-fsa`) | Consumes the separately approved packaging-strategy decision and owns `.dockerignore` plus root-level build/documentation commands. Root does not become a Docker runtime owner and does not gain application dependencies. |
| `@fas/tsconfig`, `@fas/config`, `@fas/database` | Unchanged. None is a container owner. `@fas/database` is not consumed by any image. |

No new workspace package is created. No existing package's public API, dependency matrix, or test suite changes.

## Scope

### In Scope

1. **Apply the separately approved packaging strategy (MF-08 prerequisite).**
   - Verify the approval record exists and is tracked before implementation.
   - Implement, but do not choose or reinterpret, its approved Turbo-prune workflow.
   - Record implementation conformance — not a new decision — in `docs/sprints/SPRINT9_REPORT.md` and `docs/15_DEVELOPMENT_GUIDE.md`.
   - Conformance covers shared-package pruning (`@fas/tsconfig`, `@fas/config`), the future Prisma-generated-output case documented by the approval, Next.js standalone tracing, a pinned Node.js base image matching `.nvmrc` (`24.18.0`), final-stage commands, and non-root runtime users.

2. **`apps/api/Dockerfile`.**
   - Multi-stage build: a pruning/build stage using `turbo prune @fas/api --docker`, frozen-lockfile install, `turbo run build --filter=@fas/api`; a runtime stage that installs only production dependencies from the pruned lockfile, copies `dist/` output, runs as a non-root user, and starts with `node dist/main.js`.
   - No `EXPOSE`d port beyond the API's existing default; no environment variable default that contradicts `@fas/config` validation.

3. **`apps/worker/Dockerfile`.**
   - Same pattern as the API image, scoped to `@fas/worker`, starting with `node dist/main.js`.
   - No queue, polling loop, or persistent-process behavior is added; the image must exit the same way the existing worker process exits.

4. **`apps/web/Dockerfile` and `apps/web/next.config.ts`.**
   - Add `next.config.ts` with `output: "standalone"` only; no other Next.js configuration changes.
   - Multi-stage build using the pruned workspace, `turbo run build --filter=@fas/web`, and the Next.js standalone runtime output, run as a non-root user.

5. **`.dockerignore`.**
   - Excludes `node_modules`, `.next`, `dist`, `coverage`, `.turbo`, `.git`, and local environment files from the build context.

6. **Build-only acceptance evidence.**
   - `docker build` succeeds for all three images from the repository root.
   - Each image reports a non-root runtime user.
   - The API and web images start, respond on their existing bootstrap endpoints, and stop cleanly without Postgres.
   - The worker image starts, logs `Worker started.`, and exits with status `0` without Postgres.

7. **Documentation and evidence.**
   - `README.md` documents the build commands and their preconditions.
   - `docs/15_DEVELOPMENT_GUIDE.md` documents the approved packaging strategy and updates the "Local Environment" step list to reflect what is now demonstrated.
   - `docs/sprints/SPRINT9_REPORT.md` identifies the prerequisite approval and records implementation evidence and remaining work without making an architecture decision.
   - `docs/PROJECT_STATE.md` is updated only after all acceptance criteria pass.

### Out of Scope (deferred, not implemented here)

- Docker Compose topology, the PostgreSQL service, and the shared private network (Implementation Plan Step 8, remainder; MF-09 Compose-level acceptance).
- The worker's non-default Compose profile decision (remaining MF-10).
- Localhost-only published-port acceptance (MF-14), which requires Compose port mappings to inspect.
- Deterministic runtime smoke workflow (MF-13), which requires Compose and is targeted at the release gate, not this sprint.
- GitHub Actions, Dependabot, or any CI wiring (Implementation Plan Step 9; MF-15).
- Baseline security/image scanning (MF-15).
- Any `@fas/database`, PostgreSQL, or Prisma consumption inside an application image.
- Database-aware readiness in `/health/ready` (remaining MF-11).
- Any change to API/worker/web business behavior, routes, or responses.
- Any change to `@fas/tsconfig`, `@fas/config`, or `@fas/database` source, tests, or manifests.
- Any change to Vitest, Biome, dependency-cruiser, or Husky configuration.
- Any architecture document, ADR, or Sprint 8 artifact change.
- Sprint 10 planning or implementation.

## Files Allowed to Change

Implementation is restricted to this exact allowlist.

### Root

```text
.dockerignore
README.md
docs/15_DEVELOPMENT_GUIDE.md
docs/PROJECT_STATE.md
docs/sprints/SPRINT9_REPORT.md
```

### Application Images

```text
apps/api/Dockerfile
apps/worker/Dockerfile
apps/web/Dockerfile
apps/web/next.config.ts
```

No other file may change.

In particular, implementation must not modify:

- `AGENTS.md`;
- `.nvmrc`, `package.json` engines, or `pnpm-workspace.yaml`;
- `turbo.json`, `vitest.config.ts`, `dependency-cruiser.config.cjs`;
- any file under `packages/`;
- any application source file (`apps/*/src/**`);
- any existing test file;
- `apps/api/package.json`, `apps/worker/package.json`, `apps/web/package.json` (existing `build`/`start` scripts already satisfy this sprint's needs);
- any numbered architecture document;
- any ADR;
- any previous Sprint specification or report;
- `docs/sprints/SPRINT9_SPECIFICATION.md`;
- any Sprint 10 file.

If implementation requires another file — for example, a genuine need to change an application's `start` script or add a shared Docker helper under `tooling/` — stop and request a specification revision instead of expanding scope.

## Dependencies

Sprint 9 adds no new npm/pnpm dependency, no new direct version, and no new workspace package.

Dependency rules:

- use only already-approved, already-pinned direct dependencies (`turbo@2.10.5`, `pnpm@11.13.0`, existing NestJS/Next versions);
- do not add `dotenv`, Redis, BullMQ, pgvector, or any provider SDK;
- do not add a Docker base-image dependency other than an official Node.js image whose major version matches `24.18.0`;
- pin the Docker base image by tag in this sprint; digest pinning is deferred to the release-hardening milestone per `docs/23_RELEASE_BASELINE.md` precedent for other exact pins;
- do not modify `pnpm-lock.yaml`;
- stop if building any image appears to require a new runtime or build dependency not already approved.

## Acceptance Criteria

### Packaging Strategy (MF-08)

- A separately approved and tracked MF-08 packaging-strategy record exists before implementation authorization.
- The Sprint report references that approval and records conformance; it does not select or justify a different strategy.
- The approved strategy is applied consistently across all three Dockerfiles.
- Implementation evidence covers shared-package pruning, Next.js standalone tracing, final-stage commands, and non-root runtime users.
- The prerequisite approval explains how Prisma-generated output will be packaged when an application becomes an authorized `@fas/database` consumer; Sprint 9 does not introduce that consumer.
- Build contexts originate at the repository root for every image.

### Dockerfile Contract

- Each Dockerfile is multi-stage: a builder stage with full (dev + prod) pruned dependencies and a runtime stage with production dependencies only.
- Each runtime stage runs as an explicit non-root user.
- Each runtime stage's entry command matches the application's existing `start` script (`node dist/main.js` for API/worker; the Next.js standalone server entry for web).
- No Dockerfile installs a package not already present in the workspace lockfile.
- No Dockerfile hardcodes a secret, database URL, or production hostname.
- No Dockerfile references `packages/database`, Prisma, or `pg`.

### Build Evidence

- `docker build -f apps/api/Dockerfile -t fas-api:sprint9 .` succeeds.
- `docker build -f apps/worker/Dockerfile -t fas-worker:sprint9 .` succeeds.
- `docker build -f apps/web/Dockerfile -t fas-web:sprint9 .` succeeds.
- Each build uses only repository-controlled, allowlisted source plus artifacts produced inside the build stages; `.dockerignore` excludes local generated/cache directories and unrelated host state.

### Runtime Evidence (Build-only Acceptance, No Compose)

- Running the API image maps a local port and returns expected responses from `GET /`, `GET /health/live`, `GET /health/ready`, and `GET /version` without a PostgreSQL connection, matching current (non-database-aware) behavior.
- Running the web image maps a local port and returns the existing bootstrap homepage.
- Running the worker image logs `Worker started.` and exits with status `0` without requiring any external service.
- No container binds to a non-loopback interface during this sprint's manual verification; Compose-level host-binding acceptance (MF-14) remains a later sprint's formal criterion.
- Each container process runs as a non-root user (verified with `docker run --rm <image> id` or equivalent).

### Repository Integrity

- No application source, test, or existing manifest changes.
- No shared package changes.
- `pnpm-lock.yaml` is unchanged.
- `pnpm install --frozen-lockfile` and the Sprint 8 process-environment form of root validation continue to pass.
- No architecture document or ADR changes.
- No Compose file, PostgreSQL service, or CI workflow is introduced.

### Documentation and Evidence

- README documents exact build and run commands for all three images.
- Development Guide references the separately approved packaging strategy and updates the "Local Environment" section to distinguish demonstrated steps from still-planned steps (Compose, migrations, readiness).
- `docs/sprints/SPRINT9_REPORT.md` references the prerequisite approval and records build/run evidence, base-image tag, non-root user evidence, and remaining work.
- `docs/PROJECT_STATE.md` records Sprint 9 only after all criteria pass.
- Documentation does not claim Compose acceptance, PostgreSQL runtime, worker-profile acceptance, host-binding acceptance, runtime smoke, CI, or Milestone 3A completion.

## Validation Commands

Run from the repository root with Node.js `24.18.0`, pnpm `11.13.0`, and a local Docker daemon.

### Toolchain and Repository Baseline (regression)

```bash
node --version
pnpm --version
pnpm toolchain:check
pnpm install --frozen-lockfile
VALIDATION_DATABASE_URL="postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation"
DATABASE_URL="$VALIDATION_DATABASE_URL" pnpm validate
```

Required result: unchanged Sprint 8 evidence continues to pass with the same explicit, non-secret process-environment contract, proving Sprint 9 introduced no repository regression.

### Packaging Strategy Evidence

```bash
set -eu

PRUNE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/fas-sprint9-prune.XXXXXX")"
cleanup_prune() {
  rm -rf "$PRUNE_ROOT"
}
trap cleanup_prune EXIT INT TERM

pnpm exec turbo prune @fas/api --docker --out-dir "$PRUNE_ROOT/api"
pnpm exec turbo prune @fas/worker --docker --out-dir "$PRUNE_ROOT/worker"
pnpm exec turbo prune @fas/web --docker --out-dir "$PRUNE_ROOT/web"

test -f "$PRUNE_ROOT/api/json/apps/api/package.json"
test -f "$PRUNE_ROOT/api/json/packages/config/package.json"
test -f "$PRUNE_ROOT/api/json/packages/tsconfig/package.json"
test ! -e "$PRUNE_ROOT/api/json/packages/database/package.json"

test -f "$PRUNE_ROOT/worker/json/apps/worker/package.json"
test -f "$PRUNE_ROOT/worker/json/packages/config/package.json"
test -f "$PRUNE_ROOT/worker/json/packages/tsconfig/package.json"
test ! -e "$PRUNE_ROOT/worker/json/packages/database/package.json"

test -f "$PRUNE_ROOT/web/json/apps/web/package.json"
test -f "$PRUNE_ROOT/web/json/packages/tsconfig/package.json"
test ! -e "$PRUNE_ROOT/web/json/packages/database/package.json"

cleanup_prune
trap - EXIT INT TERM
test ! -e "$PRUNE_ROOT"
git status --short
```

Required result:

- the repository-owned `turbo@2.10.5` executable is used without `pnpm dlx` or a network-fetched tool;
- each pruned output uses a distinct temporary directory outside the repository;
- each output includes only the expected workspace subset (the target app plus `@fas/config` and/or `@fas/tsconfig` as applicable) and excludes `@fas/database`;
- the trap removes all temporary output on success, interruption, or failure;
- no repository-local `out/` directory or other untracked prune state remains.

### Image Build Evidence

```bash
docker build -f apps/api/Dockerfile -t fas-api:sprint9 .
docker build -f apps/worker/Dockerfile -t fas-worker:sprint9 .
docker build -f apps/web/Dockerfile -t fas-web:sprint9 .
```

Required result: all three builds exit `0`.

### Runtime Evidence

```bash
set -eu

API_CONTAINER="fas-sprint9-api-validation"
WEB_CONTAINER="fas-sprint9-web-validation"
WORKER_CONTAINER="fas-sprint9-worker-validation"
WORKER_LOG="$(mktemp "${TMPDIR:-/tmp}/fas-sprint9-worker.XXXXXX.log")"

cleanup_runtime() {
  docker rm -f "$API_CONTAINER" "$WEB_CONTAINER" "$WORKER_CONTAINER" \
    >/dev/null 2>&1 || true
  rm -f "$WORKER_LOG"
}
trap cleanup_runtime EXIT INT TERM
cleanup_runtime

wait_for_http() {
  url="$1"
  attempts=0
  until curl -fsS --max-time 2 "$url" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      echo "Timed out waiting for $url" >&2
      return 1
    fi
    sleep 1
  done
}

assert_exact_body() {
  url="$1"
  expected="$2"
  actual="$(curl -fsS --max-time 2 "$url")"
  if [ "$actual" != "$expected" ]; then
    echo "Unexpected response from $url: $actual" >&2
    return 1
  fi
}

assert_expected_stop() {
  container="$1"
  exit_code="$(docker inspect -f '{{.State.ExitCode}}' "$container")"
  oom_killed="$(docker inspect -f '{{.State.OOMKilled}}' "$container")"
  test "$oom_killed" = "false"
  test "$exit_code" -eq 0 || test "$exit_code" -eq 143
}

docker run -d \
  --name "$API_CONTAINER" \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=3001 \
  -p 127.0.0.1:3001:3001 \
  fas-api:sprint9 >/dev/null

wait_for_http "http://127.0.0.1:3001/health/live"
assert_exact_body \
  "http://127.0.0.1:3001/" \
  '{"name":"AI Football Analysis Platform","status":"Repository Bootstrap Completed"}'
assert_exact_body \
  "http://127.0.0.1:3001/health/live" \
  '{"status":"ok"}'
assert_exact_body \
  "http://127.0.0.1:3001/health/ready" \
  '{"status":"ready"}'
assert_exact_body \
  "http://127.0.0.1:3001/version" \
  '{"name":"@fas/api","version":"0.0.0"}'
docker stop --time 10 "$API_CONTAINER" >/dev/null
assert_expected_stop "$API_CONTAINER"

docker run -d \
  --name "$WEB_CONTAINER" \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  -e PORT=3000 \
  -p 127.0.0.1:3000:3000 \
  fas-web:sprint9 >/dev/null

wait_for_http "http://127.0.0.1:3000/"
web_body="$(curl -fsS --max-time 2 "http://127.0.0.1:3000/")"
case "$web_body" in
  *"AI Football Analysis Platform"*"Repository Bootstrap Completed"*) ;;
  *)
    echo "Unexpected web response" >&2
    exit 1
    ;;
esac
docker stop --time 10 "$WEB_CONTAINER" >/dev/null
assert_expected_stop "$WEB_CONTAINER"

if docker run --name "$WORKER_CONTAINER" fas-worker:sprint9 \
  >"$WORKER_LOG" 2>&1; then
  worker_exit=0
else
  worker_exit=$?
fi
test "$worker_exit" -eq 0
worker_output="$(command cat "$WORKER_LOG")"
case "$worker_output" in
  *"Worker started."*) ;;
  *)
    echo "Worker startup log was not observed" >&2
    exit 1
    ;;
esac

cleanup_runtime
trap - EXIT INT TERM
```

Required result:

- deterministic container names are used and cleaned before and after validation;
- API binds to `0.0.0.0` only inside the container while Docker publishes only to host `127.0.0.1`;
- all four API endpoints return their exact existing response bodies;
- web returns both existing bootstrap strings;
- startup waits are bounded to 30 attempts and each HTTP request has a 2-second timeout;
- API and web stop within 10 seconds without an OOM kill; exit `0` or signal-derived `143` is accepted because this Sprint does not change existing application signal behavior;
- worker exits `0` and its captured output contains `Worker started.`;
- cleanup executes on success, assertion failure, interruption, or timeout.

### Non-root Evidence

```bash
set -eu

assert_non_root() {
  image="$1"
  name="$2"
  docker rm -f "$name" >/dev/null 2>&1 || true
  identity="$(docker run --rm --name "$name" --entrypoint id "$image")"
  case "$identity" in
    *"uid=0(root)"*)
      echo "$image runs as root: $identity" >&2
      return 1
      ;;
  esac
}

assert_non_root fas-api:sprint9 fas-sprint9-api-identity
assert_non_root fas-worker:sprint9 fas-sprint9-worker-identity
assert_non_root fas-web:sprint9 fas-sprint9-web-identity
```

Required result: all three commands override the image entrypoint deterministically, exit `0`, and report a UID other than root.

### Final Integrity Review

```bash
git status --short
git diff --check
git diff -- pnpm-lock.yaml
test ! -e out
```

Required result: only allowlisted files changed; the lockfile is untouched; no repository-local prune output or unrelated diff exists.

## Risks

### Packaging Strategy Misfit

Risk: Turbo prune's default pruned lockfile still includes development dependencies needed only for the build stage, producing a larger-than-necessary runtime image if the runtime stage naively reuses the builder's `node_modules`.

Mitigation: the runtime stage performs its own production-only install (or an equivalent prune step) from the pruned lockfile rather than copying the builder's full `node_modules`. Record the resulting image size as informational evidence, not an acceptance gate.

### Next.js Standalone Output Drift

Risk: enabling `output: "standalone"` changes Next's build output shape and could interact with the existing `next typegen` typecheck step or MF-07's generated-types handling.

Mitigation: verify `pnpm --filter @fas/web typecheck` and `pnpm --filter @fas/web build` still succeed unmodified after adding `next.config.ts`; stop and request a specification revision if standalone output requires any other web-package change.

### Non-database-aware Health Check Confusion

Risk: demonstrating `/health/ready` inside a container without PostgreSQL could be mistaken for MF-11 (database-aware readiness) closure.

Mitigation: the Sprint 9 report explicitly states that readiness remains configuration-only and that remaining MF-11 is untouched and still open.

### Base Image Version Drift

Risk: an official Node.js image tag does not exactly match `24.18.0`, silently introducing runtime drift analogous to the toolchain risk closed in Sprint 6.

Mitigation: pin the exact `24.18.0` tag; if unavailable, stop and record the evidence rather than substituting an approximate version.

### Accidental Compose or Database Coupling

Risk: implementation convenience introduces a `docker-compose.yml`, a Postgres dependency, or an `@fas/database` import to make health checks "more real."

Mitigation: acceptance criteria explicitly forbid Compose files and database imports in this sprint; the final integrity review inspects `git status` against the allowlist.

### Build Context Bloat

Risk: omitting entries from `.dockerignore` causes slow or non-reproducible builds by including `node_modules`, `.next`, or `.turbo` in the build context.

Mitigation: `.dockerignore` explicitly excludes these directories; build-context size is inspected as part of acceptance evidence.

### Scope Creep into Compose/CI

Risk: momentum from working Dockerfiles leads directly into Compose, CI, or security scanning within the same sprint.

Mitigation: the stop boundary below is binding; Sprint 10 is a separate specification and separate authorization.

## Stop Boundary

Sprint 9 stops when:

- the separate MF-08 packaging-strategy approval is tracked and its approved workflow is applied consistently across all three Dockerfiles;
- all three images build successfully from a repository-root context;
- the API and web images run and respond on their existing endpoints without PostgreSQL;
- the worker image runs, logs `Worker started.`, and exits `0`;
- every runtime stage runs as a non-root user;
- no application source, shared package, lockfile, architecture document, or ADR changed;
- root validation continues to pass with Sprint 8's explicit non-secret `DATABASE_URL` process environment;
- `docs/sprints/SPRINT9_REPORT.md` is generated;
- `docs/PROJECT_STATE.md` is updated.

After reaching this boundary:

- do not add a Compose file, PostgreSQL service, or private network;
- do not decide or implement the worker's Compose profile;
- do not perform host-binding (MF-14) or deterministic runtime smoke (MF-13) acceptance;
- do not add CI, Dependabot, or security scanning;
- do not connect any application to `@fas/database` or PostgreSQL;
- do not change API/worker/web business behavior;
- do not pin base images by digest (deferred to release hardening);
- do not plan or implement Sprint 10;
- stop and wait for review.

If the approved packaging strategy, an application's existing build output, or the pinned Node.js base image cannot satisfy acceptance criteria within the allowlist, stop. Record the exact command, exit status, output, and affected files. Do not introduce Compose, a database dependency, an unapproved base image, or a weakened non-root requirement without a revised specification.

## Deliverables

Sprint 9 implementation must deliver:

1. Evidence that the separately approved MF-08 packaging strategy was tracked before implementation and applied without reinterpretation.
2. `apps/api/Dockerfile` — buildable, non-root, runs the existing API shell.
3. `apps/worker/Dockerfile` — buildable, non-root, runs the existing worker shell.
4. `apps/web/Dockerfile` and `apps/web/next.config.ts` (`output: "standalone"`) — buildable, non-root, runs the existing web shell.
5. `.dockerignore` excluding local/generated directories from every build context.
6. Build and runtime evidence for all three images (build success, response/log evidence, non-root evidence).
7. Updated `README.md` and `docs/15_DEVELOPMENT_GUIDE.md` referencing the separately approved strategy and documenting the commands.
8. `docs/sprints/SPRINT9_REPORT.md` recording approval conformance, evidence, and remaining work without making an architecture decision.
9. Updated `docs/PROJECT_STATE.md`, recorded only after all criteria pass.

## Sprint Completion Definition

Sprint 9 is complete only when:

1. every changed file is in the allowlist;
2. a separate MF-08 approval record predates implementation and the approved workflow is applied consistently without making an architecture decision inside Sprint 9;
3. all three Dockerfiles build successfully from a repository-root context using only approved, already-pinned dependencies;
4. the API and web images serve their existing bootstrap endpoints without PostgreSQL, Compose, or `@fas/database`;
5. the worker image starts, logs `Worker started.`, and exits `0`;
6. every image runtime stage runs as a non-root user;
7. no application source, shared-package source, lockfile, architecture document, or ADR changes;
8. root validation and all Sprint 8 evidence continue to pass with Sprint 8's explicit non-secret `DATABASE_URL` process environment;
9. no Compose file, PostgreSQL service, worker profile, host-binding acceptance, runtime smoke, CI, or security scanning is introduced;
10. remaining MF-09 (Compose-level acceptance), MF-10, MF-11, MF-12 (beyond Sprint 8's `passThroughEnv` evidence), MF-13, MF-14, and MF-15 remain explicitly open and undiminished;
11. the Sprint 9 report references the prerequisite approval and records strategy conformance, build/run/non-root evidence, and remaining work;
12. `docs/PROJECT_STATE.md` is updated only after all criteria pass;
13. Milestone 3A and canonical v0.1 remain explicitly incomplete;
14. implementation stops before Compose, database-aware readiness, CI, security scanning, or Sprint 10.

## Sprint 9: SPECIFICATION ONLY

This document does not authorize implementation. No implementation file was created or modified while producing this specification.

Implementation may begin only after:

1. the separate MF-08 packaging-strategy approval is tracked;
2. this revised specification is re-reviewed against that approval; and
3. separate explicit implementation authorization references this document.

The review-and-authorize pattern remains the same as Sprints 5 through 8.
