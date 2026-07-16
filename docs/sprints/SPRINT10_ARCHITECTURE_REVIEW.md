# Sprint 10 Specification Architecture Review

## Review Record

- Reviewer role: Repository Chief Architect
- Reviewed artifact: `docs/sprints/SPRINT10_SPECIFICATION.md`
- Planning authority: `docs/sprints/SPRINT10_PLANNING.md`
- Governing references:
  - `AGENTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/20_IMPLEMENTATION_PLAN.md`
  - `docs/21_ARCHITECTURE_SIGNOFF.md`
- Review type: Documentation-only architecture gate
- Implementation reviewed: None
- Implementation authorization granted: No

This review evaluates whether the Sprint 10 specification is safe, complete,
executable, and consistent with the approved Milestone 3A boundary. It does not
modify the specification, implementation, architecture documents, ADRs, or
`docs/PROJECT_STATE.md`.

## Executive Summary

The selected theme, **Local Compose Topology Foundation**, is the correct
canonical next sprint. The specification follows the ordering established by
the planning document:

1. Sprint 9 image packaging;
2. Compose/PostgreSQL topology;
3. database-aware readiness and correlation/redaction;
4. full deterministic runtime acceptance;
5. CI and security automation;
6. final Milestone 3A verification.

The proposed scope is generally narrow and correctly excludes application
database integration, migrations, durable jobs, full MF-13 runtime smoke, CI,
security scanning, domain persistence, AI work, and Sprint 11.

However, three validation defects prevent approval:

1. the runtime command does not actually exercise default-profile startup;
2. Compose validation is not isolated from an ignored local `.env` or alternate
   Compose-file selection;
3. the PostgreSQL health-check assertion can accept a non-meaningful command
   instead of the required `pg_isready` contract.

These defects allow acceptance criteria to pass without proving the behavior
the specification claims. The specification therefore requires revision before
implementation authorization.

## Blocking Issues

### BI-01 — Default-profile Runtime Behavior Is Not Executed

**Finding**

The specification requires:

- default startup to run PostgreSQL, API, and web only;
- worker to be absent when no profile is enabled;
- worker to require the explicit `worker` profile.

The runtime validation instead executes:

```text
docker compose up ... postgres api web
```

Explicitly naming services bypasses the behavior under review. The command
would omit worker even if its profile were incorrectly removed, because worker
was not named.

The normalized-config assertion proves that worker declares a profile, but the
runtime evidence claims to prove the default topology as well. The current
command does not execute that default topology.

**Conflict**

- `SPRINT10_PLANNING.md` requires profile validation.
- MF-10 requires an explicit non-default worker profile.
- The specification's own Default Topology Runtime acceptance criteria require
  worker to be absent without a profile.
- Governance requires executable evidence rather than an assertion that can
  pass for the wrong reason.

**Required correction**

Run the default topology without a service list:

```text
docker compose up --detach --wait --wait-timeout 120
```

Then assert that only `postgres`, `api`, and `web` are running. Keep a separate
profile-enabled command for worker evidence.

### BI-02 — Compose Validation Can Be Influenced by Untracked Local State

**Finding**

The specification states that validation:

- supplies explicit process-environment values;
- does not depend on an untracked local `.env`;
- is deterministic.

Every Compose command currently uses implicit file and environment discovery:

```text
docker compose ...
```

Docker Compose automatically discovers `compose.yaml` and may read a local
ignored `.env`. A local `.env` can provide more than the five expected
interpolation values; Compose control variables such as `COMPOSE_FILE` and
profiles can alter which configuration is parsed or which services are active.

Exporting the five expected variables does not neutralize all Compose control
inputs. Therefore two developers can execute the same validation block against
different effective configurations.

**Conflict**

- The planning document requires deterministic configuration and startup
  evidence.
- The specification's Environment and Secret Boundary says acceptance does not
  depend on local `.env`.
- `AGENTS.md` requires reproducible validation and forbids hidden local state
  from becoming evidence.

**Required correction**

Make every acceptance Compose call select the repository file and an empty or
explicit validation environment source, for example:

```text
docker compose --file compose.yaml --env-file /dev/null ...
```

Alternatively, create a temporary validation env file containing exactly the
five declared non-secret values, pass it explicitly to every Compose command,
and remove it through the existing trap.

Also neutralize inherited `COMPOSE_FILE`, `COMPOSE_PROFILES`, and equivalent
control variables, or ensure explicit CLI arguments override them.

