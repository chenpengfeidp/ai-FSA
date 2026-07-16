# Sprint 8 Technical Debt — Long-term Maintainability Review

## 1. Review Record

- Delivery milestone: Milestone 3A — Repository Bootstrap
- Sprint under review: 8 — Prisma No-model Bootstrap
- Review date: 2026-07-16
- Review type: Long-term maintainability and technical-debt inventory
- Implementation modified: No

This document complements `docs/sprints/SPRINT8_POST_REVIEW.md`. That review judged Sprint 8 acceptance. This review ranks residual maintainability risk for later sprints.

Severity scale:

| Rank | Meaning |
| --- | --- |
| Critical | Likely to cause incorrect production behavior, data risk, or irreversible architecture lock-in if left unaddressed before the next persistence consumer |
| High | Will materially slow or destabilize the first real persistence/integration sprint if ignored |
| Medium | Increases cost, confusion, or fragility over a few sprints; should be scheduled deliberately |
| Low | Cosmetic, local, or easily deferred; fix when touching the area |

For every issue: why it exists, impact if left alone, and the recommended owning sprint class.

## 2. Executive Summary

Sprint 8 is intentionally minimal and mostly well-scoped. The largest long-term risks are not “too much abstraction,” but:

1. dual generated-output trees and a nonstandard package emit layout;
2. generation/environment coupling that will complicate CI, containers, and app integration;
3. a lifecycle-only public API that must not silently grow into a Prisma re-export surface;
4. bootstrap tests that prove shape, not operational behavior.

No Critical issue was found for the current no-consumer bootstrap state.

Do not reopen Sprint 8 to “clean these up.” Schedule them into the sprints that first need packaging, models, or application wiring.

## 3. What Is Not Debt

These choices look sparse on purpose and should not be “improved” early:

- A single factory + frozen lifecycle object is not over-engineering for MF-02/adapter proof.
- Zero repository/UoW/transaction layers is correct at this boundary.
- Exact Prisma/`pg` pins and pnpm build approvals are supply-chain cost, not accidental complexity.
- Controlled `--require-models` negative evidence is required architecture evidence, not ceremony.
- Keeping applications from importing `@fas/database` in Sprint 8 is correct stop-boundary behavior.

## 4. Ranked Issues

### TD-01 — Dual generated trees (Prisma output + TypeScript emit)

- Rank: **High**
- Category: Prisma best practices, future migration risks, package layout
- Why: `prisma generate` writes `packages/database/generated/prisma`. Package `tsconfig` uses `rootDir: "."` and includes generated sources, so `tsc` also emits `packages/database/dist/generated/prisma`. Runtime code in `dist/src/client.js` imports the compiled copy under `dist/generated/...`, while tests and ignore rules talk about the source generate tree.
- Impact: Developers and agents can regenerate one tree and assume the other is current. Container packaging, prune/deploy, and cache invalidation become ambiguous. First migration Sprint can waste time debugging “I generated but build still fails.”
- Recommended Sprint: First packaging/container Sprint, or the first Sprint that makes another package consume `@fas/database` at runtime.

### TD-02 — Public export map nested under `dist/src`

- Rank: **High**
- Category: package API cleanliness, TypeScript design
- Why: Exports point to `./dist/src/index.js` and `./dist/src/index.d.ts`, unlike `@fas/config`’s flatter `./dist/index.js`. The nesting exists only because generated sources are compiled beside `src`.
- Impact: Inconsistent package conventions increase onboarding cost and make future multi-entry exports harder to reason about. Deep path shape also invites accidental follow-on exports such as `./dist/generated/...` if someone “just needs types.”
- Recommended Sprint: Same packaging/consumer Sprint as TD-01; flatten emit layout when generated-code compilation strategy is decided.

### TD-03 — Lifecycle API will attract Prisma leakage under model pressure

