# Sprint 9 Report — Container Image Packaging Foundation

## 1. Sprint Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 9
- Theme: Container Image Packaging Foundation
- Implementation date: 2026-07-16
- Starting commit: `9d06721`
- Specification: `docs/sprints/SPRINT9_SPECIFICATION.md`
- Packaging approval: `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`
- Implementation authorization: `docs/sprints/SPRINT9_IMPLEMENTATION_AUTHORIZATION.md`
- Implementation status: Complete

Sprint 9 began only after the separately approved MF-08 Turbo-prune strategy and explicit implementation authorization were recorded. An initial environment stop caused by a missing Docker CLI was lifted only after Docker Desktop 29.6.1 was installed and its engine was running.

Sprint 9 does not close Milestone 3A, complete canonical v0.1, authorize Sprint 10, add Compose, connect an application to PostgreSQL, or close the remaining MF-09 through MF-15 conditions.

## 2. Goal and Strategy Conformance

The sprint created independently buildable API, worker, and web images while preserving the existing application behavior and workspace boundaries.

All three Dockerfiles:

- use the exact official `node:24.18.0-slim` tag;
- use the repository-pinned `pnpm@11.13.0` and `turbo@2.10.5`;
- run `turbo prune <target> --docker`;
- install only from the frozen pruned lockfile;
- build only the target application graph;
- run as the existing non-root `node` user;
- include no secret, database URL, Prisma path, PostgreSQL dependency, or unapproved package.

API and worker runtime stages use a separate production-only install from the target-specific pruned lockfile. Web uses Next.js standalone tracing and copies only the standalone server and static assets. This conforms to the approved MF-08 strategy without selecting or revising architecture inside the sprint.

## 3. Files Created

