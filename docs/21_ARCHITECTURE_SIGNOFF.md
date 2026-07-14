# FAS Milestone 3A Architecture Sign-off

## 1. Record

- Decision body: FAS Architecture Board
- Scope: Milestone 3A — Repository Bootstrap Planning
- Canonical roadmap mapping: v0.1 / M1 Foundation bootstrap sub-milestone
- Reviewed document: [20_IMPLEMENTATION_PLAN](./20_IMPLEMENTATION_PLAN.md)
- Review basis: Project Bible, numbered architecture documents, and ADR-001 through ADR-004
- Decision date: 2026-07-14
- Decision: **APPROVED WITH CONDITIONS**

## 2. Purpose and Authority

This record evaluates the independent architecture-review findings for the repository bootstrap. It does not redesign or replace the implementation plan. It classifies each finding, records the Architecture Board decision, and establishes the conditions under which implementation may begin.

[20_IMPLEMENTATION_PLAN](./20_IMPLEMENTATION_PLAN.md) remains unchanged. Where this sign-off narrows, defers, or rejects a review recommendation, this record is the governing approval addendum for Milestone 3A.

The Board applied these decision principles:

1. evidence before assumption;
2. keep v1 operationally minimal;
3. build only capabilities with an immediate consumer;
4. prefer reversible evolution over speculative infrastructure;
5. preserve domain, evidence, and AI trust boundaries;
6. require executable acceptance evidence for bootstrap claims.

## 3. Decision Categories

Every finding is assigned exactly one category:

- **Must Fix Before Implementation:** a binding correction to the bootstrap baseline. The correction in this record must be followed before the affected setup or code is created.
- **Approved but Deferred to a Future Milestone:** valuable work without an immediate Milestone 3A consumer.
- **Documentation Alignment Required:** no architecture redesign is needed, but canonical documentation must be aligned in the implementation change or before the affected future capability.
- **Rejected:** the recommendation adds insufficient value, duplicates an existing control, or conflicts with minimal evolutionary delivery.

## 4. Must Fix Before Implementation

### MF-01 — Prisma Generation Dependency Graph

- **Review finding:** Generated Prisma output is ignored while typecheck, tests, and build can run before generation.
- **Decision:** Add a first-class `generate` task. Database typecheck, test, and build depend on Prisma generation. CI runs generation immediately after installation and before static checks that resolve the generated client.
- **Architectural rationale:** A clean clone is the primary evidence of reproducibility. Hidden local generated state would invalidate the acceptance claim.
- **Impact:** Turbo task graph, root scripts, database package scripts, and CI order.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, before Prisma-dependent files are introduced

### MF-02 — Prisma No-model Bootstrap Contract

- **Review finding:** The bootstrap intentionally has no domain models, but the planned generation command does not define no-model behavior, config location, or validation environment.
- **Decision:** Use explicit Prisma config selection, `--allow-no-models`, and a non-secret CI validation URL. Verify commands from both repository root and database-package context.
- **Architectural rationale:** Domain tables must not be invented to satisfy tooling. Explicit no-model generation preserves the milestone boundary.
- **Impact:** Prisma scripts, CI environment, database tests, and README commands.
- **Owner:** Database Platform
- **Target milestone:** Milestone 3A, Prisma setup

### MF-03 — Vitest 4 Configuration

- **Review finding:** `vitest.workspace.ts` is obsolete for the selected Vitest major.
- **Decision:** Use root `vitest.config.ts` with explicit `test.projects`. Acceptance must prove all intended application and package projects are discovered.
- **Architectural rationale:** A test command that silently omits projects is worse than no test claim.
- **Impact:** Root file plan, test scripts, Turbo outputs, and CI.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A, before test scaffolding

### MF-04 — Exact Dependency Baseline

