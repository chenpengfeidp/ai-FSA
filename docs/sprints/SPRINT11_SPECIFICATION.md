# Sprint 11 Specification — Analysis Engine Foundation Planning Gate

## 1. Status and Authority

- Current delivery milestone: Milestone 3A — Repository Bootstrap
- Current canonical roadmap alignment: v0.1 / M1 Foundation
- Sprint: 11
- Theme: Analysis Engine Foundation
- Specification type: Documentation-only planning gate
- Specification status: Proposed; pending independent review
- Implementation status: Not started and not authorized
- Implementation authorization: Not granted

This document uses `docs/sprints/SPRINT11_PLANNING.md` as its Sprint 11
planning basis and translates that planning content into a reviewable
documentation-only specification without selecting or authorizing an
implementation phase.

The Sprint 11 planning basis is:

- `docs/sprints/SPRINT11_PLANNING.md`.

The following governance authorities remain binding:

- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/00_PROJECT_BIBLE.md`;
- `docs/20_IMPLEMENTATION_PLAN.md`;
- `docs/21_ARCHITECTURE_SIGNOFF.md`.

The planning document's exclusion of a Sprint 11 specification means that the
planning artifact did not itself authorize this file. This specification was
separately authorized as a documentation artifact only. That separate
authorization does not revise the planning recommendation, select an
implementation phase, or authorize implementation.

When a simplified planning sequence conflicts with the canonical release order
or Architecture Sign-off, the higher-authority canonical order governs this
specification. In particular, Knowledge remains before Rule, and Rule remains
before Case/Analysis integration.

The planning document explicitly defines Sprint 11 as planning only. It does
not choose the immediate next implementation capability, authorize a package,
approve a dependency, or permit engine code. This specification therefore has
an empty implementation scope and an empty implementation allowlist.

Creating and reviewing this specification does not authorize implementation.

## 2. Canonical Interpretation

### 2.1 Sprint 11 Theme

**Analysis Engine Foundation** is a planning umbrella for the future path from
the accepted Sprint 10 runtime topology toward the AI Football Analysis
Platform.

It is not:

- a new governed engine;
- a monolithic analysis service;
- permission to create every target package;
- permission to skip unfinished v0.1 Foundation work;
- permission to implement the v0.5 Analysis Orchestrator before v0.2 through
  v0.4 gates.

The seven governed engines remain Prompt, Knowledge, Rule, Case, Review,
Evaluation, and Statistics. The Analysis Orchestrator remains an application
service that coordinates public contracts; it is not itself an engine.

### 2.2 Canonical Roadmap

This specification preserves the existing release sequence:

1. v0.1 / M1 Foundation;
2. v0.2 / M2 Prompt, Provider, and Validation Foundation;
3. v0.3 / M3 Knowledge Engine;
4. v0.4 / M4 Rule Engine;
5. v0.5 / M5 Case and Pre-match Analysis;
6. v0.6 / M6 Review and Governed Learning;
7. v0.7 / M7 Evaluation;
8. v0.8 / M8 Statistics;
9. v0.9 hardening;
10. v1.0 controlled private acceptance.

Sprint 10 completed the local Compose topology but did not complete Milestone
3A or canonical v0.1. Sprint 11 may specify planning gates, dependency order,
and future boundaries only. It may not recast the proposed analysis sequence as
the next authorized implementation release.

## 3. Goals

1. Preserve the post-Sprint 10 baseline as the concrete runtime foundation for
   future analysis planning.
2. Freeze the planning interpretation of Analysis Engine Foundation as a
   sequence of separately governed future capabilities.
3. Preserve exact ownership among Evidence, Analysis, Prompt, Knowledge, Rule,
   Case, Review, Evaluation, Statistics, and provider adapters.
4. Preserve deterministic authority outside generative AI.
5. Preserve the future ordering for:
   - analysis pipeline contracts;
   - provider architecture;
   - data normalization;
   - deterministic feature extraction;
   - deterministic scoring and Rule findings;
   - LLM orchestration;
   - report generation.
6. Make unfinished v0.1 and documentation/ADR gates explicit prerequisites.
7. Prevent this specification from being interpreted as implementation
   authorization.

## 4. Scope

### 4.1 In Scope

Sprint 11 specification scope is limited to documentation governance:

1. **Planning fidelity.**
   - Carry forward the dependency order from
     `docs/sprints/SPRINT11_PLANNING.md`.
   - Do not select a future phase for implementation.
   - Do not invent a package, endpoint, table, model, schema, algorithm, or
     dependency.

2. **Canonical sequencing.**
   - Keep remaining Milestone 3A and canonical v0.1 work ahead of engine
     implementation.
   - Keep Prompt/provider/validation at v0.2.
   - Keep Knowledge at v0.3.
   - Keep deterministic Rule implementation at v0.4.
   - Keep Case and broad pre-match orchestration at v0.5.
   - Keep Review, Evaluation, and Statistics in their later releases.

3. **Ownership boundaries.**
   - Record that Evidence owns source intake, normalization, quality, conflict,
     and cutoff-qualified selection.
   - Record that Rule owns deterministic per-snapshot findings.
   - Record that Prompt owns deterministic composition and manifests but not
     retrieval or provider calls.
   - Record that provider adapters own provider-specific mapping only.
   - Record that Analysis coordinates public contracts and owns snapshot,
     run, validation, revision, and publication lifecycle.
   - Record that report rendering presents immutable validated records and does
     not become a second analytical authority.

4. **Future gate definition.**
   - Define the information a later implementation specification must contain.
   - Require a separately selected narrow capability with an immediate
     consumer.
   - Require owning canonical-document and ADR review before implementation.
   - Require a separate exact implementation allowlist and executable
     acceptance contract.

5. **Stop boundary.**
   - Stop after this specification is generated.
   - Make no implementation or governance-state change.

### 4.2 Planning Sequence Preserved by This Specification

The future sequence remains:

1. complete v0.1 foundation and durable execution;
2. define pipeline contracts and frozen fixtures;
3. establish Prompt/provider/validation boundaries;
4. establish source intake and deterministic normalization;
5. establish deterministic feature derivation after ownership approval;
6. establish governed Knowledge context in v0.3;
7. establish governed Rule findings in v0.4 rather than a new generic scoring
   engine;
8. establish governed Case context and integrate sealed-snapshot LLM
   orchestration in v0.5;
9. render validated reports and require explicit human publication;
10. proceed to post-match Review, Evaluation, Statistics, and governed learning
    only under their own gates.

This list is a planning dependency map. It is not an implementation backlog
authorized by this specification.

## 5. Out of Scope

The following are explicitly outside Sprint 11:

- any implementation source or test;
- any existing implementation-file modification;
- any package manifest, lockfile, workspace, TypeScript, Turbo, Biome,
  dependency-cruiser, Vitest, Docker, or Compose change;
- any application source or composition-root change;
- any database model, enum, migration, seed, repository, or runtime database
  integration;
- durable jobs, leasing, polling, retries, checkpoints, or worker persistence;
- any API endpoint, transport contract, OpenAPI definition, or UI;
- any football-data acquisition or provider integration;
- any data parser or normalizer implementation;
- any feature definition, feature store, embedding, or vector search;
- any scoring formula or generic Scoring Engine;
- any Prompt, Knowledge, Rule, Case, Review, Evaluation, or Statistics engine
  implementation;
- any Analysis Orchestrator implementation;
- any prompt template, AI release bundle, validator bundle, output schema, or
  report schema;
- any OpenAI or other provider SDK dependency;
- any provider credential, network call, sandbox call, or model selection;
- Redis, BullMQ, pgvector, microservices, or Phase 2 infrastructure;
- live or in-play analysis;
- wagering, guarantee, stake-sizing, or financial-advice behavior;
- authentication, users, public deployment, or commercialization;
- automatic AI publication or automatic activation of learning;
- changes to canonical architecture documents or ADRs;
- changes to `AGENTS.md`;
- changes to `docs/PROJECT_STATE.md`;
- a Sprint 11 implementation report;
- Sprint 12 planning or implementation.

## 6. Ownership

### 6.1 Planning Ownership

`docs/sprints/SPRINT11_PLANNING.md` owns the Sprint 11 planning recommendation
and future dependency order.

This specification owns only the reviewable boundary around that planning
recommendation. It does not become a canonical source for engine internals,
database design, transport, package shape, or provider behavior.

### 6.2 Canonical Owners Preserved

- `docs/00_PROJECT_BIBLE.md` owns project purpose and governing principles.
- `docs/02_DOMAIN_MODEL.md` owns domain and epistemic meaning.
- `docs/03_AI_PRINCIPLES.md` owns AI authority, provider, validation, and
  publication principles.
- `docs/04_ARCHITECTURE.md` owns runtime shape and dependency direction.
- `docs/05_PROMPT_ENGINE.md` through `docs/11_STATISTICS_ENGINE.md` own the
  seven governed engines.
- `docs/12_DATABASE.md` owns persistence contracts.
- `docs/13_API.md` owns transport contracts.
- `docs/14_MONOREPO.md` owns package placement and dependency direction.
- `docs/16_IMPLEMENTATION_ROADMAP.md` owns release sequencing.
- `docs/17_ANALYSIS_PIPELINE.md` owns end-to-end pipeline orchestration
  contracts.
- `docs/20_IMPLEMENTATION_PLAN.md` and
  `docs/21_ARCHITECTURE_SIGNOFF.md` govern the current Milestone 3A bootstrap.

### 6.3 Future Runtime Ownership

This specification preserves, but does not implement, the following:

- Evidence owns source records, normalization, quality, conflict, provenance,
  and cutoff-qualified selection.
- Analysis owns readiness coordination, snapshot sealing, runs, provider
  orchestration, validation, revisions, and publication lifecycle.
- Prompt owns deterministic rendering and prompt manifests.
- Rule owns deterministic applicability, evaluation, explanation, and findings.
- Knowledge and Case own their independent governed retrieval contracts.
- Provider adapters own SDK mapping, provider errors, usage, and response
  metadata behind a provider-neutral port.
- Review owns post-match assessments and learning candidates.
- Evaluation owns assessment and release policy.
- Statistics owns deterministic projections and uncertainty.

No ownership statement here authorizes a package or implementation.

## 7. Exact Implementation Allowlist

### 7.1 Implementation Allowlist

```text
SPRINT11_IMPLEMENTATION_ALLOWLIST=[]
EMPTY — NO IMPLEMENTATION FILE IS AUTHORIZED
```

There is no Sprint 11 implementation scope under this specification. Therefore
no file may be created, modified, renamed, or deleted during a purported Sprint
11 implementation.

The specification artifact:

```text
docs/sprints/SPRINT11_SPECIFICATION.md
```

is authorized only as the documentation deliverable requested for specification
generation. It is not an implementation allowlist entry and does not authorize
follow-on repository changes.

### 7.2 Prohibited Changes

In particular, do not modify:

- any file in `apps/`;
- any file in `packages/`;
- `compose.yaml`;
- `.env.example` or any `.env` file;
- `package.json`;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `turbo.json`;
- `vitest.config.ts`;
- `dependency-cruiser.config.cjs`;
- any Dockerfile;
- any numbered architecture document;
- any ADR;
- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/sprints/SPRINT11_PLANNING.md`;
- any prior Sprint artifact.