- Rank: **High**
- Category: package API cleanliness, future migration risks, over-engineering risk (expansion)
- Why: `createDatabaseClient` returns only `connect`/`disconnect` and intentionally hides `PrismaClient`. That is correct today. The first model/migration Sprint will create strong pressure to export the client, delegates, or transaction helpers “temporarily.”
- Impact: If the public surface becomes a Prisma pass-through, domain/application layers will couple to generated types and the architecture rule “repositories return contracts, never Prisma records” becomes socially unenforceable.
- Recommended Sprint: First persistence-model / repository Sprint. Define ports before widening `@fas/database` exports; keep Prisma types package-private.

### TD-04 — Generation requires `DATABASE_URL` despite no network connection

- Rank: **High**
- Category: hidden coupling, Prisma best practices, future migration risks
- Why: Prisma 7 config binds datasource URL through `env("DATABASE_URL")`. Validate/generate/typecheck/test/build all inherit that requirement via package scripts, root validate, Turbo `passThroughEnv`, and Vitest env.
- Impact: Clean CI/container stages cannot typecheck or build the database package without inventing a URL. Agents may later “solve” this with committed `.env`, dotenv, or fake secrets. Coupling is environmental rather than code-local, so failures look intermittent.
- Recommended Sprint: CI/bootstrap or packaging Sprint. Keep non-secret process env; document one canonical validation URL policy; do not introduce dotenv unless a later gate explicitly authorizes it.

### TD-05 — Turbo graph and script-prefix generation are dual mechanisms

- Rank: **Medium**
- Category: duplicated code/process, hidden coupling
- Why: Correctness is enforced by `pnpm generate && ...` in package scripts and by root `validate` ordering. Turbo has a `generate` task, but `build`/`typecheck`/`test` do not `dependsOn: ["generate"]`. Cache keys do not model generation as a predecessor.
- Impact: Local scripts remain safe; remote Turbo cache restores can skip work after generated files are deleted. Future contributors may remove the script prefix thinking Turbo owns the graph, or the reverse.
- Recommended Sprint: Turbo environment/cache-policy Sprint (still open Milestone 3A work).

### TD-06 — Validation URL duplicated across Vitest, tests, and docs

- Rank: **Medium**
- Category: duplicated code, hidden coupling, testing gaps
- Why: The same non-secret PostgreSQL-format URL appears in `vitest.config.ts`, adapter tests, README/Development Guide placeholders, and human validation commands.
- Impact: A later change to validation host/credentials/format requires multi-file edits. Drift can make tests pass while documented commands fail, or vice versa.
- Recommended Sprint: Small test/tooling hardening Sprint before CI lands, or the CI Sprint itself.

### TD-07 — Bootstrap tests assert file shape more than behavior

- Rank: **Medium**
- Category: testing gaps
- Why: Current tests cover schema text, generated file presence, lifecycle key names, `disconnect()` without connect, and empty-string rejection. They do not cover:
  - missing `DATABASE_URL` config failure;
  - package export map import (`@fas/database`) versus source import;
  - `connect()` failure/success semantics against a real or testcontainer Postgres;
  - regenerate-after-delete as an automated test;
  - boundary that public exports never include Prisma types.
- Impact: Refactors can preserve string literals and still break runtime packaging or config contracts. Operational regressions will be discovered only in later integration Sprints.
- Recommended Sprint: Database integration/readiness Sprint for connect/readiness tests; earlier tooling Sprint for config/export-map unit coverage that still needs no Postgres.

### TD-08 — Schema contract tests are brittle string matches

- Rank: **Medium**
- Category: testing gaps, Prisma best practices
- Why: Tests require exact substrings such as `output   = "../generated/prisma"` (spacing-sensitive) and regex absence of `model|enum|type`.
- Impact: Harmless Prisma/formatter whitespace changes fail CI. Conversely, a sneaky `view`/`generator` misuse or multi-file schema split might not be caught.
- Recommended Sprint: First schema/model Sprint, when schema parsing or Prisma get-config based assertions become cheap to add.

### TD-09 — `@prisma/client` dependency versus generated local client import