- **Review finding:** Several dependencies remain described as “compatible stable,” while the plan requires exact direct pins.
- **Decision:** Resolve and record a complete direct dependency matrix before the first install. It must include Tailwind's PostCSS plugin if Tailwind remains, Nest test dependencies, Node-compatible type packages, Prisma PostgreSQL adapter, `pg`, and all CLI/build dependencies.
- **Architectural rationale:** Exact pins and one lockfile are the evidence supporting reproducible builds. Transitive compatibility must not be guessed.
- **Impact:** Root and workspace manifests, lockfile, compatibility report.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, before dependency installation

### MF-05 — Runtime and Package-manager Enforcement

- **Review finding:** `.node-version` and `packageManager` communicate versions but do not by themselves reject unsupported environments.
- **Decision:** Define exact Node engine requirements, pnpm package-manager enforcement, and the supported bootstrap command for pnpm activation. Installation must fail clearly on unsupported runtime or package-manager versions.
- **Architectural rationale:** Runtime drift is a direct source of false build evidence.
- **Impact:** Root manifest, setup documentation, CI bootstrap.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A, workspace setup

### MF-06 — TypeScript, ESM, NestJS, and Prisma Compatibility Gate

- **Review finding:** TypeScript 7 and ESM compatibility is plausible but unproven for NestJS decorators, Prisma-generated code, tests, and container execution.
- **Decision:** The first technical gate is a runtime compatibility spike covering compilation, decorator metadata, API startup, worker startup, Prisma generation, Next build, Vitest, and container execution. Package expansion stops if it fails. The documented TypeScript 6 fallback may be used only with recorded evidence.
- **Architectural rationale:** Evidence First requires testing the highest-risk compatibility assumption before multiplying packages.
- **Impact:** Bootstrap order and selected TypeScript/module settings.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, first implementation gate

### MF-07 — Next.js Generated Types

- **Review finding:** `next-env.d.ts` was treated as a committed artifact although current Next tooling manages it.
- **Decision:** Treat framework-generated type files according to the selected Next version's documented behavior. Add `next typegen` where standalone typechecking requires it, include generated `.next/types`, and do not use generated-file commits as a source of truth.
- **Architectural rationale:** Generated framework state must be reproducible rather than manually governed.
- **Impact:** `.gitignore`, web TypeScript configuration, typecheck pipeline.
- **Owner:** Web Platform
- **Target milestone:** Milestone 3A, web bootstrap

### MF-08 — Docker Build and Packaging Strategy

- **Review finding:** Compose validation alone does not build Dockerfiles, and monorepo artifact packaging is unspecified.
- **Decision:** Choose one documented packaging path—Turbo prune or pnpm deploy—before Dockerfiles are created. Build contexts originate at repository root. The strategy must cover shared packages, Prisma-generated output, Next standalone tracing, final-stage commands, and non-root runtime users.
- **Architectural rationale:** Containers are a v1 deployment boundary, not decorative files. An unbuildable image invalidates bootstrap completion.
- **Impact:** Dockerfiles, Next configuration, Turbo outputs, Compose, CI.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, before container definitions

### MF-09 — Executable Container Acceptance

- **Review finding:** `docker compose config` and a PostgreSQL health check do not validate application images or runtime behavior.
- **Decision:** Acceptance must build web, API, and worker images, start the approved Compose profile, wait with bounded timeouts, verify API/web behavior, verify worker lifecycle, and perform deterministic shutdown.
- **Architectural rationale:** Runtime claims require observed runtime evidence.
- **Impact:** Smoke script, CI, Compose health checks, acceptance criteria.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, release gate

### MF-10 — Worker Lifecycle

- **Review finding:** An empty Nest application context may exit and does not prove a persistent worker service.
- **Decision:** Until PostgreSQL polling has an immediate consumer, place the worker service behind an explicit non-default Compose profile. The worker bootstrap test must still prove initialization, signal handling, and clean shutdown. No artificial idle loop is approved.
- **Architectural rationale:** A fake persistent loop is speculative behavior. An opt-in profile preserves the runtime boundary without pretending the worker is operational.
- **Impact:** Compose profiles, worker acceptance, README.
- **Owner:** Backend Platform
- **Target milestone:** Milestone 3A