If a future capability requires changes, governance must first select one narrow
phase and create or revise a separately approved implementation specification
with a non-empty exact allowlist.

## 8. Dependencies and Prerequisites

### 8.1 Current Evidence Dependencies

This specification depends on:

- completed Sprint 10 topology evidence;
- the current Project State showing Milestone 3A and canonical v0.1 incomplete;
- accepted ADR-001 through ADR-004;
- the canonical release order in `docs/16_IMPLEMENTATION_ROADMAP.md`;
- the pipeline and engine ownership contracts in the numbered documents;
- the planning-only boundary in `docs/sprints/SPRINT11_PLANNING.md`.

### 8.2 Prerequisites for Any Future Implementation Specification

Before a future implementation specification may authorize one phase, it must
identify and satisfy all applicable prerequisites:

- remaining Milestone 3A must-fix evidence;
- canonical v0.1 persistence, migration, job, audit, idempotency,
  observability, CI, and operational gates;
- a demonstrated immediate consumer;
- owning canonical-document completeness;
- any required ADR;
- package and dependency direction;
- exact failure and successful-empty semantics;
- exact version, checksum, cutoff, provenance, and replay contracts;
- exact persistence and transport changes where applicable;
- deterministic fixtures;
- executable acceptance and cleanup commands;
- provider credential and test-budget approval where applicable.