- Rank: **Medium**
- Category: Prisma best practices, hidden coupling
- Why: Manifest depends on `@prisma/client@7.8.0`, but source imports `../generated/prisma/client.js`. The forbidden fixture imports `@prisma/client` from the package name. This is valid for Prisma 7 custom output, but the dual identity confuses contributors (“which client is real?”).
- Impact: Someone may “simplify” by switching the adapter to `@prisma/client` and accidentally bypass explicit output ownership, or remove `@prisma/client` and break Prisma’s expected dependency graph.
- Recommended Sprint: First packaging or model Sprint; document and mechanically enforce “import generated client only inside `@fas/database`.”

### TD-10 — No mechanical rule preventing premature `@fas/database` app imports

- Rank: **Medium**
- Category: future migration risks, package API cleanliness
- Why: dependency-cruiser blocks raw Prisma/`pg` imports, not `@fas/database` itself. Applications are currently free to import the lifecycle factory.
- Impact: An exploratory app import before readiness/migration policy exists can create hidden runtime coupling and force incomplete database wiring into API/worker shells.
- Recommended Sprint: Immediately before or as the first task of the application database-integration Sprint. Add an allowlist/deny rule that matches the authorized consumer set.

### TD-11 — Client instance is closed over and unobservable

- Rank: **Medium**
- Category: TypeScript design, testing gaps, future migration risks
- Why: `PrismaClient` lives only inside closures returned by `createDatabaseClient`. There is no typed port for query execution, health check, or test doubles.
- Impact: Good for leak prevention today; awkward tomorrow when readiness needs `$connect`/`$queryRaw` evidence or tests need a fake. Risk is a sudden API break or unsafe `as any` escape hatch.
- Recommended Sprint: Application readiness/integration Sprint. Introduce an internal port or narrow health method without exporting Prisma types.

### TD-12 — Plain `Error` and unbranded connection-string input

- Rank: **Low**
- Category: TypeScript design
- Why: Empty connection strings throw a generic `Error`. The input is a raw `string`, not a branded or validated URL type.
- Impact: Callers cannot discriminate configuration failures from adapter failures by type. Low urgency until multiple error classes exist at the database boundary.
- Recommended Sprint: Config/database integration Sprint that unifies env validation with connection construction.

### TD-13 — Repeated `pnpm generate` prefixes across scripts

- Rank: **Low**
- Category: duplicated code
- Why: `build`, `typecheck`, and `test` each hardcode `pnpm generate && ...`. Root validate also generates.
- Impact: Cheap duplication today; becomes noisy if generation gains flags, multi-schema outputs, or migrate steps.
- Recommended Sprint: Turbo/cache-policy Sprint if graph ownership is centralized; otherwise leave until a second generate step appears.

### TD-14 — Generated sources excluded from cycle analysis

- Rank: **Low**
- Category: hidden coupling, Prisma best practices
- Why: `packages/database/generated` is excluded from dependency-cruiser to avoid Prisma-internal cycles.
- Impact: Correct for generated code, but hand-written files accidentally placed under `generated/` would also be invisible. Unlikely if generate remains the only writer.
- Recommended Sprint: Opportunistic cleanup in any database tooling Sprint; optionally ignore only known generated globs more tightly.

### TD-15 — `.gitignore` covers `generated/prisma/` not `generated/`

- Rank: **Low**
- Category: future migration risks
- Why: Ignore rule is `packages/database/generated/prisma/`. A future sibling generated artifact under `packages/database/generated/other` could be committed by mistake.
- Recommended Sprint: First Sprint that adds another generator output; widen ignore to `packages/database/generated/` then.

### TD-16 — Implementation-plan status lag

- Rank: **Medium**
- Category: hidden coupling (process/docs), maintainability for agents
- Why: `docs/20_IMPLEMENTATION_PLAN.md` still describes Prisma bootstrap as unimplemented/unauthorized and leaves `dotenv`/`pg` as unresolved selections.
- Impact: Future agents may recreate Sprint 8, reintroduce dotenv, or mistrust `PROJECT_STATE.md`. This is documentation debt with high agent-amplification.
- Recommended Sprint: Documentation-alignment Sprint immediately after Sprint 8 review closeout (no code changes required).

### TD-17 — Adapter constructed with connection string only