### BI-03 — PostgreSQL Health Evidence Can Pass with a Trivial Health Check

**Finding**

The Scope requires a bounded `pg_isready` health check. The normalized-config
validation currently proves only:

- a health-check object exists;
- its test array is non-empty;
- retries are greater than zero.

An implementation such as a permanently successful `true` command would pass
these assertions. `docker compose up --wait` and the runtime `healthy`
assertion would then also pass without proving PostgreSQL readiness.

The health check's timeout, interval, and startup bound are not asserted either.

**Conflict**

- Implementation Plan Step 8 requires a real PostgreSQL health check.
- The planning document identifies PostgreSQL health as the immediate topology
  consumer.
- Evidence-first governance does not permit a placeholder check to satisfy a
  runtime claim.

**Required correction**

The rendered-config assertion must prove:

- the health-check command invokes `pg_isready`;
- it targets the configured database/user contract as appropriate;
- interval and timeout are positive and bounded;
- retries are positive and bounded;
- any start period is explicit or demonstrably unnecessary;
- runtime reaches `healthy` through that exact check.

## Major Issues

### MA-01 — MF-10 Completion Language Is Ambiguous

**Finding**

The specification correctly excludes application tests, yet its Sprint
Completion Definition states that MF-10 may be reported as satisfied “to the
extent” proven by profile evidence.

MF-10 includes more than profile placement. It also requires the worker
bootstrap test to prove initialization, signal handling, and clean shutdown.
Sprint 10 proves existing startup/log/exit behavior but does not add the
required application test or a signal-handling assertion for worker.

**Impact**

The Sprint report could overstate MF-10 closure and create inconsistent
governance state.

**Required correction**

State unambiguously:

- Sprint 10 satisfies the Compose-profile portion of MF-10;
- MF-10 remains partially open;
- full closure requires the separately authorized bootstrap test and
  signal-handling evidence.

MF-14 may be closed if both rendered and running publisher evidence pass,
because that is the complete host-exposure decision.

### MA-02 — Application Database-environment Rejection Is Incomplete

**Finding**

The rendered-config script rejects only:

- `DATABASE_URL`;
- `POSTGRES_PASSWORD`.

The acceptance criteria are broader: applications must receive no PostgreSQL
credential or database configuration. The current check would not reject
`POSTGRES_USER`, `POSTGRES_DB`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
`PGDATABASE`, or equivalent application environment leakage.

**Impact**

An application could become accidentally coupled to the topology while the
acceptance script still passes.

**Required correction**

Define and reject the complete forbidden database-environment set for API, web,
and worker. Prefer an allowlist of the exact authorized application variables:

- API: `NODE_ENV`, `HOST`, `PORT`;
- web: `NODE_ENV`, `HOSTNAME`, `PORT`;
- worker: only its already supported runtime configuration.

Account for harmless image-defined environment values separately from
Compose-supplied service environment.

### MA-03 — Clean-start Prerequisite Is Printed but Not Enforced

**Finding**

The prerequisite requires a clean worktree. The validation command runs:

```text
git status --short
```

but performs no executable assertion. It can continue with unrelated modified
or untracked files.

**Impact**

Acceptance evidence can be contaminated by pre-existing work, and the final
allowlist check cannot reliably distinguish Sprint 10 changes from prior
changes.

**Required correction**

Separate pre-implementation validation from post-implementation validation and
make the initial clean-state check fail when porcelain output is non-empty.
Record the starting commit so the final review can compare the complete Sprint
diff, including any commits created outside the implementation agent.

### MA-04 — `.env.example` Contract Is Not Executably Checked

**Finding**

The allowlist adds `.env.example`, and acceptance requires it to document all
five interpolation names. No validation command verifies its presence or
contents.

**Impact**

The topology can pass while the required developer-facing environment contract
is missing or incomplete.

**Required correction**

Add deterministic assertions that `.env.example` exists and contains each
required key exactly once, while ensuring it contains no production credential
or operational secret.

## Minor Issues

### MI-01 — Lockfile Check Does Not Fail Directly

`git diff -- pnpm-lock.yaml` prints a difference but exits successfully. The
allowlist parser should catch an uncommitted lockfile change, but the dedicated
lockfile command should still use `git diff --exit-code -- pnpm-lock.yaml` for
direct, self-explanatory evidence.

### MI-02 — Runtime Network/Volume Count Is Only Checked as Non-empty

