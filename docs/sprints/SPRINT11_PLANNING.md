# Sprint 11 Planning — Analysis Engine Foundation

## 1. Planning Record

- Current delivery milestone: Milestone 3A — Repository Bootstrap
- Current canonical roadmap alignment: v0.1 / M1 Foundation
- Proposed planning theme: Analysis Engine Foundation
- Planning basis:
  - `AGENTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/00_PROJECT_BIBLE.md`
  - `docs/03_AI_PRINCIPLES.md`
  - `docs/04_ARCHITECTURE.md`
  - `docs/05_PROMPT_ENGINE.md` through `docs/11_STATISTICS_ENGINE.md`
  - `docs/14_MONOREPO.md`
  - `docs/16_IMPLEMENTATION_ROADMAP.md`
  - `docs/17_ANALYSIS_PIPELINE.md`
  - `docs/20_IMPLEMENTATION_PLAN.md`
  - `docs/21_ARCHITECTURE_SIGNOFF.md`
  - `docs/sprints/SPRINT10_REPORT.md`
- Last completed sprint: Sprint 10 — Local Compose Topology Foundation
- Planning status: Planning only
- Implementation authorization: Not granted

This document plans the dependency order for the future football-analysis
foundation. It does not authorize implementation, define an implementation
allowlist, approve a dependency, create a package, add a provider, change a
canonical architecture contract, or replace a future Sprint 11 specification
and implementation gate.

The phrase **Analysis Engine Foundation** is a planning theme, not a new eighth
governed engine. The seven governed engines remain Prompt, Knowledge, Rule,
Case, Review, Evaluation, and Statistics. The Analysis Orchestrator remains an
application service that coordinates public engine contracts; it is not itself
an engine.

## 2. Authority and Canonical Sequencing

The current repository is still in Milestone 3A and canonical v0.1 Foundation.
Sprint 10 completed the local Compose topology, but it did not complete
Milestone 3A or canonical v0.1.

The canonical release sequence remains:

1. **v0.1 / M1 — Foundation**
   - repository bootstrap completion;
   - application database integration and migrations when approved;
   - durable PostgreSQL jobs;
   - audit, idempotency, correlation, redaction, CI, and operational gates;
2. **v0.2 / M2 — Prompt, Provider, and Validation Foundation**
   - deterministic prompt composition;
   - provider-neutral generation boundary;
   - structured output and blocking validation;
3. **v0.3 / M3 — Knowledge Engine**
   - governed knowledge lifecycle and deterministic retrieval;
4. **v0.4 / M4 — Rule Engine**
   - governed deterministic rule evaluation;
5. **v0.5 / M5 — Case and Pre-match Analysis**
   - governed case analogies;
   - complete Analysis Orchestrator integration and human publication;
6. later Review, Evaluation, Statistics, hardening, and controlled acceptance
   releases.

Sprint 11 planning may organize this future path now because Sprint 10 has
provided a concrete local runtime boundary. It must not reinterpret that
planning activity as permission to skip unfinished v0.1 work or to implement
the v0.5 pre-match workflow before v0.2 through v0.4 contracts pass their own
gates.

## 3. Why This Planning Follows Sprint 10

Sprint 10 established the first accepted composed runtime topology:

- PostgreSQL, API, and web start together on one private network;
- worker behavior is available through an explicit non-default profile;
- API and web preserve their existing behavior through loopback-only ports;
- PostgreSQL health and non-publication are executable evidence;
- application images remain non-root;
- no application yet consumes PostgreSQL;
- no football-analysis or provider behavior exists.

That boundary makes long-range analysis planning more concrete. Future analysis
work now has known composition roots, a private PostgreSQL service boundary, an
explicit worker profile, and repeatable repository validation. Planning can
therefore identify which contracts must precede provider calls and orchestration
without inventing runtime topology at the same time.

This is the next useful **planning** milestone toward the AI Football Analysis
Platform because it translates the canonical v0.2 through v0.5 release order
into a dependency-aware implementation sequence. It is not the next authorized
implementation milestone. Unfinished Milestone 3A and canonical v0.1 gates
remain ahead of all engine implementation.