- Rank: **Low**
- Category: Prisma best practices, future migration risks
- Why: `new PrismaPg({ connectionString })` omits pool, SSL, schema, and shutdown options.
- Impact: Fine for bootstrap. Production integration will need explicit pool lifecycle and TLS policy; extending the factory signature later will touch every caller.
- Recommended Sprint: Application database-integration / readiness Sprint.

### TD-18 — No over-abstracted layers today, but naming invites growth

- Rank: **Low**
- Category: unnecessary abstractions / over-engineering risk
- Why: `DatabaseClientLifecycle` is a precise name for connect/disconnect proof. It is not currently over-engineered. The risk is social: later contributors may hang migrations, repositories, and transactions onto the same type because the package is named `@fas/database`.
- Impact: Gradual god-interface formation.
- Recommended Sprint: First repository Sprint. Keep lifecycle, health, and repository ports separate by name and module.

## 5. Cross-cutting Themes

### 5.1 Duplicated code / process

Primary duplication is environmental and scripted, not business logic:

- generate command prefixes;
- validation URL literals;
- dual generate/emit trees.

There is almost no duplicated TypeScript domain logic to collapse.

### 5.2 Unnecessary abstractions

None material in the current code. The danger is future abstraction accretion on top of a good thin boundary.

### 5.3 Over-engineering

Sprint 8 is under-abstracted relative to long-term persistence needs, which is appropriate. The emit-layout complexity (`rootDir: "."`, nested exports, compiling generated code) is the main accidental complexity.

### 5.4 Hidden coupling

Strongest couplings:

- `DATABASE_URL` across Prisma config, Turbo, Vitest, and root validate;
- source generate path versus dist emit path;
- package scripts versus Turbo task graph both claiming generation responsibility.

### 5.5 Future migration risks

Highest-risk transitions:

1. first model/migration;
2. first app import and readiness check;
3. container image packaging of generated client;
4. pool/TLS/shutdown policy.

Address TD-01, TD-02, TD-03, and TD-04 before or during those transitions.

### 5.6 Prisma best practices

Aligned today:

- Prisma 7 config file;
- explicit output;
- driver adapter;
- no models in bootstrap;
- no dotenv.

Watch next:

- keep migrations only in `@fas/database`;
- do not re-export generated client;
- avoid checking in generated output;
- prefer one canonical consume path after packaging decisions.

### 5.7 Package API cleanliness

Current API is clean and minimal. Protect that cleanliness with export discipline and dependency-cruiser rules when consumers arrive.

### 5.8 TypeScript design

Strictness is good. Main design debt is layout (`rootDir`/exports) and the lack of typed boundary errors/ports for the next consumer, not unsafe `any` usage.

### 5.9 Testing gaps

Bootstrap contract tests are necessary but not sufficient for the first real database consumer. Add export-map and config-failure tests early; add connect/readiness tests only with an authorized Postgres strategy.

## 6. Suggested Debt Backlog by Sprint Class

| Recommended Sprint class | Issues |
| --- | --- |
| Documentation alignment (immediate, docs-only) | TD-16 |
| Packaging / container / first `@fas/database` consumer | TD-01, TD-02, TD-09 |
| Turbo / CI cache and env policy | TD-04, TD-05, TD-06, TD-13 |
| First models / migrations / repositories | TD-03, TD-08, TD-18 |
| Application DB integration / readiness | TD-07, TD-10, TD-11, TD-12, TD-17 |
| Opportunistic database tooling | TD-14, TD-15 |

## 7. Priority Recommendation

If only three items are scheduled before the next persistence work:

1. **TD-16** — align implementation-plan status so agents do not redo or contradict Sprint 8.
2. **TD-01 / TD-02** — decide a single generated-client consume/emit story before any app depends on the package.
3. **TD-03 / TD-10** — freeze public API and consumer rules before the first model lands.

## 8. Conclusion

Sprint 8 leaves a healthy thin boundary and little true over-engineering. The maintainability debt is concentrated in generation layout, environment coupling, and the coming pressure to widen the package API.

Treat these as scheduled foundation follow-ons, not silent cleanup inside an unauthorized Sprint.

**No implementation files were modified while producing this inventory.**