### MF-11 — Operational API Contract

- **Review finding:** Planned readiness checks cover only database availability and omit `/version`.
- **Decision:** The bootstrap API provides `/health/live`, `/health/ready`, and `/version`. Readiness covers validated required configuration, database connectivity, and explicit bootstrap schema-compatibility state. Build identity contains no secrets.
- **Architectural rationale:** Operational contracts are immediate consumers of the API shell and are already canonical in [13_API](./13_API.md).
- **Impact:** API contracts, API files, tests, smoke script, container health checks.
- **Owner:** Backend Platform
- **Target milestone:** Milestone 3A, API shell

### MF-12 — Turbo Environment and Cache Policy

- **Review finding:** Excluding all environment inputs can restore behaviorally incompatible builds.
- **Decision:** Separate build-affecting non-secret variables, runtime pass-through secrets, ignored local environment files, and uncached tasks. Compiled public variables participate in cache keys. Secrets never enter cache artifacts.
- **Architectural rationale:** Correct cache reuse and secret isolation are both required; one cannot be traded for the other.
- **Impact:** `turbo.json`, CI environment, Next build, documentation.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A, Turbo configuration

### MF-13 — Deterministic Runtime Smoke Contract

- **Review finding:** Runtime acceptance lacks exact commands, URLs, transitions, timeouts, signal behavior, correlation checks, and redaction assertions.
- **Decision:** Add one executable smoke workflow covering liveness, readiness down/up behavior, version response, web response, worker profile behavior, correlation propagation, secret canaries, timeouts, and cleanup.
- **Architectural rationale:** Acceptance prose is not evidence until it is executable and repeatable.
- **Impact:** Test/tooling files, CI, acceptance criteria.
- **Owner:** Quality Engineering
- **Target milestone:** Milestone 3A, release gate

### MF-14 — Host Exposure

- **Review finding:** A private Docker network does not prevent services from binding to all host interfaces.
- **Decision:** Local published ports bind explicitly to `127.0.0.1`. PostgreSQL is not published outside the local development profile. Rendered Compose configuration is inspected in acceptance.
- **Architectural rationale:** V1 has no user system and must not be publicly exposed.
- **Impact:** Compose profiles and security acceptance.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A

### MF-15 — Baseline Security Gates

- **Review finding:** Dependabot alone is not dependency, secret, or image scanning.
- **Decision:** Add proportionate automated checks for high-severity dependency findings, committed-secret detection, and built-image vulnerabilities. Thresholds must be documented and initially limited to actionable high/critical findings.
- **Architectural rationale:** The repository produces dependencies and container images immediately; therefore these checks have immediate consumers. Broader enterprise policy is not required.
- **Impact:** GitHub Actions and release evidence.
- **Owner:** Security/Platform
- **Target milestone:** Milestone 3A, CI completion

### MF-16 — Package Names and Export Maps

- **Review finding:** Workspace package names are implied but not explicit.
- **Decision:** Every created workspace package uses `@fas/<name>`, an explicit export map, and no deep-import escape path.
- **Architectural rationale:** Stable ownership and dependency direction begin at package identity.
- **Impact:** Workspace manifests and architecture checks.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A, package creation

### MF-17 — Automated Boundary Failure Proof

- **Review finding:** A documented manual validation could satisfy the boundary acceptance wording.
- **Decision:** Boundary acceptance must be executable. CI includes a controlled forbidden-import fixture or equivalent test proving that a prohibited Prisma/framework/deep import is rejected.
- **Architectural rationale:** Mechanical architecture rules require mechanical evidence.
- **Impact:** dependency-cruiser configuration and CI test assets.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A

### MF-18 — Husky Environment Behavior