## 4. Current Baseline and Remaining Prerequisites

### 4.1 Demonstrated Baseline

The repository currently demonstrates:

- strict TypeScript, pnpm, and Turborepo foundations;
- API, web, and worker composition roots;
- typed server configuration;
- no-model Prisma generation and database-adapter construction;
- application-local non-root container images;
- a private local Compose topology with healthy PostgreSQL;
- exact quality, boundary, typecheck, test, build, and Compose acceptance
  workflows.

The repository does not contain:

- football-domain use cases;
- source adapters or normalized football evidence;
- engine packages;
- an Analysis Orchestrator;
- a provider port, provider SDK, or provider call;
- a structured analysis-output contract;
- prompt, knowledge, rule, case, review, evaluation, or statistics runtime
  behavior;
- a database model, migration, durable job, or application database consumer.

### 4.2 Gates That Must Precede Analysis Implementation

Before any Analysis Engine Foundation implementation sprint, the owning
governance process must resolve or complete:

- remaining Milestone 3A MF-09 through MF-13 and MF-15 evidence as applicable;
- the remaining MF-10 worker bootstrap signal-handling test;
- database-aware readiness and explicit schema-compatibility behavior;
- durable PostgreSQL job, lease, retry, checkpoint, and idempotency foundations;
- correlation, structured logging, and redaction;
- baseline CI and security gates;
- canonical v0.1 persistence, audit, and migration contracts needed by the
  first immediate consumer;
- all pre-v0.2 composition-policy, AI release-bundle, validator-bundle,
  validation-execution, and publication-reference documentation gates.

Planning must not turn these prerequisites into implicit Sprint 11 scope.

## 5. Planning Goal

Define a reviewable future ordering for the architectural foundation of
football analysis while preserving:

- facts, market signals, deterministic findings, case analogies, inference,
  scenarios, and uncertainty as distinct epistemic types;
- exact provenance, versions, checksums, cutoff semantics, and lineage;
- deterministic normalization, feature derivation, rules, scoring policy, and
  validation outside generative AI;
- provider-neutral application contracts;
- provider-specific details inside adapters;
- explicit successful-empty, blocked, failed, and partial states;
- human publication authority;
- no automatic activation of AI or learned content.

This planning document intentionally defines sequencing and gates, not files,
types, APIs, database tables, package manifests, algorithms, or implementation
acceptance commands.

## 6. Proposed Future Implementation Order

### 6.1 Phase 0 — Complete the Foundation Gate

**Purpose**

Finish the approved v0.1 capabilities required by every later analysis stage.

**Required outcomes before engine work**

- application persistence and migration lifecycle are explicit;
- PostgreSQL durable jobs can recover idempotently;
- worker lifecycle and shutdown are proven;
- correlation and redaction cross API, jobs, and worker execution;
- database-aware readiness and deterministic integrated smoke pass;
- CI repeats accepted local quality and runtime evidence.

**Why first**

Provider attempts, normalization runs, sealed snapshots, validations, and
reports require durable identities, checkpoints, audit, and recovery. Building
analysis logic before those foundations would force temporary storage and
execution contracts that later milestones would need to replace.

### 6.2 Phase 1 — Analysis Pipeline Contracts and Frozen Fixtures

**Purpose**

Turn the canonical pipeline into framework-neutral stage contracts and
deterministic fixtures before implementing broad orchestration.

**Planning focus**

- readiness inputs and cutoff semantics;
- append-only source-record and normalized-evidence identities;
- stage completion envelopes;
- successful-empty versus failure semantics;
- immutable selection, evaluation, prompt, candidate, validation, and report
  manifests;
- exact version and checksum propagation;
- fixture families for ready, blocked, stale, conflicted, empty, failed, and
  cutoff-invalid paths.

**Boundary**

The pipeline contracts do not authorize a monolithic pipeline service. Each
owner returns declared application contracts. The Analysis Orchestrator later
coordinates them without direct table reads.

### 6.3 Phase 2 — Provider Architecture and Prompt/Validation Boundary

**Canonical alignment**

v0.2 / M2 — Prompt, Provider, and Validation Foundation.

