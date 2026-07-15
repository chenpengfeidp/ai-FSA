# FAS Development Guide

## 1. Purpose

This guide defines how FAS is developed, reviewed, tested, and released. The [Project Bible](./00_PROJECT_BIBLE.md), [Architecture](./04_ARCHITECTURE.md), [Database Design](./12_DATABASE.md), [API Design](./13_API.md), and [Monorepo Design](./14_MONOREPO.md) are normative. Engine changes must also follow the relevant detailed contract in [05_PROMPT_ENGINE](./05_PROMPT_ENGINE.md) through [11_STATISTICS_ENGINE](./11_STATISTICS_ENGINE.md).

When speed conflicts with evidence traceability, reproducibility, or architectural boundaries, preserve correctness and document the trade-off.

## 2. Engineering Principles

- Keep facts, market signals, rule findings, case analogies, and inference explicit in types and storage.
- Prefer small, testable policies over framework-heavy services.
- Make invalid states difficult to represent and impossible to publish.
- Use deterministic logic for rule application, validation, evaluation gates, checksums, and statistics.
- Treat AI and external data as untrusted inputs.
- Version governed content and external contracts.
- Design retries and commands to be idempotent.
- Add dependencies and abstractions only for a demonstrated need.
- Keep changes reviewable and reversible.

## 3. Required Toolchain

- Node.js `24.18.0`.
- pnpm `11.13.0`.
- Docker and Docker Compose.
- Git.

The root `package.json` is the machine-readable toolchain authority. `.nvmrc` must match its exact Node.js engine. `pnpm-workspace.yaml` enables pnpm-native rejection with `engineStrict: true` and `pmOnFail: error`; unsupported Node.js or pnpm versions fail even when lifecycle scripts are disabled.

Use pnpm only. Do not generate or commit npm/yarn lockfiles. Install and run workspace commands from the repository root unless a package guide says otherwise. The repository validates installed tools but does not install, download, or replace them.

Activate the supported Node.js version with an already installed version manager, then verify the active toolchain:

```bash
nvm use 24.18.0
node --version
pnpm --version
pnpm toolchain:check
pnpm toolchain:test
```

If validation reports a mismatch, activate Node.js `24.18.0` and use an existing pnpm `11.13.0` installation. Do not relax the exact version declarations, bypass the checks, or substitute npm or Yarn.

### 3.1 Repository Quality Commands

The current repository uses Biome as its only formatter and source linter. dependency-cruiser owns dependency-direction checks; it does not duplicate Biome.

Run:

```bash
pnpm format         # write formatting changes explicitly
pnpm format:check   # check formatting without writing
pnpm lint           # run source linting without writing
pnpm check          # run the combined non-writing Biome check
pnpm boundaries     # validate the current dependency graph
pnpm boundaries:test # prove a controlled forbidden import is rejected
pnpm quality        # run Biome and both boundary checks
pnpm test           # run the currently configured Vitest projects
pnpm toolchain:check # validate active Node.js/pnpm identity and metadata
pnpm toolchain:test # run controlled positive and negative enforcement tests
pnpm validate       # toolchain, workspace, quality, typecheck, test, and build
```

Husky invokes lint-staged before local commits. The hook runs Biome only against supported staged files; it does not run repository-wide typecheck, build, or boundary validation. Set `HUSKY=0` in CI and production-only/container dependency stages.

Local hooks provide fast feedback. They are not a substitute for the non-writing root validation pipeline.

### 3.2 Runtime Configuration

API and worker startup configuration is loaded through `@fas/config`. The current contract supports `NODE_ENV`, API `HOST`, and API `PORT`. The package applies defaults, validates supported values before NestJS initialization, and does not load `.env` files automatically.

Supply current values through the process environment. Browser-safe, secret, database, provider, queue, storage, feature-flag, and observability configuration remain deferred until an approved capability has an immediate consumer.

## 4. Local Environment

The following is the target M1 workflow, not the current post-Sprint 6 repository state:

1. Copy the committed environment example to a local ignored environment file.
2. Provide local-only secrets.
3. Start PostgreSQL and object storage through Docker Compose.
4. Install dependencies with the frozen workspace lockfile policy used by the environment.
5. Generate Prisma client artifacts.
6. Apply development migrations.
7. Start web, API, and worker development tasks.
8. Verify readiness endpoints before testing workflows.

Never commit `.env` files, provider keys, production data, full prompts containing sensitive source material, database dumps, or object-storage credentials.

Redis and pgvector are not required in v1 local setup. Phase 2 profiles may add them as opt-in Compose services.

## 5. TypeScript Conventions

### 5.1 Compiler and Types