- **Review finding:** Hook installation may fail or produce noise in CI and production-only container installs.
- **Decision:** Guard hook installation explicitly and disable it in CI/container dependency stages. Local pre-commit runs only the approved staged Biome check; CI remains authoritative.
- **Architectural rationale:** Local convenience must not become a build-time dependency.
- **Impact:** root scripts, Docker environment, CI.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A

## 5. Approved but Deferred to a Future Milestone

### DF-01 — OpenAPI and Swagger Artifact

- **Review finding:** Swagger is listed without setup, artifact generation, freshness validation, or acceptance.
- **Decision:** Defer Swagger/OpenAPI generation to v0.2, when the first non-operational API contract has an immediate consumer. Do not install Swagger during Milestone 3A. Health and version responses remain contract-tested directly.
- **Architectural rationale:** Generating an API artifact for three operational endpoints adds maintenance without validating business transport design. The provider/prompt foundation creates the first justified expansion point.
- **Impact:** Smaller bootstrap dependency surface; no v0.2 API compatibility is precluded.
- **Owner:** API Platform
- **Target milestone:** v0.2 Prompt, Provider, and Validation Foundation

### DF-02 — Object Storage

- **Review finding:** Canonical architecture anticipates object storage, while the bootstrap omits it.
- **Decision:** Defer the object-storage port, adapter, and local S3-compatible service until v0.2, when provider payloads or governed artifacts become immediate consumers.
- **Architectural rationale:** An unused storage service and package would violate “build only what has an immediate consumer.” PostgreSQL is sufficient for repository bootstrap.
- **Impact:** Local bootstrap remains smaller; canonical local-development wording requires alignment.
- **Owner:** Platform/Foundation with AI Platform
- **Target milestone:** v0.2

### DF-03 — Shared Test Utilities Package

- **Review finding:** `@fas/test-utils` does not yet have two demonstrated consumers.
- **Decision:** Do not create the package in Milestone 3A unless API and worker tests consume at least one real deterministic utility. Otherwise defer it.
- **Architectural rationale:** Shared packages require demonstrated reuse, not anticipated reuse.
- **Impact:** The package file list is conditional; tests may keep local helpers.
- **Owner:** Quality Engineering
- **Target milestone:** First milestone with two genuine consumers, no later than v0.2

### DF-04 — TailwindCSS and shadcn/ui

- **Review finding:** Styling dependencies may have no bootstrap requirement.
- **Decision:** Defer TailwindCSS and shadcn/ui unless the approved web shell acceptance requires styled shared primitives. Plain minimal CSS is sufficient for health/status presentation.
- **Architectural rationale:** Styling infrastructure is not evidence of repository correctness.
- **Impact:** Smaller web dependency and configuration surface.
- **Owner:** Web Platform
- **Target milestone:** First user-facing workflow milestone

### DF-05 — Domain Shared Primitives

- **Review finding:** The planned Domain package risks becoming an empty stub; the review suggested seeding speculative primitives.
- **Decision:** Create `@fas/domain` only when a bootstrap contract has an immediate framework-neutral primitive consumer. Do not seed IDs, Result types, or epistemic enums merely to populate the package.
- **Architectural rationale:** Domain APIs should emerge from proven domain operations and canonical meaning, not bootstrap pressure.
- **Impact:** Domain package creation becomes conditional.
- **Owner:** Domain Architecture
- **Target milestone:** First milestone with a concrete shared domain consumer

### DF-06 — Prisma Logical-owner Schema Sections

- **Review finding:** The no-model schema could pre-create logical-owner sections.
- **Decision:** Defer owner sections until the first approved model/migration. The bootstrap schema contains datasource and generator configuration only.
- **Architectural rationale:** Empty commented sections provide no executable boundary evidence.
- **Impact:** No effect on future schema ownership.
- **Owner:** Database Platform
- **Target milestone:** v0.1 Foundation continuation

### DF-07 — Redis, BullMQ, pgvector, and Advanced AI Infrastructure