### 8.3 Dependency Prohibitions

This specification adds no npm, pnpm, system, database, service, provider,
model, or infrastructure dependency.

## 9. Acceptance Criteria

Sprint 11 specification generation is accepted only when:

### 9.1 Governance

- the specification names `docs/sprints/SPRINT11_PLANNING.md` as its planning
  basis;
- the specification records that its documentation-only creation was
  separately authorized and was not authorized by the planning artifact;
- the governing repository documents remain binding;
- the specification does not authorize implementation;
- the implementation allowlist is explicitly empty;
- no canonical document, ADR, Project State, AGENTS file, or implementation
  file is modified by this specification task.

### 9.2 Roadmap

- Milestone 3A and canonical v0.1 remain incomplete;
- unfinished v0.1 work remains ahead of engine implementation;
- Prompt/provider/validation remains v0.2;
- Knowledge remains v0.3;
- Rule remains v0.4;
- Case and broad pre-match orchestration remain v0.5;
- Review, Evaluation, and Statistics remain later governed releases.

### 9.3 Architecture Boundaries

- Analysis Engine Foundation is not represented as an eighth engine;
- Analysis Orchestrator remains coordination, not engine ownership;
- normalization remains deterministic and adds no inference;
- feature extraction remains deterministic, versioned, and ownership-gated;
- no generic Scoring Engine is introduced;
- deterministic Rule, Evaluation, and Statistics responsibilities remain
  separate;
