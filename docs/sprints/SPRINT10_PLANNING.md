# Sprint 10 Planning — Canonical Next-Sprint Analysis

## 1. Planning Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Canonical roadmap alignment: v0.1 / M1 Foundation bootstrap
- Planning basis:
  - `docs/PROJECT_STATE.md`
  - `docs/20_IMPLEMENTATION_PLAN.md`
  - `docs/21_ARCHITECTURE_SIGNOFF.md`
  - `docs/sprints/SPRINT9_REPORT.md`
- Last completed sprint: Sprint 9 — Container Image Packaging Foundation
- Planning status: Recommendation only
- Implementation authorization: Not granted

This document determines the canonical next sprint from the current evidence. It
does not specify an implementation allowlist, approve dependencies, authorize
repository changes, or replace a Sprint 10 specification and implementation
gate.

The repository release label `v0.1.9` is treated as a delivery version for the
completed Sprint 9 baseline. It does not override the governing records:
Milestone 3A remains incomplete, and canonical product v0.1 remains incomplete.
No release label may be interpreted as closing acceptance conditions that have
not produced their required evidence.

## 2. Current Baseline

Sprint 9 established three independently buildable, non-root container images:

- API, worker, and web images build from repository-root contexts;
- target-specific Turbo-prune graphs include only required workspaces;
- API and worker use production-only dependency installations;
- web uses Next.js standalone output;
- API and web preserve existing bootstrap behavior;
- worker logs `Worker started.` and exits successfully;
- no image consumes `@fas/database` or requires PostgreSQL;
- no Compose topology, database-aware readiness, integrated runtime smoke, CI,
  or security scan is implemented.

This means the image-packaging prerequisite is complete, but integrated
repository-bootstrap runtime acceptance is not.

## 3. Remaining Open Must-Fix Items

### 3.1 Closed or Satisfied for the Current Baseline

The following Architecture Sign-off Must-Fix items have sufficient evidence for
their implemented scope:

- **MF-01 — Prisma Generation Dependency Graph:** closed by first-class
  generation tasks and generated-output dependencies.
- **MF-02 — Prisma No-model Bootstrap Contract:** closed by explicit Prisma
  configuration, default no-model generation, and controlled
  `--require-models` rejection.
- **MF-03 — Vitest 4 Configuration:** satisfied for every currently implemented
  test project through root `test.projects`. Application test coverage remains
  a separate acceptance gap.
- **MF-04 — Exact Dependency Baseline:** satisfied for currently installed
  dependencies. Future direct dependencies still require exact pins.
- **MF-05 — Runtime and Package-manager Enforcement:** closed by native pnpm
  rejection and repository-owned enforcement tests.
- **MF-06 — TypeScript, ESM, NestJS, Prisma, and Next Compatibility:** closed
  for the current applications and container runtime.
- **MF-07 — Next.js Generated Types:** closed through reproducible type
  generation and ignored framework output.
- **MF-08 — Docker Build and Packaging Strategy:** closed by the approved
  Turbo-prune strategy and Sprint 9 build evidence.
- **MF-16 — Package Names and Export Maps:** satisfied for all currently
  implemented workspace packages.
- **MF-17 — Automated Boundary Failure Proof:** closed by controlled
  dependency-cruiser negative tests.
- **MF-18 — Husky Environment Behavior:** satisfied for local and container
  installation behavior. CI authority remains dependent on the future CI
  implementation.

### 3.2 Open or Partially Open

The following items remain material to Milestone 3A completion:

- **MF-09 — Executable Container Acceptance: Open.**
  - Sprint 9 proved independent image behavior.
  - No approved Compose profile has been started or shut down as an integrated
    topology.
  - Compose-level API, web, worker-profile, and PostgreSQL evidence is absent.

- **MF-10 — Worker Lifecycle: Open.**
  - Independent worker startup and successful exit are proven.
  - The required explicit non-default Compose profile does not exist.
  - No artificial persistence loop is authorized.