- **Review finding:** Future repository scalability and AI evolution require queue, cache, vector, and provider capabilities.
- **Decision:** Retain existing deferral. Adoption requires the measured triggers and ADR process already defined.
- **Architectural rationale:** None has a Milestone 3A consumer, and each increases operational cost.
- **Impact:** No Phase 2 infrastructure enters bootstrap.
- **Owner:** Architecture Board
- **Target milestone:** Phase 2, subject to evidence

## 6. Documentation Alignment Required

### DA-01 — Bootstrap Versus Full v0.1

- **Review finding:** The implementation plan can be read as completing canonical v0.1 although it covers only repository bootstrap.
- **Decision:** Milestone 3A is a non-release bootstrap sub-milestone. It does not satisfy or tag v0.1. Remaining v0.1 work includes durable jobs, audit/idempotency, approved migrations, and append-only result persistence.
- **Architectural rationale:** Milestone evidence must match milestone claims.
- **Impact:** Branch, PR, README, release notes, and acceptance wording.
- **Owner:** Delivery Lead
- **Target milestone:** Milestone 3A implementation PR

### DA-02 — Biome and Dependency-cruiser Authority

- **Review finding:** [14_MONOREPO](./14_MONOREPO.md) still describes an ESLint configuration package while the approved bootstrap selects Biome plus dependency-cruiser.
- **Decision:** Align MONOREPO and DEVELOPMENT GUIDE in the same implementation change before tooling is declared complete. Biome owns formatting/linting; dependency-cruiser owns dependency direction.
- **Architectural rationale:** Parallel lint authorities create contradictory maintenance paths.
- **Impact:** Canonical documentation and package tree.
- **Owner:** Developer Experience
- **Target milestone:** Milestone 3A implementation PR

### DA-04 — ADR-004 Visibility

- **Review finding:** ADR-004 is not referenced consistently by the high-level Architecture and Backend Architecture decision lists.
- **Decision:** Add ADR-004 references before v0.1 continuation begins result persistence. This omission does not block repository bootstrap.
- **Architectural rationale:** Match-result implementation must discover its governing append-only decision.
- **Impact:** Architecture document references.
- **Owner:** Architecture Board
- **Target milestone:** v0.1 Foundation continuation, before result persistence

### DA-05 — Rollback Under Squash Merge

- **Review finding:** Per-commit rollback is incompatible with the default squash-merge workflow.
- **Decision:** Align rollback language around whole-PR revert, independently merged PR slices, configuration rollback, and immutable image rollback. Branch-local commits remain review aids, not post-merge rollback units.
- **Architectural rationale:** Rollback procedures must match actual repository history.
- **Impact:** Implementation PR structure and operational documentation.
- **Owner:** Delivery Lead
- **Target milestone:** Milestone 3A implementation PR

### DA-06 — README Reading Order

- **Review finding:** The implementation plan is not yet listed in README.
- **Decision:** Add documents 20 and 21 to the architecture reading order after sign-off is accepted.
- **Architectural rationale:** Approved implementation authority must be discoverable.
- **Impact:** README only.
- **Owner:** Documentation Owner
- **Target milestone:** Milestone 3A implementation PR

### DA-07 — Tooling Directory Placement

- **Review finding:** App-local Dockerfiles differ from the illustrative `tooling/docker` tree.
- **Decision:** Document app-local Dockerfiles as the accepted ownership choice if retained. Shared scripts belong under `tooling/` only when multiple applications consume them.
- **Architectural rationale:** Co-location improves ownership; shared directories require actual reuse.
- **Impact:** MONOREPO structure description.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A implementation PR

### DA-08 — Known Logical and Physical Persistence Gaps

- **Review finding:** Retrieval specifications, release bundles, readiness/execution policies, and validation identities remain logical designs without complete physical/API contracts.
- **Decision:** Preserve the existing roadmap gates. Do not add these entities during repository bootstrap.
- **Architectural rationale:** They belong to owning engine milestones and have no current consumer.
- **Impact:** No bootstrap code; future documentation gates remain mandatory.
- **Owner:** Owning Engine Leads
- **Target milestone:** v0.2 through v0.5 as assigned by [16_IMPLEMENTATION_ROADMAP](./16_IMPLEMENTATION_ROADMAP.md)

