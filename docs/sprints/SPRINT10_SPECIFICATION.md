# Sprint 10 Specification — Local Compose Topology Foundation

## Status and Authority

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Sprint: 10
- Theme: Local Compose Topology Foundation
- Specification status: Architecture-review revised; pending final review
- Implementation status: Not started and not authorized

This document defines the proposed Sprint 10 implementation boundary. Creating
this specification does not authorize implementation.

The sole Sprint 10 planning authority is:

- `docs/sprints/SPRINT10_PLANNING.md`.

The following remain binding governance and architecture authorities:

- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/20_IMPLEMENTATION_PLAN.md`;
- `docs/21_ARCHITECTURE_SIGNOFF.md`.

The planning document selects the next sprint theme and ordering. This
specification translates that approved planning recommendation into an
independently reviewable implementation contract without expanding or
reinterpreting it.

The repository release label `v0.1.9` is a delivery version for the completed
Sprint 9 baseline. It does not mean that Milestone 3A or canonical product v0.1
is complete.

## Why This Sprint, In This Order

Sprint 9 proved that the API, worker, and web images:

- build independently from repository-root contexts;
- contain the correct target-specific workspace graphs;
- run with their existing bootstrap behavior;
- run as non-root users;
- require neither PostgreSQL nor Compose.

The Implementation Plan places container topology in Step 8, before GitHub
Actions in Step 9. Sprint 9 completed image packaging but intentionally left
the following structural Step 8 work open:

- a PostgreSQL service with health check and persistent local volume;
- a private Compose network;
- API and web service composition;
- an explicit non-default worker profile;
- localhost-only application port publication;
- rendered Compose binding evidence;
- bounded startup, shutdown, and cleanup evidence.

Per `docs/sprints/SPRINT10_PLANNING.md`, these topology contracts must exist
before database-aware readiness, the full deterministic runtime smoke workflow,
CI, or baseline security automation. Starting those later capabilities first
would encode or test a topology that has not yet been accepted.

## Goals

1. Add one root-owned Compose topology around the application images proven in
   Sprint 9.
2. Add PostgreSQL using the already approved `postgres:17-alpine` baseline,
   with a health check and named local volume.
3. Place PostgreSQL, API, web, and the optional worker on one user-defined
   private network.
4. Define API and web services from the existing application-local
   Dockerfiles without modifying those Dockerfiles or application source.
5. Place the existing non-persistent worker behind one explicit non-default
   Compose profile without adding a loop, queue, scheduler, or polling behavior.
6. Publish API and web ports only on host `127.0.0.1`; do not publish the
   PostgreSQL port.
7. Prove the rendered Compose configuration, default topology, optional worker
   behavior, PostgreSQL health, application responses, non-root application
   identities, bounded shutdown, and complete cleanup.
8. Preserve explicit migration execution by adding no migration service,
   migration command, model, migration, or automatic schema operation.
9. Leave application database integration, database-aware readiness, the full
   MF-13 smoke contract, CI, and security scanning for separately authorized
   later sprints.

## Business Value

Sprint 9 removed image-packaging uncertainty. Sprint 10 removes the next
independent source of uncertainty: whether those images and the approved local
PostgreSQL baseline can be assembled into a private, reproducible local
topology without changing application behavior.

This topology provides stable service names, network ownership, PostgreSQL
health, worker-profile behavior, and host-binding rules. Those become the
required inputs for later database-aware readiness and deterministic runtime
acceptance.

Keeping Sprint 10 topology-only prevents application database lifecycle,
observability, smoke tooling, CI, and security controls from being mixed into
one high-risk change. The result remains small, reversible, and reviewable.

## Architecture Intent

- Compose is a root-owned local orchestration artifact; application Dockerfiles
  remain owned by their application composition roots.
- PostgreSQL is the only runtime datastore introduced.
- The Compose network is private and user-defined. No public ingress, external
  network, Redis, BullMQ, pgvector, or object-storage service is added.
- API and web retain their exact Sprint 9 commands and responses.
- Worker retains its exact non-persistent behavior and runs only when its
  explicit profile is requested.
- PostgreSQL health is topology evidence only. API readiness remains
  configuration-only in this sprint and must not claim database awareness.
- PostgreSQL receives local values through Compose interpolation. No credential
  or secret is committed as an operational value.
- No service automatically runs Prisma generation, migration, deployment, or
  schema mutation.
- No application imports `@fas/database`, Prisma, or `pg`.
- No new architecture decision is made. If the minimal topology requires an
  application-source change, package change, new dependency, or unapproved
  service, implementation must stop for review.

## Ownership

### Root

The repository root owns:

- `compose.yaml`;
- `.env.example`;
- topology commands and documentation.

Root orchestration does not become a business runtime owner and gains no npm or
pnpm dependency.

### `apps/api`

The API remains unchanged. Compose builds `apps/api/Dockerfile`, supplies only
its existing `NODE_ENV`, `HOST`, and `PORT` values, and publishes its existing
container port to host loopback.

### `apps/web`

The web application remains unchanged. Compose builds
`apps/web/Dockerfile`, supplies its existing runtime listener values, and
publishes its existing container port to host loopback.

### `apps/worker`

The worker remains unchanged. Compose builds `apps/worker/Dockerfile` and
places the service behind the non-default `worker` profile. The service logs
`Worker started.` and exits `0`.

### PostgreSQL

PostgreSQL is a local infrastructure service only. It owns its container-local
data directory and named development volume. It has no application consumer in
this sprint and is not published to the host.

### Shared Packages

`@fas/tsconfig`, `@fas/config`, and `@fas/database` remain unchanged.
`@fas/database` is not imported or invoked by an application or Compose
service.

## Scope

### In Scope

1. **Root Compose definition.**
   - Define exactly four services: `postgres`, `api`, `web`, and `worker`.
   - Use repository-root build contexts for API, web, and worker.
   - Reference the existing application-local Dockerfiles.
   - Do not override application entry commands.

2. **PostgreSQL topology.**
   - Use `postgres:17-alpine`.
   - Configure database name, user, and password through required Compose
     interpolation variables.
   - Add a bounded `pg_isready` health check.
   - Mount one named volume at PostgreSQL's documented data path.
   - Attach PostgreSQL only to the private application network.
   - Publish no PostgreSQL host port.

3. **Private application network.**
   - Define one root-owned, user-defined Compose network.
   - Keep it project-owned and non-external.
   - Attach all four services to it.
   - Add no external network.

4. **API service.**
   - Build from `apps/api/Dockerfile`.
   - Supply `NODE_ENV=production`, `HOST=0.0.0.0`, and `PORT=3001` inside the
     container.
   - Publish container port `3001` only to `127.0.0.1`.
   - Permit the host port to be supplied through a documented Compose
     interpolation variable.
   - Add no database URL or PostgreSQL dependency.

5. **Web service.**
   - Build from `apps/web/Dockerfile`.
   - Supply `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, and `PORT=3000` inside
     the container.
   - Publish container port `3000` only to `127.0.0.1`.
   - Permit the host port to be supplied through a documented Compose
     interpolation variable.