- `.dockerignore`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`
- `apps/web/next.config.ts`
- `docs/sprints/SPRINT9_REPORT.md`

## 4. Files Modified

- `README.md`
  - documents exact image build and loopback-only manual run commands;
  - identifies build-only acceptance and deferred integrated runtime work;
- `docs/15_DEVELOPMENT_GUIDE.md`
  - documents the approved Turbo-prune workflow;
  - distinguishes demonstrated container packaging from planned Compose, migrations, and database-aware readiness;
- `docs/PROJECT_STATE.md`
  - records Sprint 9 only after all implementation acceptance checks passed.

No application source, test, manifest, shared package, lockfile, workspace configuration, architecture document, ADR, previous sprint artifact, or Sprint 10 file changed.

## 5. Image Design

### API

- Pruned graph: `@fas/api`, `@fas/config`, `@fas/tsconfig`.
- Runtime artifacts: compiled API and configuration output plus production-only dependencies.
- Runtime command executes `node dist/main.js`.
- Default internal listener: `0.0.0.0:3001`.

### Worker

- Pruned graph: `@fas/worker`, `@fas/config`, `@fas/tsconfig`.
- Runtime artifacts: compiled worker and configuration output plus production-only dependencies.
- Runtime command: `node dist/main.js`.
- Existing behavior logs `Worker started.` and exits successfully.

### Web

- Pruned graph: `@fas/web`, `@fas/tsconfig`.
- `next.config.ts` sets `output: "standalone"`.
- Runtime artifacts: Next.js standalone server and static assets.
- Runtime command executes `node server.js`.
- Default internal listener: `0.0.0.0:3000`.

API and web use a shell signal-forwarding wrapper around their exact Node.js entry commands. This is required because an unwrapped Node.js process running as container PID 1 did not terminate within the specification's ten-second `docker stop` bound. The wrapper forwards `SIGTERM`, preserves non-root execution, and produces the accepted signal-derived exit status `143` without changing application source.

## 6. Toolchain and Repository Validation

Observed:

```text
Node.js v24.18.0
pnpm 11.13.0
Docker Engine 29.6.1, linux/arm64
```

Executed:

```bash
pnpm toolchain:check
pnpm install --frozen-lockfile
DATABASE_URL="postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation" pnpm validate
```

Results:

- exact toolchain validation: PASS;
- frozen install: PASS, lockfile already up to date;
- toolchain enforcement: 15/15 PASS;
- workspace validation: PASS, 6 packages;
- Prisma validation and no-model generation: PASS;
- Biome: 45 files checked, no fixes or errors;
- dependency-cruiser: 19 modules and 12 dependencies, no violations;
- controlled boundary negatives: PASS;
- typecheck: 6/6 tasks PASS;
- tests: 21/21 PASS;
- build: 5/5 executable tasks PASS;
- overall `pnpm validate`: PASS.

No PostgreSQL service or runtime database connection was used.

## 7. Packaging Strategy Evidence

The exact specification workflow generated three distinct temporary prune outputs outside the repository and asserted their contents:

```text
@fas/api    -> @fas/api, @fas/config, @fas/tsconfig
@fas/worker -> @fas/worker, @fas/config, @fas/tsconfig
@fas/web    -> @fas/web, @fas/tsconfig
```

All outputs excluded `@fas/database`. Cleanup removed the temporary root, and no repository-local `out/` directory remained. Result: PASS.

## 8. Docker Build Evidence

Executed from the repository root:

```bash
docker build -f apps/api/Dockerfile -t fas-api:sprint9 .
docker build -f apps/worker/Dockerfile -t fas-worker:sprint9 .
docker build -f apps/web/Dockerfile -t fas-web:sprint9 .
```

All final builds exited `0`.

Informational final image metadata:

```text
fas-api:sprint9    83,014,475 bytes
fas-worker:sprint9 83,012,551 bytes
fas-web:sprint9    91,254,511 bytes
runtime user       node (UID 1000) for all images
```

The local registry emitted transient slow-download and retry warnings during dependency retrieval, including `ECONNRESET` and retryable error `23` messages. pnpm recovered within its retry policy, frozen-lockfile verification passed, and every build completed successfully.

## 9. Runtime Evidence

The specification's deterministic runtime script used fixed container names, bounded 30-attempt startup waits, two-second HTTP timeouts, ten-second stops, and trap-based cleanup.

API exact responses: PASS.

```text
GET /             {"name":"AI Football Analysis Platform","status":"Repository Bootstrap Completed"}
GET /health/live  {"status":"ok"}
GET /health/ready {"status":"ready"}
GET /version      {"name":"@fas/api","version":"0.0.0"}
```

Web bootstrap content: PASS. The response contained both:

```text
AI Football Analysis Platform
Repository Bootstrap Completed
```

Worker: PASS.

```text
exit code: 0
required log: Worker started.
```

API and web each stopped with the accepted signal-derived status `143` and `OOMKilled=false`. Cleanup removed all validation containers and the temporary worker log.

## 10. Non-root Evidence

Entrypoint-overridden identity checks returned:

```text
fas-api:sprint9:    uid=1000(node) gid=1000(node) groups=1000(node)
fas-worker:sprint9: uid=1000(node) gid=1000(node) groups=1000(node)
fas-web:sprint9:    uid=1000(node) gid=1000(node) groups=1000(node)
```

Result: PASS for all three images.

## 11. Failures and Corrections

1. Before resumed implementation, `docker` was unavailable. Implementation stopped under the declared prerequisite boundary. Docker Desktop was installed and both `docker version` and `docker info` passed before work resumed.
2. A preliminary API-only probe used noncanonical `/ready` and `/live` paths and failed its wait assertion. Container logs proved the image had started; the probe was corrected to the specification's `/health/ready` and `/health/live` paths before acceptance evidence was collected.
3. The first full runtime validation stopped after API shutdown because the unwrapped Node.js PID 1 required forced termination and exited `137` with `OOMKilled=false`. API and web Dockerfiles were corrected with a signal-forwarding wrapper around their existing Node.js commands. Both images were rebuilt, and the complete runtime workflow then passed.
4. The resumed repository regression shell initially resolved Node.js `22.9.0`, so pnpm rejected execution before installation or validation began. The shell was explicitly switched to the pinned Node.js `24.18.0`; the complete frozen-install and `pnpm validate` sequence was then rerun and passed.

No failure was hidden, no assertion was weakened, and no file outside the allowlist was changed.

## 12. Final Integrity Evidence

Executed:

```bash
git status --short
git diff --check
git diff -- pnpm-lock.yaml
test ! -e out
```

Results:

- only Sprint 9 allowlisted files changed;
- `git diff --check`: PASS;
- `pnpm-lock.yaml`: unchanged;
- repository-local `out/`: absent;
- no temporary validation container or prune output remained.

## 13. Acceptance Result

Every Sprint 9 acceptance criterion is satisfied:

- separate MF-08 approval predates implementation;
- all three target-specific images build;
- API and web serve existing behavior without PostgreSQL;
- worker logs the required message and exits `0`;
- all image runtime users are non-root;
- Next.js standalone output is enabled and validated;
- repository and Sprint 8 regression gates pass;
- documentation is current and makes no broader completion claim;
- all changes remain inside the exact allowlist.

Sprint 9 is complete.

## 14. Remaining Work and Stop Boundary

The following remain explicitly open and undiminished:

- MF-09 Compose-level acceptance;
- MF-10 non-default worker Compose profile;
- MF-11 database-aware readiness;
- MF-12 broader Turbo environment/cache policy beyond existing evidence;
- MF-13 deterministic runtime smoke;
- MF-14 Compose host-binding acceptance;
- MF-15 CI and baseline security/image scanning;
- PostgreSQL and object-storage local topology;
- image digest hardening and publication.

Milestone 3A and canonical v0.1 remain incomplete. No Sprint 10 work was started or authorized.