## 7. Rejected Findings

### RJ-04 — Create Every Future Package

- **Review finding:** Scaffold all modules in the target monorepo structure for future scalability.
- **Decision:** Rejected.
- **Architectural rationale:** Empty packages freeze speculative APIs and violate high cohesion and immediate-consumer rules.
- **Impact:** Engine and infrastructure packages are created incrementally.
- **Owner:** Architecture Board
- **Target milestone:** Each owning milestone

### RJ-05 — Remove NestJS CLI Unconditionally

- **Review finding:** Do not retain NestJS CLI after scaffolding.
- **Decision:** Rejected as a blanket rule.
- **Architectural rationale:** The CLI is permitted if a committed build or development script consumes it. An unused CLI is prohibited by normal dependency policy.
- **Impact:** Dependency presence follows actual scripts.
- **Owner:** Backend Platform
- **Target milestone:** Milestone 3A dependency finalization

### RJ-06 — Treat Dependabot Processing as a Local Acceptance Command

- **Review finding:** Add a local mechanism proving GitHub Dependabot processing.
- **Decision:** Rejected.
- **Architectural rationale:** Dependabot is a hosted repository capability. Configuration schema review and post-merge platform evidence are appropriate; pretending it is a local runtime check adds little value.
- **Impact:** Dependabot evidence is repository configuration plus GitHub processing status.
- **Owner:** Platform/Foundation
- **Target milestone:** Milestone 3A post-merge verification

### RJ-08 — Change the Approved AI Evolution Sequence

- **Review finding:** Future AI evolution should be reconsidered during bootstrap.
- **Decision:** Rejected as unnecessary.
- **Architectural rationale:** The existing sequence—provider boundary, Prompt, Knowledge, Rule, Case/Analysis, Review, Evaluation, Statistics—is already evidence-first, reviewable, and governed by documents 03 through 17 and ADR-003.
- **Impact:** No AI engine code or package is introduced in Milestone 3A.
- **Owner:** Architecture Board
- **Target milestone:** Existing roadmap remains in force

## 8. Conditions of Approval

Implementation may begin only under these conditions:

1. MF-01 through MF-18 are treated as binding bootstrap instructions.
2. Dependency installation does not begin until the exact matrix and runtime enforcement are resolved.
3. The TypeScript/ESM/NestJS/Prisma/Next compatibility gate runs before package expansion.
4. Deferred items are not introduced “for completeness.”
5. Documentation alignment items are completed in the implementation PR or by their stated future gate.
6. Any contradiction with the Project Bible, ADRs, or higher canonical documents stops work for Architecture Board review.
7. Milestone 3A cannot be tagged or reported as complete v0.1.

## 9. Required Evidence at Completion

The implementation review must include:

- clean-clone installation output;
- exact dependency manifest and lockfile;
- Turbo task graph including generation dependencies;
- compatibility-gate results;
- architecture-boundary negative test;
- Prisma no-model validation and generation results;
- application image build logs;
- deterministic runtime smoke results;
- localhost-only rendered Compose bindings;
- baseline security-scan results;
- CI run URL;
- confirmation that no AI, engine, user, subscription, notification, or live-analysis behavior was added.

## 10. Official Architecture Board Decision

# APPROVED WITH CONDITIONS

Milestone 3A Repository Bootstrap implementation may begin after adopting the binding Must Fix decisions in this sign-off.

This approval authorizes repository and runtime bootstrap only. It does not authorize completion claims for canonical v0.1, football-analysis business logic, AI provider integration, engine implementation, domain persistence, public deployment, or Phase 2 infrastructure.

The Board considers the architecture direction sound, evolutionary, and consistent with the Project Bible. The conditions above reduce execution risk without expanding the milestone beyond immediate consumers.