6. **Worker service.**
   - Build from `apps/worker/Dockerfile`.
   - Assign exactly one non-default profile named `worker`.
   - Do not start it in the default topology.
   - Do not add `restart: always`, an idle loop, polling, scheduling, queue
     behavior, or a command override.

7. **Environment example.**
   - Add `.env.example` as documentation for Compose interpolation names.
   - Use placeholders or explicitly non-secret local examples only.
   - Do not create or commit `.env`.
   - Acceptance validation supplies explicit process-environment values and
     does not depend on an untracked local `.env`.

8. **Migration boundary.**
   - Add no migration service.
   - Add no automatic `prisma migrate`, `prisma db push`, generation, or schema
     command to Compose.
   - Document that migrations remain explicit and currently do not exist.

9. **Topology acceptance evidence.**
   - Validate normalized Compose JSON.
   - Build all three application services through Compose.
   - Start PostgreSQL, API, and web as the default topology.
   - Wait with a bounded timeout.
   - Verify PostgreSQL health.
   - Verify exact existing API responses and web bootstrap content.
   - Verify API and web run as non-root.
   - Verify worker is absent by default.
   - Run worker only with the `worker` profile; verify non-root identity,
     required log, and exit `0`.
   - Verify bounded application shutdown and non-OOM exit.
   - Remove containers, network, and validation volume.

10. **Documentation and evidence.**
    - Update `README.md` with exact local Compose commands and limitations.
    - Update `docs/15_DEVELOPMENT_GUIDE.md` with the demonstrated topology and
      explicit migration boundary.
    - Generate `docs/sprints/SPRINT10_REPORT.md`.
    - Update `docs/PROJECT_STATE.md` only after every acceptance criterion
      passes.

## Out of Scope

- Any application source or test change.
- Any Dockerfile or Next.js configuration change.
- API or worker consumption of `@fas/database`.
- `DATABASE_URL` supplied to API, web, or worker at runtime.
- Database-aware `/health/ready`.
- Bootstrap schema-compatibility behavior.
- Prisma models, enums, migrations, seeds, or `db push`.
- Durable jobs, job tables, polling, queues, or a persistent worker loop.
- Correlation, structured logging, redaction, observability packages, or secret
  canary assertions.
- The full MF-13 deterministic runtime smoke contract.
- Full MF-10 closure: the Compose-profile portion is in scope, but the worker
  bootstrap signal-handling test remains deferred.
- A claim that MF-09, MF-11, MF-12, MF-13, or MF-15 is closed.
- GitHub Actions, Dependabot, dependency scanning, secret scanning, or image
  scanning.
- Turbo environment/cache policy changes.
- Redis, BullMQ, pgvector, object storage, or provider services.
- Public ingress or binding any published port to `0.0.0.0`.
- Publishing PostgreSQL to the host.
- Authentication, authorization, users, or public deployment.
- Image publication or base-image digest hardening.
- Canonical v0.1 domain persistence, durable-job, audit, idempotency, or
  append-only result work.
- AI provider, Prompt, Knowledge, Rule, Case, Review, Evaluation, Statistics,
  or Analysis Orchestrator implementation.
- Sprint 11 planning or implementation.

## Exact Implementation Allowlist

Only the following files may be created or modified during an authorized Sprint
10 implementation:

```text
compose.yaml
.env.example
README.md
docs/15_DEVELOPMENT_GUIDE.md
docs/PROJECT_STATE.md
docs/sprints/SPRINT10_REPORT.md
```

No other file may change.

In particular, implementation must not modify:

- `AGENTS.md`;
- `.gitignore`;
- `.dockerignore`;
- `.nvmrc`;
- `package.json`;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `turbo.json`;
- `vitest.config.ts`;
- `dependency-cruiser.config.cjs`;
- any application Dockerfile;
- `apps/web/next.config.ts`;
- any application source, test, manifest, or TypeScript configuration;
- any file under `packages/`;
- any numbered architecture document;
- any ADR;
- `docs/sprints/SPRINT10_PLANNING.md`;
- this specification after approval;
- any prior Sprint specification, review, approval, or report;
- any Sprint 11 artifact.