Normalized configuration requires exactly one network and volume, but runtime
checks only assert non-empty ID output. Assert exactly one project network and
one project volume before cleanup so runtime evidence matches the configuration
claim.

### MI-03 — Compose Feature Baseline Is Descriptive Rather Than Explicit

The specification requires a “current” Compose plugin supporting several flags
but does not state a minimum accepted Compose version. Feature checks make this
non-blocking, but the Sprint report should record the exact observed Compose
version. If cross-environment reproducibility becomes a gate, the specification
should define a tested minimum rather than rely on “current.”

### MI-04 — `v0.1.9` Terminology Requires Care in the Sprint Report

The specification correctly distinguishes the repository delivery label from
canonical product v0.1. The Sprint report must retain that wording exactly and
must not describe Sprint 10 as post-v0.1 product development.

## Approved Items

### Alignment with Sprint 10 Planning

Approved:

- correct theme: Local Compose Topology Foundation;
- correct placement after Sprint 9 packaging;
- topology-only scope;
- PostgreSQL health and named-volume ownership;
- private project network;
- API/web Compose assembly;
- explicit non-default worker profile;
- loopback-only application exposure;
- no host-published PostgreSQL;
- no application database integration;
- no full MF-13 smoke, CI, scans, migrations, durable jobs, or Sprint 11 work.

### Alignment with the Implementation Plan

Approved:

- continues Step 8 before Step 9;
- uses the existing application-local Dockerfiles;
- uses the approved PostgreSQL `17-alpine` baseline;
- passes configuration through environment interpolation;
- keeps migration execution explicit by adding no automatic migration;
- preserves one root-owned Compose topology;
- does not introduce Redis, pgvector, OpenAI-compatible services, or public
  ingress.

### Alignment with the Architecture Sign-off

Approved:

- preserves MF-08 packaging rather than redesigning it;
- advances the Compose portion of MF-09;
- implements the non-default worker profile portion of MF-10;
- leaves database-aware MF-11 work open;
- leaves broader MF-12 cache/environment policy open;
- leaves the full MF-13 workflow open;
- provides the correct structural path to MF-14 evidence;
- leaves MF-15 CI/security work open;
- preserves MF-18 container hook behavior by changing no Dockerfile.

### Milestone 3A Boundary

Approved:

- no football-analysis behavior;
- no AI provider or engine implementation;
- no domain schema, model, migration, or durable job;
- no authentication or public deployment;
- no Phase 2 infrastructure;
- no canonical v0.1 completion claim;
- no Sprint 11 planning or implementation.

### Allowlist

The proposed implementation allowlist is minimal and justified:

- `compose.yaml` owns topology;
- `.env.example` documents interpolation names;
- README and Development Guide document demonstrated operation;
- Sprint report records evidence;
- Project State changes only after completion.

No application, package, Dockerfile, lockfile, tooling, architecture, ADR, or
prior Sprint artifact belongs in the allowlist.

### Stop Boundary

The stop boundary is appropriately strict. It explicitly stops before:

- application database consumption;
- readiness changes;
- application tests and observability;
- full deterministic smoke;
- Turbo cache policy;
- CI and scans;
- migrations and canonical v0.1 persistence;
- Sprint 11.

The stop boundary requires no architectural expansion. The blocking issues are
validation defects, not a need to broaden scope.

## Governance Compatibility Review

The specification follows the approved Sprint 5 through Sprint 9 governance
pattern in the following respects:

- specification precedes authorization;
- status explicitly says not authorized;
- authority and ordering are stated;
- scope and non-goals are separate;
- allowlist is exact;
- validation is intended to be executable;
- failures trigger stop-and-escalate behavior;
- report and Project State update only after acceptance;
- later Sprint work is prohibited.

The governance pattern is not fully satisfied until BI-01 through BI-03 are
corrected, because prior Sprints require validation that fails when the claimed
contract is absent. A command that passes without exercising the claimed
default profile or real PostgreSQL readiness is insufficient acceptance
evidence.

## Required Next Action

Revise only `docs/sprints/SPRINT10_SPECIFICATION.md` to resolve every Blocking
Issue and Major Issue. Do not begin implementation.

After revision:

1. rerun this architecture review or create a focused final review;
2. verify every command is deterministic and executable;
3. confirm MF-10 remains partially open;
4. obtain separate explicit implementation authorization.

No architecture-document or ADR change is required by the current findings.

CHANGES REQUIRED