- provider SDK details remain inside adapters;
- provider output remains untrusted and non-authoritative;
- Prompt composition performs no retrieval;
- report rendering cannot create uncited analytical truth;
- human publication remains required.

### 9.4 Scope

- no implementation deliverable is specified;
- no package, endpoint, table, model, migration, schema, algorithm, formula,
  prompt, or dependency is invented;
- no future phase is selected for implementation;
- no Sprint 12 work is introduced.

## 10. Validation Commands

These commands validate only the specification artifact. They are not
implementation acceptance commands and do not authorize implementation.

Run both sections from the repository root. Section 10.1 must run before
modifying the specification. Section 10.2 must run after the revision.

### 10.1 Pre-revision Isolation Baseline

```bash
set -eu

BASELINE_FILE="${TMPDIR:-/tmp}/fas-sprint11-spec-baseline.json"

node --input-type=module - "$BASELINE_FILE" <<'NODE'
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const specification = "docs/sprints/SPRINT11_SPECIFICATION.md";
const output = execFileSync(
  "git",
  ["status", "--porcelain=v1", "-z"],
).toString("utf8");
const paths = output
  .split("\0")
  .filter(Boolean)
  .map((entry) => entry.slice(3))
  .filter((path) => path !== specification)
  .sort();
const files = Object.fromEntries(
  paths.map((path) => [
    path,
    existsSync(path)
      ? createHash("sha256").update(readFileSync(path)).digest("hex")
      : null,
  ]),
);

writeFileSync(
  process.argv[2],
  `${JSON.stringify({ paths, files }, null, 2)}\n`,
);
NODE

test -s "$BASELINE_FILE"
```

Required result:

- the complete pre-existing changed-path set outside this specification is
  recorded;
- every pre-existing changed file outside this specification has a content
  checksum or an explicit missing marker;
- the baseline is stored outside the repository.

### 10.2 Post-revision Artifact and Isolation Validation