**Planning focus**

- deterministic Prompt Engine composition and immutable prompt manifests;
- provider-neutral generation port;
- fake provider and frozen provider fixtures first;
- OpenAI Responses API as the first adapter only after dependency and
  credential gates;
- provider/model/configuration identity;
- bounded timeout, cancellation, retry classification, and attempt records;
- closed structured-output schema parsed from `unknown`;
- semantic, citation, temporal, contradiction, injection, and authority
  validators;
- inline validation and durable idempotent revalidation;
- explicit human publication boundary.

**Boundary**

The Prompt Engine performs no retrieval and no provider call. Provider SDK
types, raw errors, credentials, and request/response objects do not cross the
adapter. A provider candidate cannot publish itself.

### 6.4 Phase 3 — Data Collection and Normalization Foundation

**Purpose**

Create trustworthy typed inputs before feature derivation, deterministic rules,
or LLM synthesis consume football data.

**Planning focus**

- source/provider identity versus canonical FAS identity;
- append-only source records and payload checksums;
- observation time versus retrieval time;
- parser and normalizer versions;
- facts, market signals, and post-match outcomes as separate types;
- units, controlled metrics, validity intervals, freshness, quality, conflict,
  rejection, supersession, and provenance;
- deterministic normalization fixtures and rejection cases;
- strict exclusion of outcome evidence from pre-match inputs.

**Boundary**

Normalization adds no inference, recommendation, score, or prediction. Raw
source text never enters the provider prompt directly. Unsupported or ambiguous
records fail or quarantine explicitly rather than becoming partially trusted
values.

### 6.5 Phase 4 — Deterministic Feature Extraction

**Purpose**

Derive bounded, versioned analytical inputs from normalized evidence without
delegating arithmetic or business policy to an LLM.

**Planning focus**

- exact normalized source references;
- feature-definition and implementation versions;
- units, temporal windows, missing-data behavior, and input checksums;
- deterministic transformations and canonical serialization;
- explanations sufficient to trace every derived value to evidence;
- golden, boundary, missing, conflict, and replay fixtures.

**Boundary**

“Feature extraction” is a planning term for deterministic typed derivation. It
does not authorize an ungoverned feature store, embeddings, model training,
pgvector, hidden statistical inference, or a new governed engine. Ownership
must be assigned in the applicable canonical documents before implementation.

### 6.6 Phase 5 — Deterministic Scoring and Rule Findings

**Purpose**

Produce reproducible analytical findings from exact normalized and derived
inputs before LLM synthesis.

**Canonical mapping**

There is no approved generic “Scoring Engine.” Future specifications must map
scoring responsibilities to existing owners:

- Rule Engine owns deterministic per-snapshot conditions, applicability,
  explanations, and findings;
- Statistics Engine later owns rebuildable population metrics, qualification,
  and uncertainty;
- Evaluation Engine later owns quality and release gates;
- Analysis may present governed values but cannot invent another authority.

**Planning focus**

- governed immutable Rule versions;
- closed condition and outcome schemas;
- explicit `matched`, `not_matched`, `inapplicable`, and `error` states;
- missing/conflicted input semantics;
- condition-level explanations;
- evaluator and input-schema versions;
- deterministic checksums and replay;
- no clock, random, network, filesystem, provider, or database access inside
  pure evaluation.

**Boundary**

The LLM may explain deterministic findings but may not calculate, repair,
override, or silently omit them. A required rule error fails the stage.

### 6.7 Phase 6 — Knowledge and Case Context

**Canonical alignment**

- v0.3 / M3 — Knowledge Engine;
- v0.5 / M5 — Case Engine integration after v0.4 Rule completion.

**Planning focus**

- governed item/version lifecycles;
- source and approval requirements;
- deterministic retrieval specifications and stable tie-breaks;
- corpus watermarks and ordered selection manifests;
- exact excerpts, ranks, reasons, similarities, material differences,
  limitations, and checksums;
- explicit successful-empty versus failed retrieval.

**Boundary**

Knowledge is methodology, not current-match factual evidence. Historical cases
are analogies, not causal proof. Prompt composition consumes exact selections;
it does not perform retrieval.

