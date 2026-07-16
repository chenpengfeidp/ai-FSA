# Sprint 10 Report — Local Compose Topology Foundation

## 1. Sprint Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 10
- Theme: Local Compose Topology Foundation
- Implementation date: 2026-07-16
- Starting commit: `9375192`
- Specification: `docs/sprints/SPRINT10_SPECIFICATION.md`
- Implementation status: Complete

Sprint 10 began from the clean tracked specification baseline after final architecture approval and explicit implementation authorization. It does not close Milestone 3A, complete canonical v0.1, authorize Sprint 11, connect an application to PostgreSQL, or implement database-aware readiness.

## 2. Goal and Scope Conformance

Sprint 10 assembled the Sprint 9 application images with a local PostgreSQL service while preserving every application command and response.

The resulting topology:

- defines exactly `postgres`, `api`, `web`, and `worker`;
- uses `postgres:17-alpine` with a bounded `pg_isready` health check;
- persists local PostgreSQL data in one named volume;
- attaches all four services to one project-owned, non-external network;
- publishes API and web only to host `127.0.0.1`;
- publishes no PostgreSQL host port;
- excludes worker from default startup and enables it only through the `worker` profile;
- supplies no database configuration or credential to API, web, or worker;
- runs no migration, generation, `db push`, or schema mutation.

No application source, test, package, Dockerfile, lockfile, architecture document, ADR, prior Sprint artifact, or Sprint 11 artifact changed.

## 3. Files Created

- `compose.yaml`
- `.env.example`
- `docs/sprints/SPRINT10_REPORT.md`

## 4. Files Modified

- `README.md`
  - documents exact Compose setup, default startup, worker-profile, stop, and cleanup commands;
  - records the PostgreSQL host-publication and migration boundaries;
- `docs/15_DEVELOPMENT_GUIDE.md`
  - distinguishes demonstrated topology from deferred application database integration and database-aware readiness;
  - documents the one-shot worker profile and local cleanup workflow;
- `docs/PROJECT_STATE.md`
  - records Sprint 10 only after implementation and acceptance evidence passed.

Every changed file is in the exact Sprint 10 allowlist.

## 5. Toolchain and Repository Validation

Observed:

```text
Node.js v24.18.0
pnpm 11.13.0
Docker Engine 29.6.1, linux/arm64
Docker Desktop 4.82.0
Docker Compose v5.3.0
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
- Prisma validation and zero-model generation: PASS;
- Biome: 45 files checked, no fixes or errors;
- dependency-cruiser: 19 modules and 12 dependencies, no violations;
- controlled boundary negatives: PASS;
- typecheck: 6/6 tasks PASS;
- tests: 21/21 PASS;
- build: 5/5 executable tasks PASS;
- overall `pnpm validate`: PASS.

No PostgreSQL connection was required by repository validation.

## 6. Rendered Compose Evidence

The specification's isolated configuration workflow:

- unset inherited `COMPOSE_FILE`, `COMPOSE_PROFILES`, and `COMPOSE_ENV_FILES`;
- selected `compose.yaml` explicitly;
- used `/dev/null` as the explicit Compose environment file;
- supplied five non-production validation values through the process environment;
- parsed default and worker-profile normalized JSON independently.

Results:

```text
rendered_compose_contract=PASS
```

The default configuration contained exactly `api`, `postgres`, and `web`. The worker-profile configuration contained exactly `api`, `postgres`, `web`, and `worker`.

The executable assertions also proved:

- exact application Dockerfile ownership and repository-root build contexts;
- no application command, entrypoint, or database dependency override;
- exact bounded `pg_isready` user/database health contract;
- no PostgreSQL host port in normalized configuration;
- loopback-only API port `43001` and web port `43000`;
- one non-external network and one named PostgreSQL data volume;
- exact application environment allowlists;
- exact five-key `.env.example` contract;
- absence of automatic migration, Redis, BullMQ, and pgvector behavior.

## 7. Compose Build and Runtime Evidence

Executed the complete specification workflow with deterministic project name `fas-sprint10-validation`.

All three application services built through Compose. Default startup ran only PostgreSQL, API, and web and reached the bounded running/healthy state.

Runtime results:

- PostgreSQL health: PASS;
- PostgreSQL published host ports with `PublishedPort > 0`: none;
- API loopback publication: `127.0.0.1:43001`;
- web loopback publication: `127.0.0.1:43000`;
- API and web non-root identity assertions: PASS;
- worker non-root identity assertion: PASS;
- worker required log `Worker started.`: PASS;
- worker exit: `0`;
- API/web bounded stop and non-OOM assertions: PASS;
- project container, network, volume, and temporary-file cleanup: PASS.

Final runtime marker:

```text
compose_runtime_acceptance=PASS worker_exit=0
```

API exact responses passed:

```text
GET /             {"name":"AI Football Analysis Platform","status":"Repository Bootstrap Completed"}
GET /health/live  {"status":"ok"}
GET /health/ready {"status":"ready"}
GET /version      {"name":"@fas/api","version":"0.0.0"}
```

The web response contained both `AI Football Analysis Platform` and `Repository Bootstrap Completed`.

API readiness remains configuration-only. No application consumed PostgreSQL.

## 8. PostgreSQL Publication Evidence

Both required evidence layers passed:

1. normalized configuration contained no PostgreSQL `ports` entry;
2. runtime publisher data contained no PostgreSQL entry with `PublishedPort > 0`.

Docker Compose v5.3.0 reports the PostgreSQL image's container-only `EXPOSE 5432` metadata as:

```text
URL=""
TargetPort=5432
PublishedPort=0
```

Docker `HostConfig.PortBindings` remained empty. This metadata is not host publication and is accepted without weakening the requirement that PostgreSQL publish no host port.

MF-14 is satisfied by the passing rendered and running binding evidence.

## 9. Failures and Corrections

1. The first runtime acceptance attempt used the then-approved assertion that PostgreSQL `Publishers` must be empty. Docker Compose v5.3.0 represents image `EXPOSE` metadata in `Publishers` with an empty URL and `PublishedPort=0`, so the command exited `1` even though `HostConfig.PortBindings` was empty.
2. Implementation stopped under the specification-governance boundary. A focused diagnostic confirmed the behavior was Compose metadata rather than a host binding.
3. The specification was revised and independently approved to treat only `PublishedPort > 0` as host publication. The revised specification was committed before implementation restarted from clean commit `9375192`.
4. The initial image build encountered slow registry downloads and retryable npm registry warnings. Dependency retrieval completed within the package manager retry policy; subsequent final builds were cache-backed and passed.
5. The complete repository, rendered-config, and runtime workflows were rerun against the final specification and all exited `0`.

No implementation assertion was weakened inside implementation, no failure was hidden, and no file outside the allowlist was changed.

## 10. Documentation Result

- README provides exact setup, default startup, worker-profile, stop, and destructive volume-cleanup commands.
- Development Guide records the demonstrated private topology and deferred database-aware behavior.
- Both documents state that PostgreSQL is not host-published.
- Both documents state that no migration exists or runs automatically.
- Neither document claims application database integration or full deterministic runtime smoke acceptance.

## 11. Final Integrity Evidence

Executed the specification's recorded-start-commit integrity workflow:

```text
starting commit: 9375192
git diff --check: PASS
pnpm-lock.yaml working-tree comparison: unchanged
pnpm-lock.yaml starting-commit comparison: unchanged
repository-local out/: absent
allowlist comparison: PASS
temporary integrity files: removed
final_integrity=PASS
```

Only the six exact Sprint 10 allowlist paths changed. No validation container, project network, validation volume, or temporary Compose output remained.

## 12. Acceptance Result

Every Sprint 10 acceptance criterion is satisfied:

- exact four-service topology implemented;
- default profile and explicit worker profile proven;
- bounded PostgreSQL health proven;
- named-volume and private-network ownership proven;
- API/web loopback-only and PostgreSQL non-publication proven;
- existing API, web, and worker behavior preserved;
- application services proven non-root;
- no application database configuration or consumer introduced;
- no migration or schema behavior introduced;
- shutdown and complete cleanup passed;
- frozen installation and root validation passed;
- documentation is current and narrow;
- all changes remain inside the exact allowlist.

Sprint 10 is complete.

## 13. Remaining Work and Stop Boundary

The following remain explicitly open:

- MF-09 broader Compose/container acceptance beyond this topology foundation;
- MF-10 worker bootstrap signal-handling test evidence; only its Compose-profile portion is satisfied;
- MF-11 database-aware readiness;
- MF-12 broader Turbo environment/cache policy;
- MF-13 full deterministic runtime smoke;
- MF-15 CI and baseline security/image scanning;
- application PostgreSQL integration, models, migrations, and durable jobs;
- correlation, structured logging, redaction, and secret-canary evidence;
- object storage, image digest hardening, and image publication.

MF-14 host-binding acceptance is satisfied. Milestone 3A and canonical v0.1 remain incomplete.

No Sprint 11 planning or implementation was started or authorized.