If implementation needs another file, it must stop and request a specification
revision. The allowlist must not be expanded inside implementation.

## Dependencies and Prerequisites

### Repository Prerequisites

- Sprint 9 report is tracked and records all image builds as passing.
- `docs/sprints/SPRINT10_PLANNING.md` is tracked.
- This specification is reviewed and tracked before implementation
  authorization.
- The worktree is clean at implementation start.
- Node.js `24.18.0` and pnpm `11.13.0` are active.
- Docker Engine and the Docker Compose plugin are available.

### Runtime Dependencies

Sprint 10 adds no npm or pnpm dependency and does not modify the lockfile.

It consumes:

- existing Sprint 9 API, worker, and web Dockerfiles;
- the existing Docker/Compose environment;
- `postgres:17-alpine`, already declared by the Implementation Plan;
- existing shell, `curl`, Git, Docker, and Node.js commands for acceptance.

The PostgreSQL image may be pulled by Docker during validation. No other
service image is authorized.

### Environment Contract

The Compose file must require or document:

```text
FAS_POSTGRES_DB
FAS_POSTGRES_USER
FAS_POSTGRES_PASSWORD
FAS_API_PUBLISHED_PORT
FAS_WEB_PUBLISHED_PORT
```

Acceptance uses explicit, non-production process values. `.env.example`
documents names and local placeholders but is not an acceptance input.

No value may be embedded in an image, committed `.env` file, application source,
or generated output.

## Acceptance Criteria

### Planning and Governance

- The tracked Sprint 10 planning document is the only Sprint planning
  authority.
- The implementation conforms to this specification without changing it.
- Every changed file is in the exact allowlist.
- No implementation begins before separate review and authorization.
- Milestone 3A and canonical v0.1 remain explicitly incomplete.

### Compose Structure

- `compose.yaml` defines exactly `postgres`, `api`, `web`, and `worker`.
- API, web, and worker use repository-root build contexts and their existing
  application-local Dockerfiles.
- No application command or entrypoint is overridden.
- PostgreSQL uses `postgres:17-alpine`.
- PostgreSQL has a bounded health check and one named data volume.
- PostgreSQL publishes no host port.
- All four services use one user-defined, project-owned, non-external network.
- No service uses an external network.
- API publishes only container port `3001` to host `127.0.0.1`.
- Web publishes only container port `3000` to host `127.0.0.1`.
- Worker has exactly the non-default `worker` profile and no published port.
- Worker has no restart loop or artificial persistence mechanism.
- No Redis, BullMQ, pgvector, object storage, migration, or provider service
  exists.

### Environment and Secret Boundary

- Compose interpolation names are documented in `.env.example`.
- `.env.example` contains exactly the five approved interpolation keys, each
  once, using only the approved local placeholder values.
- No operational secret or production credential is committed.
- Validation succeeds with explicit process-environment values and is
  independent of any local `.env`.
- API and web receive only their existing runtime listener configuration.
- API, web, and worker receive no database URL or PostgreSQL credential.
- Rendered configuration contains no host binding other than `127.0.0.1`.

### Default Topology Runtime

- Compose builds API, web, and worker from the existing Dockerfiles.
- Default startup runs PostgreSQL, API, and web only.
- Worker is absent when no profile is enabled.
- Startup reaches running/healthy state within the declared timeout.
- PostgreSQL reports `healthy`.
- API returns the exact existing bodies from:
  - `GET /`;
  - `GET /health/live`;
  - `GET /health/ready`;
  - `GET /version`.
- Web returns both existing bootstrap strings.
- API and web container processes run as non-root.
- API readiness is documented as configuration-only, not database-aware.

### Worker Profile Runtime

- `docker compose --profile worker` enables the worker service.
- Worker is run only through that explicit profile.
- Worker process runs as non-root.
- Worker logs `Worker started.`.
- Worker exits `0`.
- No fake loop, polling process, or restart policy keeps it alive.
- This satisfies only the Compose-profile portion of MF-10; MF-10 remains
  partially open pending worker bootstrap signal-handling test evidence.

### Shutdown and Cleanup

- API and web stop within ten seconds.
- Their stopped containers report `OOMKilled=false`.
- Exit `0` or signal-derived `143` is accepted, matching Sprint 9 evidence.
- Cleanup removes all validation containers, the project network, and the
  validation named volume.
- No repository-local generated Compose output remains.

### Repository Regression

- Exact Node.js and pnpm identity checks pass.
- Frozen installation passes.
- Root `pnpm validate` passes with the Sprint 8 non-secret
  `DATABASE_URL` process contract.
- `pnpm-lock.yaml` is unchanged.
- No application, package, Dockerfile, tooling configuration, architecture
  document, ADR, or prior Sprint artifact changes.

### Documentation

- README contains exact Compose setup, start, worker-profile, stop, and cleanup
  commands.
- Development Guide distinguishes demonstrated topology from deferred
  database-aware readiness and full runtime smoke.
- Documentation states that PostgreSQL is not host-published.
- Documentation states that no migration exists or runs automatically.
- Sprint report records exact commands, versions, outputs, failures,
  corrections, cleanup evidence, and remaining Must-Fix items.
- Project State is updated only after all criteria pass.

## Validation Commands

Run every command from the repository root. Use Node.js `24.18.0`, pnpm
`11.13.0`, a running Docker daemon, and a current Docker Compose plugin
supporting `config --format json`, profiles, `up --wait`, and
`--wait-timeout`.

### 1. Governance and Toolchain Baseline

Run this section before modifying any Sprint 10 implementation file.