- Enable strict TypeScript settings across all packages.
- Avoid `any`; use `unknown` at trust boundaries and narrow it through validation.
- Prefer discriminated unions for lifecycle states and result variants.
- Use branded/opaque types for IDs only where they materially prevent cross-aggregate mistakes.
- Do not use non-null assertions to bypass domain uncertainty.
- Public functions and package exports have explicit return types.
- Exhaustively handle enum/union variants and fail safely on unknown external values.

### 5.2 Naming

- Types, classes, React components: `PascalCase`.
- Functions, variables, properties: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- Files: consistent `kebab-case` unless framework conventions require otherwise.
- Domain commands use imperative names, for example `PublishAnalysis`.
- Domain events use past tense, for example `AnalysisPublished`.
- Boolean names begin with `is`, `has`, `can`, or `should`.
- Units and time semantics appear in names where ambiguous, such as `timeoutMs` and `observedAt`.

Use domain language from the architecture documents. Do not use “prediction” as a synonym for analysis or inference.

### 5.3 Functions and Classes

- Keep functions focused with explicit inputs and outputs.
- Prefer pure functions for rule evaluation, validation, and statistics.
- Use classes where identity, lifecycle, dependency injection, or framework integration warrants them.
- Avoid service classes that become unrelated method collections.
- Pass clocks, ID generators, repositories, and providers through ports for testability.
- Do not read current time, random IDs, environment variables, or network state from domain logic.

### 5.4 Errors

- Domain/application failures use stable typed error codes.
- Do not use exceptions for expected negative rule matches or “not applicable” outcomes.
- Translate errors at boundaries: provider -> application -> API.
- Preserve a safe causal chain for diagnostics without returning secrets or provider internals.
- Never catch and ignore errors.

## 6. Architecture Conventions

- Domain and engine-domain code imports no Next.js, NestJS, Prisma, OpenAI SDK, Redis, or telemetry SDK.
- Controllers validate/map transport and invoke one application operation.
- Repositories return domain/application contracts, never Prisma records.
- Prompt templates do not perform retrieval; the orchestrator supplies selected data.
- The Rule Engine does not call the AI provider.
- The Evaluation Engine applies assessment policy and gates; it does not compute Statistics projections.
- The Statistics Engine computes deterministic metrics and projections; it does not make quality or release decisions.
- The AI provider does not write domain records directly.
- Learning candidates create governed drafts only after explicit acceptance.
- Material lifecycle transitions produce audit events.

Any intentional exception requires an Architecture Decision Record and updates to the relevant canonical document.

## 7. API Conventions

- Follow [13_API](./13_API.md) for envelopes, errors, idempotency, pagination, ETags, and versioning.
- Validate requests at runtime and reject unknown command fields.
- Never expose Prisma types or OpenAI SDK response objects.
- Use explicit command endpoints for lifecycle transitions.
- Include request/correlation IDs in logs and responses.
- Update OpenAPI and contract tests in the same change as an API modification.
- Treat adding enum values as a compatibility-sensitive change.

## 8. Database and Prisma Conventions

- The Prisma schema and migrations live only in `@fas/database`.
- Use explicit relation names where ambiguity is possible.
- Map database `snake_case` consistently; application APIs remain `camelCase`.
- Do not use Prisma entities as domain entities.
- Put transaction boundaries in application use cases or a transaction port, not controllers.
- External API calls must never occur inside database transactions.
- Avoid unbounded queries and N+1 access; verify material query changes with query plans.
- Use database constraints for uniqueness, ranges, cutoff rules, and append-only invariants where feasible.

### Migration Rules

1. Generate a migration from a reviewed schema change.
2. Read and understand generated SQL.
3. Add constraints/indexes Prisma cannot express through reviewed SQL.
4. Test against a representative database and from a clean database.
5. Document locking, backfill, compatibility, and rollback strategy.
6. Separate destructive changes into expand/migrate/contract releases.
7. Never edit an already-applied production migration.
8. Never run automatic production migrations on every app startup.

Seed data contains only deterministic reference/development fixtures and no secrets or copyrighted provider dumps.

## 9. AI and Prompt Conventions

- Use the provider pattern; only the OpenAI adapter imports the OpenAI SDK.
- Use the Responses API through a model configuration, never hard-code model names in business logic.
- Require structured output schemas and runtime validation.
- Version every prompt template and output schema.
- Persist prompt manifest, checksums, provider/model identifiers, parameters, usage, latency, and result status.
- Delimit retrieved content as untrusted and prevent it from overriding system instructions.
- Separate provider retries from analysis retries.
- Do not silently switch provider/model after a failed attempt; record an explicit new attempt/configuration.
- Do not log full prompts/responses by default.