```bash
set -eu

SPECIFICATION="docs/sprints/SPRINT11_SPECIFICATION.md"
BASELINE_FILE="${TMPDIR:-/tmp}/fas-sprint11-spec-baseline.json"

test -f "$SPECIFICATION"
test -s "$BASELINE_FILE"

node --input-type=module - "$BASELINE_FILE" <<'NODE'
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const path = "docs/sprints/SPRINT11_SPECIFICATION.md";
const text = readFileSync(path, "utf8");
const prose = text.replace(/```[\s\S]*?```/g, "");
const normalizedProse = prose.replace(/\s+/g, " ");
const baseline = JSON.parse(readFileSync(process.argv[2], "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(text.endsWith("\n"), "Specification must end with a newline");
const lines = text.split("\n");
for (const [index, line] of lines.entries()) {
  assert(
    !/[ \t]+$/.test(line),
    `Trailing whitespace at specification line ${index + 1}`,
  );
}
assert(
  !/^(<<<<<<<|=======|>>>>>>>)/m.test(text),
  "Specification contains a merge-conflict marker",
);

const requiredSections = [
  "## 1. Status and Authority",
  "## 2. Canonical Interpretation",
  "## 3. Goals",
  "## 4. Scope",
  "## 5. Out of Scope",
  "## 6. Ownership",
  "## 7. Exact Implementation Allowlist",
  "## 8. Dependencies and Prerequisites",
  "## 9. Acceptance Criteria",
  "## 10. Validation Commands",
  "## 11. Risks and Mitigations",
  "## 12. Stop and Escalation Conditions",
  "## 13. Deliverables",
  "## 14. Completion Definition",
  "## 15. Sprint 11: SPECIFICATION ONLY",
];

for (const section of requiredSections) {
  assert(prose.includes(section), `Missing required section: ${section}`);
}

const requiredStatements = [
  "Implementation authorization: Not granted",
  "separately authorized as a documentation artifact only",
  "No Sprint 11 implementation is authorized",
  "Milestone 3A",
  "canonical v0.1",
  "provider-neutral",
  "human publication",
  "Knowledge remains before Rule",
  "Rule remains before Case/Analysis integration",
];

for (const statement of requiredStatements) {
  assert(
    normalizedProse.includes(statement),
    `Missing required statement: ${statement}`,
  );
}

const prohibitedAuthorization = [
  "APPROVED FOR IMPLEMENTATION",
  "Implementation authorization: Granted",
];

for (const statement of prohibitedAuthorization) {
  assert(
    !normalizedProse.includes(statement),
    `Prohibited implementation authorization: ${statement}`,
  );
}

const allowlistMatches = [
  ...text.matchAll(/SPRINT11_IMPLEMENTATION_ALLOWLIST=(\[[^\n]*\])/g),
];
assert(
  allowlistMatches.length === 1,
  "Expected exactly one machine-readable Sprint 11 implementation allowlist",
);
const implementationAllowlist = JSON.parse(allowlistMatches[0][1]);
assert(
  Array.isArray(implementationAllowlist) &&
    implementationAllowlist.length === 0,
  "Sprint 11 implementation allowlist must be an empty array",
);

const canonicalOrder = [
  "v0.2 / M2 Prompt, Provider, and Validation Foundation",
  "v0.3 / M3 Knowledge Engine",
  "v0.4 / M4 Rule Engine",
  "v0.5 / M5 Case and Pre-match Analysis",
];
let priorIndex = -1;
for (const item of canonicalOrder) {
  const index = prose.indexOf(item);
  assert(index > priorIndex, `Canonical roadmap order is invalid at: ${item}`);
  priorIndex = index;
}

const planningSequence = [
  "establish governed Knowledge context in v0.3",
  "establish governed Rule findings in v0.4",
  "establish governed Case context and integrate sealed-snapshot LLM",
];
priorIndex = -1;
for (const item of planningSequence) {
  const index = prose.indexOf(item);
  assert(index > priorIndex, `Planning sequence is invalid at: ${item}`);
  priorIndex = index;
}

const specification = "docs/sprints/SPRINT11_SPECIFICATION.md";
const output = execFileSync(
  "git",
  ["status", "--porcelain=v1", "-z"],
).toString("utf8");
const paths = output
  .split("\0")
  .filter(Boolean)
  .map((entry) => entry.slice(3))
  .filter((changedPath) => changedPath !== specification)
  .sort();
assert(
  JSON.stringify(paths) === JSON.stringify(baseline.paths),
  "Changed paths outside the specification differ from the baseline",
);
for (const changedPath of paths) {
  const checksum = existsSync(changedPath)
    ? createHash("sha256").update(readFileSync(changedPath)).digest("hex")
    : null;
  assert(
    checksum === baseline.files[changedPath],
    `File outside the specification changed: ${changedPath}`,
  );
}
NODE

rm -f "$BASELINE_FILE"
test ! -e "$BASELINE_FILE"
```

Required result:

- the specification exists;
- direct content checks cover trailing whitespace, final newline, and conflict
  markers even when the specification is untracked;
- all required governance sections are present;
- the machine-readable implementation allowlist exists exactly once and parses
  as an empty array;
- Knowledge precedes Rule, and Rule precedes Case/Analysis integration;
- implementation remains explicitly unauthorized;
- no implementation approval language exists;
- every pre-existing changed path outside this specification is unchanged;
- no new changed path outside this specification is introduced;
- the temporary baseline is removed.