```bash
set -eu

git ls-files --error-unmatch docs/sprints/SPRINT10_PLANNING.md
git ls-files --error-unmatch docs/sprints/SPRINT10_SPECIFICATION.md

INITIAL_STATUS="$(git status --porcelain=v1)"
test -z "$INITIAL_STATUS"

START_COMMIT_FILE="${TMPDIR:-/tmp}/fas-sprint10-start-commit"
git rev-parse HEAD >"$START_COMMIT_FILE"
test -s "$START_COMMIT_FILE"

node --version
pnpm --version
pnpm toolchain:check

docker version
docker info
docker compose version
```

Required result:

- planning and specification are tracked before implementation;
- implementation begins from a clean worktree;
- the exact starting commit is recorded outside the repository for the final
  integrity comparison;
- Node.js reports `v24.18.0`;
- pnpm reports `11.13.0`;
- Docker Engine and Compose are available.

### 2. Repository Regression

```bash
set -eu

pnpm install --frozen-lockfile

VALIDATION_DATABASE_URL="postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation"
DATABASE_URL="$VALIDATION_DATABASE_URL" pnpm validate
```

Required result: frozen installation and every existing repository validation
gate pass without a running PostgreSQL connection.

### 3. Rendered Compose Contract

```bash
set -eu

unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_ENV_FILES
export COMPOSE_PROJECT_NAME="fas-sprint10-validation"
export FAS_POSTGRES_DB="fas_validation"
export FAS_POSTGRES_USER="fas_validation"
export FAS_POSTGRES_PASSWORD="fas_validation_local_only"
export FAS_API_PUBLISHED_PORT="43001"
export FAS_WEB_PUBLISHED_PORT="43000"

compose() {
  docker compose --file compose.yaml --env-file /dev/null "$@"
}

DEFAULT_CONFIG_JSON="$(
  mktemp "${TMPDIR:-/tmp}/fas-sprint10-compose-default.XXXXXX.json"
)"
PROFILED_CONFIG_JSON="$(
  mktemp "${TMPDIR:-/tmp}/fas-sprint10-compose-profiled.XXXXXX.json"
)"

cleanup_config() {
  rm -f "$DEFAULT_CONFIG_JSON" "$PROFILED_CONFIG_JSON"
}
trap cleanup_config EXIT INT TERM

test -f .env.example
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const expected = new Map([
  ["FAS_POSTGRES_DB", "fas_local"],
  ["FAS_POSTGRES_USER", "fas_local"],
  ["FAS_POSTGRES_PASSWORD", "change_me_local_only"],
  ["FAS_API_PUBLISHED_PORT", "3001"],
  ["FAS_WEB_PUBLISHED_PORT", "3000"],
]);

const entries = readFileSync(".env.example", "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"))
  .map((line) => {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      throw new Error(`Invalid .env.example line: ${line}`);
    }
    return [line.slice(0, separator), line.slice(separator + 1)];
  });

if (entries.length !== expected.size) {
  throw new Error(".env.example must contain exactly the five approved keys");
}

const seen = new Set();
for (const [key, value] of entries) {
  if (seen.has(key)) {
    throw new Error(`Duplicate .env.example key: ${key}`);
  }
  seen.add(key);
  if (!expected.has(key)) {
    throw new Error(`Unexpected .env.example key: ${key}`);
  }
  if (expected.get(key) !== value) {
    throw new Error(`Unexpected local placeholder for ${key}`);
  }
}
NODE

compose config --quiet
compose config --format json >"$DEFAULT_CONFIG_JSON"
compose --profile worker config --quiet
compose --profile worker config --format json >"$PROFILED_CONFIG_JSON"

node --input-type=module \
  - "$DEFAULT_CONFIG_JSON" "$PROFILED_CONFIG_JSON" <<'NODE'
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const defaultConfig = JSON.parse(readFileSync(process.argv[2], "utf8"));
const config = JSON.parse(readFileSync(process.argv[3], "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const expectedDefaultServices = ["api", "postgres", "web"];
const actualDefaultServices = Object.keys(defaultConfig.services ?? {}).sort();
assert(
  JSON.stringify(actualDefaultServices) ===
    JSON.stringify(expectedDefaultServices),
  `Unexpected default services: ${actualDefaultServices.join(", ")}`,
);

const expectedServices = ["api", "postgres", "web", "worker"];
const actualServices = Object.keys(config.services ?? {}).sort();
assert(
  JSON.stringify(actualServices) === JSON.stringify(expectedServices),
  `Unexpected worker-profile services: ${actualServices.join(", ")}`,
);

const { api, postgres, web, worker } = config.services;
const root = process.cwd();

function assertBuild(service, dockerfile) {
  assert(service.build, `${dockerfile} service has no build definition`);
  assert(
    resolve(service.build.context) === root,
    `${dockerfile} does not use the repository-root context`,
  );
  assert(
    service.build.dockerfile === dockerfile ||
      service.build.dockerfile.endsWith(`/${dockerfile}`),
    `Unexpected Dockerfile: ${service.build.dockerfile}`,
  );
}

assertBuild(api, "apps/api/Dockerfile");
assertBuild(web, "apps/web/Dockerfile");
assertBuild(worker, "apps/worker/Dockerfile");

assert(postgres.image === "postgres:17-alpine", "Unexpected PostgreSQL image");
assert(postgres.healthcheck, "PostgreSQL health check is missing");
assert(
  Array.isArray(postgres.healthcheck.test) &&
    postgres.healthcheck.test.length > 0,
  "PostgreSQL health-check command is missing",
);
const healthCommand = JSON.stringify(postgres.healthcheck.test).toLowerCase();
assert(
  healthCommand.includes("pg_isready"),
  "PostgreSQL health check must invoke pg_isready",
);
assert(
  healthCommand.includes("postgres_user") &&
    healthCommand.includes("postgres_db"),
  "pg_isready must use the configured PostgreSQL user and database",
);

function durationMs(value, name) {
  if (typeof value === "number") {
    assert(value > 0, `${name} must be positive`);
    return value / 1_000_000;
  }
  assert(typeof value === "string", `${name} is missing`);
  const match = value.match(/^(\d+(?:\.\d+)?)(ns|us|ms|s|m)$/);
  assert(match, `${name} has an unsupported duration: ${value}`);
  const amount = Number(match[1]);
  const factors = {
    ns: 0.000001,
    us: 0.001,
    ms: 1,
    s: 1_000,
    m: 60_000,
  };
  return amount * factors[match[2]];
}

const intervalMs = durationMs(postgres.healthcheck.interval, "health interval");
const timeoutMs = durationMs(postgres.healthcheck.timeout, "health timeout");
const startPeriodMs = durationMs(
  postgres.healthcheck.start_period,
  "health start period",
);
assert(intervalMs <= 60_000, "PostgreSQL health interval is not bounded");
assert(timeoutMs <= 30_000, "PostgreSQL health timeout is not bounded");
assert(startPeriodMs <= 120_000, "PostgreSQL start period is not bounded");
assert(
  Number(postgres.healthcheck.retries) > 0 &&
    Number(postgres.healthcheck.retries) <= 60,
  "PostgreSQL health-check retries are not bounded",
);
assert(
  !postgres.ports || postgres.ports.length === 0,
  "PostgreSQL must not publish a host port",
);
assert(
  Array.isArray(worker.profiles) &&
    worker.profiles.length === 1 &&
    worker.profiles[0] === "worker",
  "Worker must use exactly the non-default worker profile",
);
assert(
  !worker.ports || worker.ports.length === 0,
  "Worker must not publish a port",
);
assert(
  !worker.restart || worker.restart === "no",
  "Worker must not use an automatic restart policy",
);

for (const [name, service] of Object.entries({ api, web, worker })) {
  assert(!service.command, `${name} must not override the image command`);
  assert(!service.entrypoint, `${name} must not override the image entrypoint`);
  assert(
    !service.depends_on || Object.keys(service.depends_on).length === 0,
    `${name} must not claim a database startup dependency`,
  );
}

function assertLoopbackPort(service, target, published) {
  assert(
    Array.isArray(service.ports) && service.ports.length === 1,
    `Expected one published port for ${target}`,
  );
  const port = service.ports[0];
  assert(port.host_ip === "127.0.0.1", `Port ${target} is not loopback-only`);
  assert(Number(port.target) === target, `Unexpected target port ${port.target}`);
  assert(
    String(port.published) === published,
    `Unexpected published port ${port.published}`,
  );
}

assertLoopbackPort(api, 3001, "43001");
assertLoopbackPort(web, 3000, "43000");

assert(
  Object.keys(config.networks ?? {}).length === 1,
  "Expected exactly one network",
);
const network = Object.values(config.networks)[0];
assert(network.external !== true, "Application network must not be external");

for (const [name, service] of Object.entries(config.services)) {
  assert(
    Object.keys(service.networks ?? {}).length === 1,
    `${name} must use exactly one network`,
  );
}

assert(
  Object.keys(config.volumes ?? {}).length === 1,
  "Expected exactly one named volume",
);
assert(
  Array.isArray(postgres.volumes) &&
    postgres.volumes.some(
      (mount) =>
        mount.type === "volume" &&
        mount.target === "/var/lib/postgresql/data",
    ),
  "PostgreSQL named data-volume mount is missing",
);

function assertEnvironmentKeys(name, service, expectedKeys) {
  const environment = service.environment ?? {};
  assert(
    JSON.stringify(Object.keys(environment).sort()) ===
      JSON.stringify([...expectedKeys].sort()),
    `${name} received unexpected environment keys: ${Object.keys(environment).join(", ")}`,
  );
}

assertEnvironmentKeys("api", api, ["HOST", "NODE_ENV", "PORT"]);
assertEnvironmentKeys("web", web, ["HOSTNAME", "NODE_ENV", "PORT"]);
assertEnvironmentKeys("worker", worker, []);

const postgresEnvironment = postgres.environment ?? {};
for (const key of ["POSTGRES_DB", "POSTGRES_PASSWORD", "POSTGRES_USER"]) {
  assert(key in postgresEnvironment, `PostgreSQL environment is missing ${key}`);
}

const rendered = JSON.stringify(config.services).toLowerCase();
for (const forbidden of [
  "prisma migrate",
  "prisma db push",
  "bullmq",
  "redis",
  "pgvector",
]) {
  assert(!rendered.includes(forbidden), `Forbidden content found: ${forbidden}`);
}
NODE

cleanup_config
trap - EXIT INT TERM
test ! -e "$DEFAULT_CONFIG_JSON"
test ! -e "$PROFILED_CONFIG_JSON"
```