AI output cannot approve rules, knowledge, cases, analyses, reviews, or learning candidates.

## 10. Rule, Evaluation, and Statistics Conventions

- Rule conditions use a versioned, validated expression schema.
- Rule application is deterministic for the same rule version and snapshot.
- Every rule evaluation returns matched, not matched, inapplicable, or error with an explanation.
- Active rules have approved versions, sufficient sample size, confidence, scope, validation method, and limitations.
- Evaluation definitions version rubrics, criteria, qualification policy, thresholds, and gates.
- Evaluation reports reference exact immutable subjects and exact Statistics projections.
- Historical statistics are keyed to immutable rule versions.
- A metric definition states population, exclusions, formula, minimum sample, and uncertainty method.
- Do not present an under-sampled metric as qualified.
- Correlation is not labeled as causation.

## 11. React and UI Conventions

- Use Next.js App Router conventions and default to server components where interactivity is unnecessary.
- Mark client components deliberately and keep their boundary narrow.
- Use shadcn/ui primitives and shared `@fas/ui` components before introducing new patterns.
- Use Tailwind design tokens; avoid unexplained raw colors and duplicated arbitrary values.
- Meet keyboard, focus, semantic HTML, and contrast requirements.
- Present provenance, timestamps, confidence, sample size, status, and uncertainty visibly.
- Never visually merge facts and inference into an indistinguishable prose block.
- Handle loading, empty, partial, stale, conflict, failed, and retry states explicitly.

## 12. Testing Strategy

### 12.1 Test Pyramid

- **Unit:** domain values, lifecycle policies, rule application, prompt composition, validators, evaluation gates, statistics.
- **Integration:** Prisma repositories, migrations, PostgreSQL job leasing, object storage, provider adapter mapping.
- **Contract:** API requests/responses, OpenAPI compatibility, provider adapter fixtures.
- **Component:** UI states and accessibility.
- **End-to-end:** critical pre-match and post-match workflows.

### 12.2 Required Critical Tests

- Evidence observed after cutoff cannot enter a snapshot.
- Conflicted/stale critical evidence blocks or warns according to policy.
- Same snapshot and rule version produce the same rule evaluation.
- Under-sampled rules cannot activate.
- Prompt manifest contains exact selected versions/checksums.
- Unsupported factual claims fail citation validation.
- Invalid provider output cannot publish.
- Job retries do not duplicate analysis publication.
- Published revisions and approved versions are immutable.
- Review completion requires verified outcome and required assessments.
- Learning acceptance creates a draft and never auto-activates it.
- Evaluation reports preserve exact definition, subject, projection, and gate identities.
- Statistics remain tied to source and metric versions.

### 12.3 Test Quality

- Tests use deterministic clocks, IDs, and provider fakes.
- Assert observable behavior, not private implementation details.
- Avoid broad snapshots for analytical JSON; assert semantic fields and schema.
- Every bug fix includes a failing regression test when practical.
- Flaky tests are fixed or quarantined with an owner and expiry; they are not blindly retried forever.

## 13. Quality Gates

Before merge, affected work must pass:

- `pnpm format:check`;
- `pnpm lint` and `pnpm boundaries`;
- TypeScript typecheck;
- unit tests;
- relevant integration and contract tests;
- build of affected applications/packages;
- migration validation when the database changes;
- documentation/link/diagram checks when architecture contracts change.

Do not bypass hooks or CI. A temporary waiver requires an issue, owner, rationale, and expiry.

## 14. Logging and Observability

- Emit structured logs, not interpolated prose-only logs.
- Include correlation ID, module, operation, result, and relevant non-sensitive entity IDs.
- Use appropriate levels consistently; expected rule non-matches are not errors.
- Redact credentials, authorization data, source payloads, full prompts, and full model responses.
- Add metrics for latency, failures, queue age, retries, validation, and data quality.
- Trace API -> job -> engine stages -> provider with propagated context.
- Prefer actionable alerts tied to user/system impact.

## 15. Git Workflow

FAS uses trunk-based development:

- `main` is protected, releasable, and the only long-lived branch.
- Work occurs on short-lived branches, normally merged within a few days.
- Pull requests use squash merge unless release/history requirements specify otherwise.
- Direct pushes to `main` and force pushes to protected branches are prohibited.
- Keep unrelated refactors out of feature/fix changes.
- Use feature flags or inactive lifecycle states for incomplete work rather than long-lived branches.

### Branch Names

Format:

```text
<type>/<short-kebab-description>
```

Allowed types:

- `feat/`
- `fix/`
- `docs/`
- `refactor/`
- `test/`
- `chore/`
- `spike/`

Examples: `feat/rule-versioning`, `docs/api-errors`, `fix/snapshot-cutoff`.