### 6.8 Phase 7 — LLM Orchestration

**Canonical alignment**

v0.5 / M5 — Case and Pre-match Analysis, after v0.1 through v0.4 release gates.

**Planning focus**

- versioned deterministic readiness policy;
- cutoff-qualified evidence selection;
- exact Knowledge, Rule, and Case stage envelopes;
- snapshot completeness verification and immutable sealing;
- prompt manifest creation;
- provider attempts under one frozen run;
- candidate persistence before validation;
- inline validation and durable revalidation;
- immutable revisions;
- explicit human publication with optimistic concurrency and audit;
- safe checkpoints, bounded retries, and idempotency.

**Boundary**

The Analysis Orchestrator coordinates public contracts and records each stage.
It is not an engine, does not normalize evidence, query engine tables, evaluate
rules, retrieve hidden context, compute Statistics, or make provider output
authoritative.

### 6.9 Phase 8 — Report Generation and Presentation

**Purpose**

Render validated, reviewable artifacts from immutable structured records without
creating a second source of analytical truth.

**Planning focus**

- report identity, schema version, subject revision, and checksum;
- explicit sections for facts, market signals, deterministic findings, case
  analogies, inference, scenarios, uncertainty, counter-signals, and
  falsifiers;
- citations bound to exact snapshot records;
- visible data quality, freshness, conflict, limitations, and cutoff;
- deterministic rendering from one validated immutable revision;
- safe redaction and export behavior;
- analyst inspection before explicit publication.

**Boundary**

Pre-match report generation presents an Analysis revision; it does not create
new claims or bypass validation. Evaluation quality reports remain owned by the
Evaluation Engine in v0.7. Statistics projections remain owned by the
Statistics Engine in v0.8. Post-match Review reports remain bound to verified
outcomes and cannot rewrite pre-match history.

## 7. Dependency Chain

The proposed long-range dependency chain is:

```text
v0.1 foundation and durable execution
  -> pipeline contracts and frozen fixtures
  -> prompt/provider/validation boundary
  -> normalized evidence
  -> deterministic derived features
  -> governed Rule findings
  -> governed Knowledge and Case context
  -> sealed-snapshot LLM orchestration
  -> validated human-published analysis report
  -> post-match Review
  -> Evaluation
  -> Statistics and governed improvement
```

This chain is conceptual. It does not permit one stage to import another
stage's implementation or read another module's tables. Canonical release gates
and public application contracts remain authoritative where the simplified
chain omits parallel work.

## 8. Proposed Sprint Decomposition

The Analysis Engine Foundation theme is too broad for one implementation sprint.
Future governance should decompose it into separately reviewed increments:

1. complete remaining Milestone 3A and canonical v0.1 prerequisites;
2. close the v0.2 documentation and persistence gates;
3. implement Prompt composition and provider-neutral fakes;
4. implement provider adapter and structured validation under bounded
   integration evidence;
5. implement evidence intake and normalization under its owning contracts;
6. implement deterministic feature derivation only after ownership is approved;
7. implement governed Rule evaluation;
8. implement Knowledge retrieval;
9. implement Case retrieval after eligible reviewed fixtures exist;
10. integrate the Analysis Orchestrator and sealed snapshots;
11. implement validated report presentation and explicit publication;
12. proceed to post-match Review, Evaluation, and Statistics only under their
    own release gates.

No future sprint may silently combine all twelve increments to accelerate a
demo.

## 9. Proposed Planning Acceptance for a Future Specification

A later implementation specification should not be approved until it defines:

- one narrow capability and its canonical release alignment;
- exact owning documents and any required ADR gate;
- exact changed-file allowlist;
- explicit package and dependency direction;
- immediate consumers for every package and abstraction;
- exact input, output, state, failure, and empty-result contracts;
- exact version, checksum, cutoff, provenance, and idempotency behavior;
- deterministic fixtures and executable validation commands;
- security, redaction, provider-budget, and cleanup boundaries where relevant;
- migration, rollback, replay, and recovery evidence where persistence changes;
- a stop boundary before the next phase.