Required result:

- default normalized configuration contains exactly `api`, `postgres`, and
  `web`;
- worker-profile normalized configuration contains exactly `api`, `postgres`,
  `web`, and `worker`;
- the two configurations prove the exact topology, private network, profile,
  volume, build ownership, loopback bindings, PostgreSQL non-publication, exact
  `pg_isready` health contract, migration/database-consumer boundaries, and the
  exact `.env.example` contract;
- explicit `--file` and `--env-file` arguments make this evidence independent
  of an ignored local `.env` or alternate Compose-file selection.

### 4. Compose Build and Runtime Evidence

```bash
set -eu

unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_ENV_FILES
export COMPOSE_PROJECT_NAME="fas-sprint10-validation"
export FAS_POSTGRES_DB="fas_validation"
export FAS_POSTGRES_USER="fas_validation"
export FAS_POSTGRES_PASSWORD="fas_validation_local_only"
export FAS_API_PUBLISHED_PORT="43001"
export FAS_WEB_PUBLISHED_PORT="43000"

compose() {
  docker compose --file compose.yaml --env-file /dev/null "$@"
}

WORKER_CONTAINER="fas-sprint10-worker-validation"
WORKER_LOG="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-worker.XXXXXX.log")"
PS_JSON="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-ps.XXXXXX.json")"

cleanup_runtime() {
  docker rm -f "$WORKER_CONTAINER" >/dev/null 2>&1 || true
  compose --profile worker down \
    --volumes \
    --remove-orphans \
    --timeout 10 \
    >/dev/null 2>&1 || true
  rm -f "$WORKER_LOG" "$PS_JSON"
}
trap cleanup_runtime EXIT INT TERM
cleanup_runtime

WORKER_LOG="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-worker.XXXXXX.log")"
PS_JSON="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-ps.XXXXXX.json")"

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

compose --profile worker build api web worker
compose up \
  --detach \
  --wait \
  --wait-timeout 120

POSTGRES_ID="$(compose ps --quiet postgres)"
API_ID="$(compose ps --quiet api)"
WEB_ID="$(compose ps --quiet web)"

test -n "$POSTGRES_ID"
test -n "$API_ID"
test -n "$WEB_ID"
test "$(docker inspect -f '{{.State.Health.Status}}' "$POSTGRES_ID")" = "healthy"

wait_for_http "http://127.0.0.1:$FAS_API_PUBLISHED_PORT/health/live"
wait_for_http "http://127.0.0.1:$FAS_WEB_PUBLISHED_PORT/"

assert_exact_body \
  "http://127.0.0.1:$FAS_API_PUBLISHED_PORT/" \
  '{"name":"AI Football Analysis Platform","status":"Repository Bootstrap Completed"}'
assert_exact_body \
  "http://127.0.0.1:$FAS_API_PUBLISHED_PORT/health/live" \
  '{"status":"ok"}'
assert_exact_body \
  "http://127.0.0.1:$FAS_API_PUBLISHED_PORT/health/ready" \
  '{"status":"ready"}'
assert_exact_body \
  "http://127.0.0.1:$FAS_API_PUBLISHED_PORT/version" \
  '{"name":"@fas/api","version":"0.0.0"}'

web_body="$(curl -fsS --max-time 2 \
  "http://127.0.0.1:$FAS_WEB_PUBLISHED_PORT/")"
case "$web_body" in
  *"AI Football Analysis Platform"*"Repository Bootstrap Completed"*) ;;
  *)
    echo "Unexpected web response" >&2
    exit 1
    ;;
esac

compose ps --format json >"$PS_JSON"
node --input-type=module - "$PS_JSON" <<'NODE'
import { readFileSync } from "node:fs";

const text = readFileSync(process.argv[2], "utf8").trim();
const rows = text.startsWith("[")
  ? JSON.parse(text)
  : text.split("\n").filter(Boolean).map((line) => JSON.parse(line));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const names = rows.map((row) => row.Service).sort();
assert(
  JSON.stringify(names) === JSON.stringify(["api", "postgres", "web"]),
  `Unexpected default services: ${names.join(", ")}`,
);

const postgres = rows.find((row) => row.Service === "postgres");
const api = rows.find((row) => row.Service === "api");
const web = rows.find((row) => row.Service === "web");

assert(postgres.Health === "healthy", "PostgreSQL is not healthy");
const postgresPublishedHostPorts = (postgres.Publishers ?? []).filter(
  (entry) => Number(entry.PublishedPort) > 0,
);
assert(
  postgresPublishedHostPorts.length === 0,
  "PostgreSQL publishes a host port",
);

for (const [service, target, published] of [
  [api, 3001, 43001],
  [web, 3000, 43000],
]) {
  assert(service.State === "running", `${service.Service} is not running`);
  const publisher = (service.Publishers ?? []).find(
    (entry) => Number(entry.TargetPort) === target,
  );
  assert(publisher, `${service.Service} publisher is missing`);
  assert(publisher.URL === "127.0.0.1", `${service.Service} is not loopback-only`);
  assert(
    Number(publisher.PublishedPort) === published,
    `${service.Service} published port is unexpected`,
  );
}
NODE

test "$(compose exec -T api id -u)" -ne 0
test "$(compose exec -T web id -u)" -ne 0

NETWORK_IDS="$(
  docker network ls \
    --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" \
    --quiet
)"
test -n "$NETWORK_IDS"

VOLUME_IDS="$(
  docker volume ls \
    --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" \
    --quiet
)"
test -n "$VOLUME_IDS"

worker_identity="$(
  compose --profile worker run \
    --rm \
    --entrypoint id \
    worker
)"
case "$worker_identity" in
  *"uid=0(root)"*)
    echo "Worker runs as root: $worker_identity" >&2
    exit 1
    ;;
esac

if compose --profile worker run \
  --rm \
  --name "$WORKER_CONTAINER" \
  worker >"$WORKER_LOG" 2>&1; then
  worker_exit=0
else
  worker_exit=$?
fi
test "$worker_exit" -eq 0

worker_output="$(<"$WORKER_LOG")"
case "$worker_output" in
  *"Worker started."*) ;;
  *)
    echo "Worker startup log was not observed" >&2
    exit 1
    ;;
esac

compose stop --timeout 10 api web

for container_id in "$API_ID" "$WEB_ID"; do
  exit_code="$(docker inspect -f '{{.State.ExitCode}}' "$container_id")"
  oom_killed="$(docker inspect -f '{{.State.OOMKilled}}' "$container_id")"
  test "$oom_killed" = "false"
  test "$exit_code" -eq 0 || test "$exit_code" -eq 143
done

cleanup_runtime
trap - EXIT INT TERM

test -z "$(
  docker ps --all \
    --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" \
    --quiet
)"
test -z "$(
  docker network ls \
    --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" \
    --quiet
)"
test -z "$(
  docker volume ls \
    --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" \
    --quiet
)"
```