The validation intentionally does not run builds, tests, Docker, Compose,
Prisma, provider calls, or runtime workflows because this specification has no
implementation scope.

## 11. Risks and Mitigations

### 11.1 Specification Misread as Authorization

Risk: the presence of goals, phases, and an allowlist section is treated as
permission to begin engine work.

Mitigation: status is not authorized, implementation scope is empty, and the
exact implementation allowlist is empty.

### 11.2 Canonical Roadmap Bypass

Risk: Sprint numbering is mistaken for permission to move directly from Sprint
10 topology into v0.5 orchestration.

Mitigation: preserve unfinished v0.1 prerequisites and the v0.2 through v0.5
release order explicitly.

### 11.3 Monolithic Analysis Engine

Risk: the planning umbrella becomes a single package owning evidence, rules,
providers, validation, and reports.

Mitigation: preserve canonical ownership and keep Analysis Orchestrator limited
to coordination through public contracts.

### 11.4 Premature Package Scaffolding

Risk: target packages are created without immediate consumers as architecture
theater.

Mitigation: empty allowlist and a future requirement for one narrow,
consumer-backed capability.

### 11.5 Generic Scoring Authority

Risk: a new Scoring Engine duplicates Rule, Evaluation, or Statistics.

Mitigation: reject a generic scoring engine and require future formulas to map
to an existing canonical owner.

### 11.6 Provider-driven Domain Design

Risk: provider SDK types and behavior define application or domain contracts.

Mitigation: require provider-neutral ports, fakes, closed schemas, validation,
and exact bundle identities before an adapter.

### 11.7 LLM Authority Leakage

Risk: the provider normalizes data, derives authoritative features, evaluates
rules, computes release policy, fills missing evidence, or publishes.

Mitigation: keep deterministic work outside AI and require validation plus
explicit human publication.

### 11.8 Report Drift

Risk: a renderer creates new uncited claims or becomes an alternative source of
truth.

Mitigation: future reports must render one immutable validated subject and
preserve exact citations and checksums.

## 12. Stop and Escalation Conditions

Stop immediately if:

- implementation is requested under this specification;
- any non-documentation file appears necessary;
- any file other than this specification would need modification during this
  specification-generation task;
- a package, dependency, endpoint, table, model, migration, schema, formula,
  algorithm, prompt, report contract, or provider is being selected;
- the canonical v0.1 through v0.5 order would be bypassed;
- Analysis Orchestrator is represented as an engine;
- a generic Scoring Engine is proposed;
- provider output receives deterministic, lifecycle, or publication authority;
- a canonical contract is missing or contradictory;
- implementation authorization is inferred from Sprint numbering;
- Sprint 12 planning or implementation begins.

When stopped, report:

- the exact conflict;
- the governing planning or canonical clause;
- the decision required before a future specification can proceed.

Do not expand the empty allowlist inside this specification.

## 13. Deliverables

The sole deliverable is:

```text
docs/sprints/SPRINT11_SPECIFICATION.md
```

No implementation file, architecture document, ADR, Project State update,
Sprint report, package, dependency, migration, runtime artifact, or generated
output is a Sprint 11 deliverable.

A future implementation requires a separately reviewed specification that
selects one narrow planning phase and replaces the empty implementation
allowlist with an exact approved allowlist.

## 14. Completion Definition

Sprint 11 specification generation is complete only when:

1. this specification exists;
2. it follows `docs/sprints/SPRINT11_PLANNING.md` without selecting an
   implementation phase;
3. all requested sections are present;
4. the canonical roadmap remains unchanged;
5. ownership boundaries remain unchanged;
6. the exact implementation allowlist is empty;
7. validation of the specification artifact passes;
8. no existing implementation file is modified by this task;
9. no architecture document, ADR, `AGENTS.md`, or `docs/PROJECT_STATE.md` is
   modified by this task;
10. no implementation is authorized or started;
11. no Sprint 12 work begins;
12. work stops after specification generation.

## 15. Sprint 11: SPECIFICATION ONLY

This document is a documentation-only planning gate.

It does not authorize implementation.

No Sprint 11 implementation is authorized, started, or implied.

Stop after generating `docs/sprints/SPRINT11_SPECIFICATION.md`.