- **MF-11 — Operational API Contract: Partially open.**
  - `/health/live`, `/health/ready`, and `/version` exist.
  - Readiness validates configuration only.
  - Database connectivity and explicit bootstrap schema-compatibility state
    are not represented.

- **MF-12 — Turbo Environment and Cache Policy: Partially open.**
  - Current Prisma generation receives its declared process environment.
  - A complete classification of build-affecting public variables, runtime
    pass-through values, secrets, ignored local files, and uncached tasks has
    not been accepted.

- **MF-13 — Deterministic Runtime Smoke Contract: Open.**
  - Sprint 9 used deterministic image-level checks.
  - There is no single repository-owned workflow for Compose startup,
    readiness down/up transitions, correlation, redaction canaries, worker
    profile behavior, timeouts, and cleanup.

- **MF-14 — Host Exposure: Open.**
  - Sprint 9 manual checks published API and web ports to `127.0.0.1`.
  - No rendered Compose configuration proves loopback-only application
    bindings and non-public PostgreSQL exposure.

- **MF-15 — Baseline Security Gates: Open.**
  - No authoritative CI, dependency scan, committed-secret scan, or built-image
    vulnerability scan exists.

The repository also lacks the application-level API health tests and worker
bootstrap tests anticipated by the Implementation Plan. Structured correlation
and redaction evidence is likewise still absent.

## 4. Remaining Roadmap Steps

### 4.1 Milestone 3A Bootstrap Order

Steps 1 through 7 are complete for their approved scope. Step 8 is only
partially complete.

The remaining work is:

1. **Complete Step 8 — Containers.**
   - add the approved local PostgreSQL service;
   - add persistent local storage and a health check;
   - assemble API and web services on a private Compose network;
   - place worker behind an explicit non-default profile;
   - define loopback-only host exposure;
   - preserve explicit migration execution;
   - later integrate database-aware service readiness.

2. **Complete operational runtime acceptance.**
   - add justified API and worker application tests;
   - implement database-aware readiness when database consumption is
     authorized;
   - implement correlation and redaction contracts;
   - create one deterministic integrated smoke workflow;
   - close MF-09 through MF-14 with executable evidence.

3. **Complete Step 9 — GitHub Actions and security gates.**
   - install from the frozen lockfile;
   - run generation, quality, boundaries, typecheck, tests, and build;
   - validate the Compose configuration and runtime workflow;
   - pin Actions immutably;
   - configure Dependabot;
   - add actionable high/critical dependency, secret, and image checks.

4. **Complete Step 10 — Documentation and final verification.**
   - validate from a clean clone and clean cache;
   - reconcile commands and repository state;
   - collect required completion evidence;
   - perform the Milestone 3A completion review.

### 4.2 Work After Milestone 3A

Only after repository bootstrap is complete should the project proceed into the
remaining canonical v0.1 Foundation work:

- PostgreSQL durable jobs under ADR-002;
- audit and idempotency foundations;
- approved domain schema and migrations;
- append-only match-result versions under ADR-004;
- backup, restore, and operational baselines.

Prompt/provider work belongs to v0.2. No AI engine implementation is a valid
Sprint 10 candidate.

## 5. Candidate Sprint 10 Themes

### Candidate A — Local Compose Topology Foundation

Create the minimal integrated local topology around the images proven in Sprint
9:

- PostgreSQL with health check and persistent local volume;
- private Compose networking;
- API and web service definitions;
- explicit non-default worker profile;
- loopback-only application port publication;
- non-public PostgreSQL exposure;
- bounded topology configuration and startup validation.

This candidate completes the next structural portion of Implementation Plan
Step 8 without pretending that database-aware readiness or full runtime
acceptance already exists.

### Candidate B — Database-aware Readiness

Connect the API to the database package and make `/health/ready` represent
database connectivity and bootstrap schema compatibility.