Required result:

- all three application services build through Compose;
- default topology contains only PostgreSQL, API, and web;
- PostgreSQL becomes healthy without a host-published port;
- API and web return their exact current behavior over loopback-only ports;
- API and web run as non-root;
- the project-owned runtime network exists and is removed during cleanup;
- the named validation volume exists while the topology runs;
- worker requires the explicit profile, runs as non-root, logs the required
  message, and exits `0`;
- API and web stop within ten seconds without OOM termination;
- cleanup removes containers, network, volume, and temporary files.

### 5. Final Integrity Review

```bash
set -eu

START_COMMIT_FILE="${TMPDIR:-/tmp}/fas-sprint10-start-commit"
test -s "$START_COMMIT_FILE"
SPRINT10_START_COMMIT="$(<"$START_COMMIT_FILE")"
git cat-file -e "$SPRINT10_START_COMMIT^{commit}"
git merge-base --is-ancestor "$SPRINT10_START_COMMIT" HEAD

git status --short
git diff --check
git diff --exit-code -- pnpm-lock.yaml
git diff --exit-code "$SPRINT10_START_COMMIT"...HEAD -- pnpm-lock.yaml
test ! -e out

STATUS_FILE="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-status.XXXXXX")"
COMMITTED_FILE="$(mktemp "${TMPDIR:-/tmp}/fas-sprint10-committed.XXXXXX")"
cleanup_status() {
  rm -f "$STATUS_FILE" "$COMMITTED_FILE" "$START_COMMIT_FILE"
}
trap cleanup_status EXIT INT TERM

git status --porcelain=v1 >"$STATUS_FILE"
git diff --name-only "$SPRINT10_START_COMMIT"...HEAD >"$COMMITTED_FILE"

node --input-type=module - "$STATUS_FILE" "$COMMITTED_FILE" <<'NODE'
import { readFileSync } from "node:fs";

const allowed = new Set([
  "compose.yaml",
  ".env.example",
  "README.md",
  "docs/15_DEVELOPMENT_GUIDE.md",
  "docs/PROJECT_STATE.md",
  "docs/sprints/SPRINT10_REPORT.md",
]);

const statusPaths = readFileSync(process.argv[2], "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3));
const committedPaths = readFileSync(process.argv[3], "utf8")
  .split("\n")
  .filter(Boolean);

for (const path of new Set([...statusPaths, ...committedPaths])) {
  if (!allowed.has(path)) {
    throw new Error(`File outside Sprint 10 allowlist: ${path}`);
  }
}
NODE

cleanup_status
trap - EXIT INT TERM
test ! -e "$STATUS_FILE"
test ! -e "$COMMITTED_FILE"
test ! -e "$START_COMMIT_FILE"
```

