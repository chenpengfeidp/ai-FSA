# AI Agent Guide

## Purpose

This is the canonical entry point for every AI agent working in Football Analysis System (FAS).

Use it to determine what to read, which documents are authoritative, how work is approved, and what must never be inferred or implemented without an explicit gate.

For the live delivery snapshot, read `docs/PROJECT_STATE.md`.

## Project Overview

FAS is an evidence-first, reviewable AI football analysis platform.

Its purpose is long-term analytical improvement, not isolated prediction accuracy.

The system must:

- distinguish facts, market signals, deterministic findings, case analogies, inference, scenarios, and uncertainty;
- preserve exact provenance and version identity;
- make every analysis reviewable and reproducible in context;
- keep deterministic decisions outside generative AI;
- allow AI and reviews to propose learning without automatic approval or activation.

V1 is a trusted private-environment product. It has no users, authentication, public deployment, live analysis, wagering advice, subscriptions, notifications, or commercialization.

## Authority Order

When documents disagree, use this order:

1. `docs/00_PROJECT_BIBLE.md`
2. Accepted Architecture Decision Records in `docs/decisions/`
3. Owning numbered architecture documents
4. Approved implementation plan and implementation gate/sign-off
5. `docs/PROJECT_STATE.md`
6. Sprint plans and sprint reports
7. Existing implementation
8. Comments, examples, and agent assumptions

Stop and request review when a conflict cannot be resolved by this hierarchy. Never create a parallel source of truth to avoid correcting the owning document.

## Architecture Overview

FAS is a full-TypeScript modular monolith in a pnpm workspace coordinated by Turborepo.

Runtime composition roots are:

- `apps/web`: Next.js App Router presentation;
- `apps/api`: NestJS REST transport;
- `apps/worker`: standalone NestJS background-runtime composition.

Implemented shared platform packages are `@fas/tsconfig` for compiler policy and `@fas/config` for server-side API and worker startup configuration.

The target architecture uses ports and adapters:

- presentation and transport depend on application contracts;
- application services coordinate domain operations;
- domain and engine policy remain framework-neutral;
- infrastructure implements inward-facing ports;
- PostgreSQL is the V1 system of record;
- Prisma is owned only by the database package;
- provider-specific AI details remain inside provider adapters.

The seven governed engines are Prompt, Knowledge, Rule, Case, Review, Evaluation, and Statistics.

The Analysis Orchestrator coordinates engines but is not itself an engine.

Redis, BullMQ, pgvector, microservices, and semantic retrieval are Phase 2 decisions requiring measured need and separate approval.

## Engineering Principles

- Evidence before intuition.
- Correctness before apparent fluency.
- Make invalid states difficult to represent and impossible to publish.
- Preserve immutable identities, versions, checksums, and lineage.
- Keep facts, signals, findings, analogies, and inference separate.
- Keep deterministic work deterministic.
- Treat AI output and external data as untrusted inputs.
- Fail explicitly; never convert failure into empty success.
- Design commands and retries for idempotency.
- Add dependencies, packages, and abstractions only for immediate consumers.
- Prefer small, reversible, reviewable changes.
- Record acceptance evidence instead of relying on claims.

## Coding Philosophy

- Use strict TypeScript.
- Use `unknown` at trust boundaries; avoid `any`.
- Prefer discriminated unions for states and result variants.
- Give public functions and package exports explicit return types.
- Handle union variants exhaustively.
- Keep functions focused with explicit inputs and outputs.
- Prefer pure functions for rules, validation, evaluation policy, and statistics.
- Inject clocks, identifiers, repositories, and providers through ports.
- Do not read time, randomness, environment, network, or filesystem state from domain logic.
- Translate errors at boundaries and preserve safe causal context.
- Never catch and ignore errors.
- Use canonical domain language; do not use “prediction” as a synonym for analysis.
- Do not expose Prisma records or provider SDK objects as contracts.
- Do not add speculative compatibility layers or empty package APIs.

## Architecture Philosophy

- Domain code imports no Next.js, NestJS, Prisma, provider SDK, Redis, or telemetry SDK.
- Controllers validate and map transport, then invoke application operations.
- Repositories return domain/application contracts, not persistence records.
- Engines communicate through declared application contracts, not direct table reads.
- Cross-module writes use the owning module’s command interface.
- Prompt composition does not perform retrieval.
- The Rule Engine never delegates deterministic evaluation to AI.
- Evaluation applies quality policy but does not compute Statistics projections.
- Statistics computes projections but does not make release decisions.
- Provider adapters cannot publish or write domain state directly.
- AI drafts; FAS validates; a human publishes.
- Governed learning creates proposals or drafts, never automatic activation.
- Intentional architecture exceptions require an ADR and canonical-document updates.

## Development Workflow

For small, well-bounded work inside the existing architecture, use:

`Small implementation task -> Code -> Test -> Review -> Sprint Report (optional) -> Tag / Release`

Planning and specification documents are optional for normal feature and
maintenance work. Their absence must not block a small implementation task
whose goal, scope, affected area, and acceptance evidence are clear.

A dedicated plan, specification, and architecture review are required when work
introduces:

- a major architectural change;
- new infrastructure;
- cross-module refactoring;
- a breaking architectural decision.

Significant decisions still follow the comprehensive governance lifecycle in
`docs/DEVELOPMENT_WORKFLOW.md`. Existing architecture documents, ADRs,
implementation plans, sign-offs, and technical standards remain authoritative.

Before coding:

1. identify the task goal, explicit scope, exclusions, and affected files or
   areas;
2. read the owning canonical documents and applicable ADRs;
3. inspect the working tree without discarding unrelated work;
4. escalate only when the task crosses one of the planning triggers above or a
   higher-authority conflict is present.

During coding:

1. keep changes inside the stated task scope;
2. preserve package and dependency direction;
3. add or update tests with behavior changes;
4. update documentation alongside or after implementation when behavior or a
   contract changes;
5. collect executable validation evidence;
6. stop when a higher-authority conflict appears.

After coding:

1. run affected tests and quality gates;
2. review the diff for correctness, scope leakage, generated files, and secrets;
3. perform code review;
4. create a sprint report only when requested or when the change needs a durable
   delivery evidence record;
5. create tags or releases only when explicitly requested and after validation.

## Sprint Workflow

Small tasks do not require separate `Planning.md` or `Specification.md`
artifacts. The user request, issue, or task brief may define the implementation
scope directly.

Every implementation task still needs:

- a clear goal;
- explicit inclusions and exclusions;
- identifiable permitted change areas;
- acceptance behavior or commands;
- a stop boundary when the request is part of a larger roadmap.

At task completion:

- validate in proportion to risk;
- record material failures and fallbacks in the review or optional report;
- distinguish task completion from milestone or release completion;
- leave the repository in a reviewable state.

Existing Sprint planning, specification, review, approval, and report documents
remain immutable historical records. They do not impose a documentation-first
requirement on later small implementation tasks.

## Rules for AI Agents

- Read this file and `docs/PROJECT_STATE.md` first.
- Follow the repository reading order below before relevant changes.
- Do not invent approval, requirements, endpoints, tables, packages, or engine behavior.
- Do not modify files outside the explicit task scope.
- Do not turn documentation work into implementation work.
- Do not turn diagnosis into a fix unless the request authorizes changes.
- Do not create business code during bootstrap or governance tasks.
- Do not create future packages merely to mirror a target tree.
- Do not install Redis, BullMQ, pgvector, or provider SDKs without an approved milestone.
- Do not add authentication or expose the system publicly in V1.
- Do not bypass tests, hooks, typechecks, architecture checks, or CI.
- Do not hide compatibility failures; record evidence and use only approved fallbacks.
- Do not edit lockfiles by hand.
- Do not commit secrets, `.env` files, credentials, provider payloads, or production data.
- Do not run destructive Git commands or overwrite user changes.
- Do not create commits, push branches, or open pull requests unless explicitly requested.
- Prefer existing repository tools and patterns over introducing alternatives.
- Ask one focused question when a missing decision materially changes the result.
- Stop when an authority conflict, a triggered planning requirement, or a
  destructive choice requires human review.

## Validation Baseline

Run commands from the repository root with the pinned Node.js and pnpm versions.

Current baseline commands are:

- `pnpm install --frozen-lockfile`
- `pnpm workspace:check`
- `pnpm quality`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`

Use application development commands only when runtime validation is in scope:

- `pnpm dev:api`
- `pnpm dev:web`
- `pnpm dev:worker`

Add narrower or stronger checks when the affected area requires them.

## Repository Reading Order

For every task:

1. `AGENTS.md`
2. `docs/PROJECT_STATE.md`
3. `README.md`
4. `docs/00_PROJECT_BIBLE.md`

Then read by change type:

- product or architecture: `01` through `04`, then affected downstream contracts;
- engine work: `04`, `15`, the owning engine document from `05` through `11`, and applicable ADRs;
- data or API: `02`, `04`, `12`, `13`, `19`, and the owning engine document;
- backend work: `02`, `04`, `12` through `19`, and affected engine documents;
- analysis workflow: `02` through `11`, `13`, and `17`;
- repository or delivery work: `04`, `14` through `16`, `18`, `20` through `23`, and the applicable current milestone governance listed below;
- architecture decisions: all affected canonical documents and records in `docs/decisions/`.

For current vertical-slice and post-bootstrap delivery work, also read:

- `docs/34_V2_ARCHITECTURE_ALIGNMENT.md`;
- `docs/35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md`;
- `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md`;
- `docs/sprints/VERTICAL_SLICE_B1_ODDS_INGEST_SPEC.md`;
- `docs/sprints/VERTICAL_SLICE_B2_AH_MARKET_SPEC.md`.

For historical Milestone 3A / Sprint 8 bootstrap evidence, also read:

- `docs/sprints/MILESTONE_3A_GATE_REVIEW.md`;
- `docs/sprints/FINAL_REPOSITORY_HEALTH_REPORT.md`;
- `docs/sprints/SPRINT7_REPORT.md`;
- `docs/sprints/SPRINT8_SPECIFICATION.md`;
- `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT.md`;
- `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT_APPROVAL.md`;
- `docs/sprints/SPRINT8_PRE_IMPLEMENTATION_AUDIT.md`.

Read sprint reports for historical evidence, not as replacements for canonical contracts.

## Documentation Maintenance

- `docs/PROJECT_STATE.md` is updated after every sprint and governance milestone.
- `AGENTS.md` changes only when repository-wide AI collaboration rules change.
- `docs/DEVELOPMENT_WORKFLOW.md` changes only when the engineering lifecycle changes.
- Numbered documents own product, domain, engine, persistence, API, and architecture contracts.
- ADRs record durable decisions and supersession history.
- Sprint reports record what happened, validation evidence, and remaining work.

Keep links valid, terminology canonical, and status claims narrower than the evidence.
