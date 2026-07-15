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

The governing lifecycle is documented in `docs/DEVELOPMENT_WORKFLOW.md`.

The short form is:

`Idea -> Project Bible -> Architecture -> ADR -> Implementation Plan -> Architecture Review -> Implementation Gate -> Sprint Planning -> Sprint Implementation -> Code Review -> Validation -> Release -> Retrospective`

Before implementation:

1. identify the owning milestone and canonical documents;
2. read the required architecture and applicable ADRs;
3. resolve ambiguities in documentation;
4. obtain an approved implementation gate;
5. confirm explicit sprint scope and exclusions.

During implementation:

1. keep changes inside the authorized sprint;
2. preserve package and dependency direction;
3. update tests and documentation with changed contracts;
4. collect executable validation evidence;
5. stop when a higher-authority conflict appears.

After implementation:

1. run affected quality gates;
2. review the diff for scope leakage and secrets;
3. create or update the sprint report;
4. update `docs/PROJECT_STATE.md`;
5. stop before the next sprint unless separately authorized.

## Sprint Workflow

Every sprint must define:

- goal;
- included deliverables;
- explicit exclusions;
- files or areas allowed to change;
- acceptance commands;
- required report;
- stop boundary.

An AI agent must not continue from one sprint into another based on roadmap proximity.

At sprint start:

- verify the previous sprint status;
- inspect the working tree without discarding unrelated work;
- read the implementation plan and gate;
- restate constraints internally before editing.

At sprint completion:

- validate in proportion to risk;
- record failures, fallbacks, and final evidence;
- distinguish sprint completion from milestone or release completion;
- list remaining work without implementing it;
- leave the repository in a reviewable state.

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
- Stop when an authority conflict, missing gate, or destructive choice requires human review.

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
- repository or delivery work: `04`, `14` through `16`, `18`, `20`, and the implementation gate/sign-off;
- architecture decisions: all affected canonical documents and records in `docs/decisions/`.

Read sprint reports for historical evidence, not as replacements for canonical contracts.

## Documentation Maintenance

- `docs/PROJECT_STATE.md` is updated after every sprint and governance milestone.
- `AGENTS.md` changes only when repository-wide AI collaboration rules change.
- `docs/DEVELOPMENT_WORKFLOW.md` changes only when the engineering lifecycle changes.
- Numbered documents own product, domain, engine, persistence, API, and architecture contracts.
- ADRs record durable decisions and supersession history.
- Sprint reports record what happened, validation evidence, and remaining work.

Keep links valid, terminology canonical, and status claims narrower than the evidence.