Required result:

- only allowlisted files changed;
- both committed and uncommitted changes are compared with the recorded clean
  starting commit;
- no whitespace error exists;
- lockfile is unchanged;
- no repository-local prune or Compose output remains.

## Risks and Mitigations

### Compose Becomes a Parallel Architecture Authority

Risk: service definitions introduce application dependencies, runtime commands,
or topology decisions not approved by the planning record.

Mitigation: Compose may assemble only the four specified services and may not
override application commands or add a database consumer. Any additional need
stops implementation.

### False Database-readiness Claim

Risk: a healthy PostgreSQL container is mistaken for database-aware API
readiness.

Mitigation: acceptance explicitly preserves the current
configuration-only `/health/ready` behavior and records MF-11 as open.

### Worker Persistence Simulation

Risk: Compose restart policy or a shell loop keeps the empty worker alive to
look operational.

Mitigation: worker is opt-in, retains its existing command, exits `0`, and has
no artificial loop or automatic restart.

### Public Host Exposure

Risk: short port syntax or an omitted host IP publishes API, web, or PostgreSQL
on all interfaces.

Mitigation: normalized JSON and running publisher data must both report
`127.0.0.1` for API and web; PostgreSQL must report no published host port
(`PublishedPort > 0`). Image `EXPOSE` metadata with `PublishedPort: 0` is not
host port publication.

### Credential Leakage

Risk: local PostgreSQL credentials are committed or passed into unrelated
application services.

Mitigation: Compose interpolation uses explicit process values during
acceptance; `.env.example` contains only placeholders or local examples; the
rendered contract proves applications receive no PostgreSQL credential.

### Hidden Migration Behavior

Risk: topology startup quietly runs a migration or `db push`, inventing schema
state outside an approved persistence sprint.

Mitigation: no migration service or command is allowed, and rendered
configuration is checked for forbidden schema commands.

### Port Collision

Risk: fixed host ports are already in use and create an ambiguous startup
failure.

Mitigation: acceptance uses dedicated validation ports `43001` and `43000` and
records the exact conflict if they are unavailable. Do not weaken loopback
binding or kill unrelated processes.