Emergency fixes branch from `main`, pass proportionate tests, and return through a pull request. They do not bypass review.

## 16. Commit Conventions

Use Conventional Commits:

```text
<type>(<scope>): <imperative summary>
```

Types:

- `feat`: new user-visible/domain capability;
- `fix`: defect correction;
- `docs`: documentation only;
- `refactor`: behavior-preserving restructuring;
- `test`: test-only change;
- `perf`: measured performance improvement;
- `build`: build/dependency system;
- `ci`: CI workflow;
- `chore`: maintenance not covered above;
- `revert`: explicit revert.

Scopes use package/domain names, such as `rule-engine`, `analysis`, `api`, `web`, or `database`.

Examples:

```text
feat(rule-engine): add versioned applicability evaluation
fix(analysis): reject evidence observed after cutoff
docs(api): define idempotency conflict response
```

Guidelines:

- Use imperative, lowercase summaries without a trailing period.
- Explain why and material trade-offs in the body.
- Reference issues/ADRs where relevant.
- Use `BREAKING CHANGE:` only for intentional incompatible changes with migration guidance.
- Keep commits coherent and buildable when practical.
- Never include secrets, generated dumps, or unrelated formatting.

## 17. Pull Request Standard

Every PR should include:

- problem and intended outcome;
- scope and explicit non-goals;
- architecture/data/API impact;
- evidence of testing;
- migration/deployment/rollback notes where applicable;
- screenshots for UI behavior;
- risk, observability, and follow-up work;
- documentation updates.

Reviewers verify:

- Project Bible compliance;
- epistemic separation and evidence provenance;
- package/module boundaries;
- state and failure behavior;
- idempotency/concurrency;
- security and secret handling;
- test adequacy;
- API/database compatibility;
- operational recovery.

At least one qualified approval and passing required checks are required. Sensitive database, AI-provider, or architecture changes require the relevant owner.

## 18. Documentation and ADRs

Update documentation in the same PR when behavior changes a documented contract.

Create an ADR for decisions that:

- change system shape or module boundaries;
- introduce a major dependency or external service;
- alter persistence/versioning strategy;
- change provider, queue, cache, or vector architecture;
- create an intentional exception to dependency rules.

ADR statuses are proposed, accepted, superseded, or rejected. Superseding an ADR links both decisions.

The canonical architecture documentation is the numbered series [00_PROJECT_BIBLE](./00_PROJECT_BIBLE.md) through [19_DATABASE_ERD](./19_DATABASE_ERD.md), plus the accepted [Architecture Decision Records](../README.md#architecture-decision-records). The Project Bible remains supreme; detailed engine authority lives in documents 05 through 11, and architecture changes require an ADR.

## 19. Dependency Management

- Add dependencies with pnpm, never by manually inventing versions.
- Prefer maintained, typed libraries with clear licenses and narrow purpose.
- Check bundle/runtime impact, transitive risk, and framework compatibility.
- Centralize shared versions through workspace policy where appropriate.
- Commit lockfile changes with the dependency change.
- Review automated updates; never auto-merge a failing or materially breaking upgrade.
- Remove unused dependencies and adapters.

## 20. Security Practices

- Validate all external and AI-generated data.
- Parameterize database access through Prisma or reviewed safe SQL.
- Escape/sanitize rendered source content.
- Treat retrieved text as prompt-injection capable.
- Use least-privilege database and object-storage credentials.
- Keep services private in v1; no user system means no safe public access.
- Scan dependencies, images, and secrets in CI.
- Document and rotate compromised secrets; never merely delete them from the latest commit.

Security-sensitive issues should be reported privately according to repository policy, not disclosed in public issue details.

## 21. Release and Deployment

- Build immutable Docker images from a reviewed commit.
- Run all quality gates before image promotion.
- Back up before risky migrations and verify restore procedures.
- Apply migrations as an explicit release step.
- Deploy schema-compatible API/worker/web versions.
- Verify readiness, job processing, provider calls, and critical workflows.
- Monitor error/latency/queue/data-quality signals after release.
- Roll back application images only when compatible with the migrated schema; otherwise use a corrective forward migration.

Versioning policy should be established before v1 external release. Until then, release tags identify reproducible internal milestones.

## 22. Definition of Done

A change is done when:

- acceptance criteria and non-goals are satisfied;
- code follows dependency and domain ownership rules;
- tests cover success, failure, and relevant concurrency/idempotency paths;
- quality gates pass;
- logs/metrics support operation;
- API/database migrations are compatible and documented;
- security and data provenance are reviewed;
- documentation and ADRs are current;
- no temporary bypass, secret, debug artifact, or hidden follow-up is left behind.