This is necessary, but premature as the immediate next sprint. It requires a
stable PostgreSQL runtime topology, an approved application-to-database
composition contract, configuration expansion, failure semantics, and tests.
Implementing it first would force those concerns into one application change
without the surrounding runtime boundary.

### Candidate C — Deterministic Runtime Smoke

Implement the complete MF-13 workflow, including readiness transitions,
correlation propagation, secret canaries, worker profile behavior, and cleanup.

This cannot be authoritative before Compose topology, database-aware readiness,
correlation, and redaction behavior exist. Implementing it now would either
weaken required assertions or create temporary test logic that must be replaced.

### Candidate D — Turbo Environment and Cache Policy

Complete MF-12 before other runtime work.

This can be developed independently, but it is not the strongest critical-path
choice. The complete variable classification depends on the final Compose,
readiness, and CI inputs. Addressing it after those contracts are explicit
reduces speculative cache configuration.

### Candidate E — CI and Baseline Security Gates

Implement GitHub Actions, Dependabot, and security/image scanning.

CI is required, but encoding incomplete runtime and Compose commands now would
create a moving automation target. CI should make the accepted local workflow
authoritative, not become the place where that workflow is designed.

### Candidate F — Canonical v0.1 Persistence or Durable Jobs

Begin domain migrations, durable PostgreSQL jobs, audit/idempotency, or
append-only result persistence.

This is not a valid Sprint 10 theme. It crosses the Milestone 3A stop boundary,
introduces business/persistence contracts before bootstrap closure, and requires
separate canonical design and implementation authorization.

## 6. Dependency Analysis

### 6.1 Recommended Critical Path

The evidence-supported order is:

1. Sprint 9 target images;
2. local Compose and PostgreSQL topology;
3. database-aware readiness plus correlation/redaction contracts;
4. deterministic integrated runtime acceptance;
5. CI and baseline security automation;
6. clean-clone final verification and Milestone 3A review.

Each step supplies stable inputs to the next.

### 6.2 Inputs Already Available

The recommended Sprint 10 theme can consume:

- the three validated Sprint 9 Dockerfiles;
- exact Node.js, pnpm, Turbo, framework, Prisma, and PostgreSQL-driver pins;
- the no-model database package;
- current API operational endpoints;
- current server-side configuration validation;
- the existing worker's intentionally non-persistent lifecycle;
- existing Docker runtime and non-root evidence.

### 6.3 Capabilities Enabled

A minimal Compose topology would enable later work to:

- exercise application images on one private network;
- observe PostgreSQL health and failure transitions;
- implement database-aware readiness against a stable service name;
- validate the non-default worker profile;
- inspect rendered host bindings;
- build the single MF-13 runtime workflow;
- give CI one reproducible local acceptance contract.

### 6.4 Capabilities Not Required Yet

The recommended topology does not require:

- Prisma models or migrations;
- an application import of `@fas/database`;
- durable job polling;
- a persistent worker loop;
- domain or engine packages;
- Redis, BullMQ, pgvector, or object storage;
- public ingress;
- authentication;
- image publication.

## 7. Recommended Sprint 10 Scope

### 7.1 Theme

**Local Compose Topology Foundation**

### 7.2 Goal

Create the minimal private local Compose topology needed to turn Sprint 9's
independent images into a stable foundation for later database-aware and
integrated runtime acceptance.

### 7.3 Recommended Inclusions

- a root-owned Compose definition;
- PostgreSQL using the already approved major-version baseline;
- a PostgreSQL health check and named local volume;
- one private application network;
- API and web services built from the existing Sprint 9 Dockerfiles;
- an explicit non-default worker profile with no artificial idle behavior;
- loopback-only API and web published ports;
- PostgreSQL unexposed to non-container hosts unless a separately justified
  local-development binding is approved;