### Cleanup Failure

Risk: interrupted validation leaves containers, networks, or local database
volumes.

Mitigation: deterministic project naming and an EXIT/INT/TERM trap run
profile-aware `down --volumes --remove-orphans`.

### Scope Expansion into Full Runtime Acceptance

Risk: working Compose topology leads directly to database integration,
correlation, MF-13 smoke, CI, or security scanning.

Mitigation: those capabilities remain explicit non-goals and require separate
specifications and authorization.

## Stop and Escalation Conditions

Implementation must stop immediately if:

- any required change falls outside the exact allowlist;
- an application source, test, package, Dockerfile, or lockfile change appears
  necessary;
- PostgreSQL requires a different image baseline;
- API, web, or worker requires a command override to run in Compose;
- worker requires an artificial loop or restart policy;
- PostgreSQL must be published to the host;
- an application must receive `DATABASE_URL` or a PostgreSQL credential;
- a model, migration, seed, or schema command appears necessary;
- a public/non-loopback application binding appears necessary;
- a second network, external network, or additional service appears necessary;
- a new npm/pnpm dependency or workspace package appears necessary;
- the topology cannot clean up its containers, network, and validation volume;
- implementation would need to decide database-aware readiness, correlation,
  redaction, cache policy, CI, or security architecture.

When stopped, record:

- exact command;
- exit status;
- relevant output;
- affected files and resources;
- required specification or architecture decision.

Do not expand the allowlist or weaken an assertion during implementation.

## Stop Boundary

Sprint 10 stops when:

- the exact four-service Compose topology is implemented;
- PostgreSQL health and named-volume ownership are proven;
- all services use the one private network;
- API and web bindings are proven loopback-only;
- PostgreSQL is proven not host-published;
- worker is proven absent by default and functional only through its explicit
  profile;
- existing API, web, and worker behavior passes through Compose;
- application services are non-root;
- bounded shutdown and complete resource cleanup pass;
- root repository validation passes;
- only allowlisted files changed;
- `docs/sprints/SPRINT10_REPORT.md` is generated;
- `docs/PROJECT_STATE.md` is updated.

After reaching this boundary:

- do not connect API or worker to PostgreSQL;
- do not change readiness behavior;
- do not add application tests or observability;
- do not implement the full MF-13 smoke workflow;
- do not modify Turbo cache/environment policy;
- do not add CI, Dependabot, or scans;
- do not add migrations, durable jobs, domain persistence, or engine code;
- do not claim Milestone 3A or canonical v0.1 completion;
- do not plan or implement Sprint 11;
- stop and wait for review.

## Deliverables

An authorized Sprint 10 implementation must deliver:

1. `compose.yaml` with the exact PostgreSQL, API, web, and profiled-worker
   topology.
2. `.env.example` documenting Compose interpolation variables without
   operational secrets.
3. Rendered configuration evidence for services, builds, network, volume,
   profile, bindings, environment boundaries, and migration exclusions.
4. Compose build evidence for API, web, and worker.
5. Runtime evidence for PostgreSQL health, exact API/web behavior, non-root
   application identities, worker-profile behavior, bounded shutdown, and full
   cleanup.
6. Updated `README.md`.
7. Updated `docs/15_DEVELOPMENT_GUIDE.md`.
8. `docs/sprints/SPRINT10_REPORT.md`.
9. Updated `docs/PROJECT_STATE.md`, only after every acceptance criterion
   passes.

## Sprint Completion Definition

Sprint 10 is complete only when:

1. every changed file is in the exact allowlist;
2. all repository, Docker, and Compose prerequisites are recorded;
3. normalized Compose configuration satisfies every structural assertion;
4. PostgreSQL, API, and web start as the default topology within the bounded
   timeout;
5. PostgreSQL is healthy and not host-published;
6. API and web are loopback-only, non-root, and return their exact existing
   behavior;
7. worker is absent by default, requires the `worker` profile, runs as
   non-root, logs `Worker started.`, and exits `0`;
8. no application receives PostgreSQL configuration or becomes a database
   consumer;
9. no model, migration, seed, migration service, or automatic schema command
   exists;
10. shutdown and cleanup leave no validation container, network, volume, or
    temporary output;
11. frozen installation and root `pnpm validate` pass;
12. no application, package, Dockerfile, lockfile, tooling configuration,
    architecture document, ADR, or prior Sprint artifact changes;
13. README and Development Guide describe only demonstrated behavior;
14. Sprint report records exact evidence, corrections, remaining work, and the
    narrow release claim;
15. Project State is updated only after all criteria pass;
16. MF-09, MF-11, MF-12, MF-13, and MF-15 remain explicitly open;
17. MF-10 remains partially open: Sprint 10 may report only its Compose-profile
    portion satisfied, while worker bootstrap signal-handling test evidence
    remains deferred; MF-14 may be reported satisfied only if both rendered and
    running binding evidence pass;
18. Milestone 3A and canonical product v0.1 remain incomplete;
19. work stops before database-aware readiness, full runtime smoke, CI,
    security automation, or Sprint 11.

## Sprint 10: SPECIFICATION ONLY

This document does not authorize implementation.

No implementation file, architecture document, ADR, or
`docs/PROJECT_STATE.md` file was modified while producing this specification.

Implementation may begin only after:

1. this specification is independently reviewed against the planning and
   governing documents;
2. every blocking review issue is resolved;
3. the final specification is tracked; and
4. separate explicit implementation authorization references the approved
   specification.

Stop after specification generation. Do not implement Sprint 10.