## 10. Explicit Exclusions from Sprint 11 Planning

This planning activity does not authorize:

- any source, test, manifest, configuration, lockfile, Docker, Compose, database,
  migration, API, UI, or package change;
- creation of `domain`, `analysis`, `evidence`, engine, provider, job,
  observability, or test-utils packages;
- installation of OpenAI or another provider SDK;
- provider credentials or network calls;
- football data acquisition;
- database models or migrations;
- prompt templates, output schemas, rules, scoring formulas, feature formulas,
  retrieval algorithms, or report schemas;
- an Analysis Orchestrator;
- Redis, BullMQ, pgvector, embeddings, vector search, or microservices;
- live or in-play analysis;
- wagering, guarantees, or financial advice;
- authentication, users, public deployment, or commercialization;
- changes to canonical architecture documents, ADRs, `AGENTS.md`, or
  `docs/PROJECT_STATE.md`;
- a Sprint 11 specification or implementation authorization;
- Sprint 11 implementation.

## 11. Risks and Mitigations

### 11.1 Skipping the Foundation

Risk: analysis code is built on temporary storage, job, audit, readiness, and
recovery behavior.

Mitigation: canonical v0.1 gates remain prerequisites. Planning does not
authorize implementation.

### 11.2 Creating a Monolithic Analysis Engine

Risk: normalization, retrieval, deterministic evaluation, provider access,
validation, and report rendering collapse into one service.

Mitigation: preserve owning modules, public ports, and the Analysis Orchestrator
as coordination only.

### 11.3 Treating Feature Extraction as Inference

Risk: derived values embed hidden policy, unsupported assumptions, or model
behavior.

Mitigation: require versioned deterministic definitions, exact provenance,
units, missing-data semantics, and replay fixtures.

### 11.4 Inventing a Generic Scoring Authority

Risk: a “Scoring Engine” duplicates Rule, Evaluation, or Statistics ownership.

Mitigation: map each score to an existing canonical owner before implementation;
do not create an eighth engine.

### 11.5 Provider-first Development

Risk: an SDK integration dictates domain contracts, leaks provider objects, and
produces output before validation and lineage exist.

Mitigation: define provider-neutral ports, fakes, closed schemas, validators,
and release-bundle identity first.

### 11.6 LLM Authority Leakage

Risk: the model normalizes data, evaluates rules, computes scores, chooses
publication state, or fills missing evidence.

Mitigation: keep those decisions deterministic, typed, versioned, and outside
the provider boundary.

### 11.7 Report-as-Truth Drift

Risk: rendering creates uncited claims or diverges from the validated revision.

Mitigation: render deterministically from one immutable validated subject and
preserve exact citations and checksum identity.

### 11.8 Premature Broad Sprint

Risk: one sprint mixes data, rules, providers, orchestration, persistence, and
presentation, making evidence and rollback ambiguous.

Mitigation: use the phased decomposition and require a separate specification,
architecture review, and authorization for each narrow implementation unit.

## 12. Recommendation

Sprint 11 should remain:

# Analysis Engine Foundation — Planning Only

Its output is the dependency ordering in this document. It establishes how the
project should progress from the accepted Sprint 10 runtime topology toward the
future AI Football Analysis Platform without overriding the canonical roadmap.

The immediate next implementation recommendation is not made by this document.
Before any implementation:

1. reconcile the proposed capability with unfinished Milestone 3A and canonical
   v0.1 work;
2. select one narrow phase with an immediate consumer;
3. complete all owning canonical-document and ADR gates;
4. create a dedicated implementation specification;
5. perform an independent architecture review;
6. obtain explicit implementation authorization.

## 13. Planning Stop Boundary

This document is complete when it has:

- recorded the post-Sprint 10 baseline;
- preserved the canonical v0.1 through v0.5 release order;
- defined the future order for pipeline, provider architecture, normalization,
  feature extraction, deterministic scoring, LLM orchestration, and report
  generation;
- identified ownership boundaries and prerequisite gates;
- explicitly prohibited implementation.

Stop after generating `docs/sprints/SPRINT11_PLANNING.md`.

No Sprint 11 implementation is authorized or started.