- environment values supplied without committed secrets;
- explicit migration behavior that does not invent or auto-run migrations;
- deterministic `docker compose config`, startup, health, profile, binding,
  shutdown, and cleanup evidence;
- documentation limited to the demonstrated topology.

### 7.4 Recommended Exclusions

- application source changes;
- database-aware API readiness;
- `@fas/database` consumption by API or worker;
- schema models, migrations, seeds, or durable jobs;
- correlation or observability packages;
- the full MF-13 smoke workflow;
- GitHub Actions, Dependabot, or security scanning;
- image digest hardening or publication;
- canonical v0.1 persistence work;
- AI, engine, authentication, or public-deployment behavior.

These boundaries keep Sprint 10 independently reviewable. If a specification
finds that application-source changes are necessary merely to assemble the
topology, it must stop for governance review rather than absorb readiness or
business behavior.

## 8. Why This Ordering Is Correct

The ordering follows the approved implementation sequence rather than selecting
work by visibility:

- Sprint 9 completed image packaging, which is the prerequisite for Compose.
- Compose provides the stable service names, network, profile, health source,
  and host-binding contract needed by readiness and smoke tests.
- Database-aware readiness should be implemented against the accepted topology,
  not against an ad hoc test process.
- The deterministic smoke contract should test final behavior rather than
  placeholders.
- CI should repeat accepted local commands and security thresholds, not define
  them through trial and error.
- Only the final clean-clone review can determine whether Milestone 3A is
  complete.

This sequence also preserves the immediate-consumer rule. PostgreSQL has an
immediate topology and health-check role, while domain models, durable jobs,
shared observability abstractions, and engine packages do not yet have approved
consumers.

## 9. Risks of Doing the Wrong Next Sprint

### Starting CI First

CI would encode an incomplete Compose and runtime contract. Later topology and
smoke work would cause avoidable workflow churn and make failures difficult to
attribute.

### Starting Full Runtime Smoke First

The workflow could not truthfully assert database readiness transitions,
correlation, redaction, worker-profile behavior, or rendered host bindings.
Passing evidence would require weakened assertions.

### Starting Database Integration First

Application configuration, lifecycle, error mapping, and readiness semantics
would be designed without the accepted runtime topology. This creates hidden
coupling and increases the chance that local and container behavior diverge.

### Combining MF-09 Through MF-15 in One Sprint

The change would mix Compose, application behavior, cache policy, test tooling,
CI, and security controls. Review and rollback boundaries would be poor, and a
failure in one area could obscure the status of all others.

### Starting Canonical v0.1 Business Persistence

This would bypass the Milestone 3A stop boundary, risk inventing models before
their owning design gate, and contradict the explicit statement that canonical
v0.1 is incomplete.

### Treating `v0.1.9` as Product v0.1 Completion

This would erase open MF-09 through MF-15 evidence requirements and conflict
with the Project State and Architecture Sign-off. Release labels must remain
narrower than architecture acceptance claims.

## 10. Recommendation

The canonical next sprint should be:

# Sprint 10 — Local Compose Topology Foundation

Sprint 10 should complete only the structural Compose portion of Implementation
Plan Step 8 and establish the stable runtime boundary required by later
readiness, smoke, CI, and security work.

The expected follow-on order is:

1. operational readiness, application tests, and correlation/redaction;
2. deterministic integrated runtime acceptance and remaining cache policy;
3. CI and baseline security gates;
4. final documentation, clean-clone verification, and Milestone 3A review;
5. separately authorized canonical v0.1 Foundation continuation.

This recommendation does not authorize implementation. Before any Sprint 10
repository change:

1. create a dedicated Sprint 10 specification;
2. define an exact allowlist, non-goals, dependencies, acceptance commands,
   cleanup behavior, and stop boundary;
3. review the specification against the governing architecture;
4. obtain explicit implementation authorization.

No Sprint 10 implementation is authorized by this planning document.
