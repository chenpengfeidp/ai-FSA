# FAS Project State

## Snapshot

- Last updated: 2026-07-23
- Current delivery milestone: Deterministic football vertical slice (post–Milestone 3A bootstrap)
- Canonical roadmap alignment: v0.1 Foundation bootstrap remains incomplete; V2 first vertical slice (docs 34–35) plus B.1/B.2 international market path landed
- Current task status: **Architecture Freeze v0.3** review complete; product roadmap remains `docs/40_PRODUCT_ROADMAP.md`
- Delivery phase: **Product development** (architecture-design phase closed; see Project Governance Rule in `AGENTS.md` and doc 40)
- Current sprint: **R1** Architecture Freeze Review (v0.3) complete — no production code; integrity verified after Intelligence MVP
- Last completed delivery: Sprint **R1** (`docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`); prior I2B, I2A, I1B, I1A, F1.3B, F1.3A, F1.2b, F1.2a, F1.1E
- Demo: recorded cassette `football:100001` includes full xG windows + Match Context; odds cassette `match-example` includes O/U + optional market depth; Evidence catalog: `docs/50_EVIDENCE_CATALOG.md`
- Next authorized work: **A1 Prediction Evaluation**
- Release status: Pre-release; private trusted environment only; not production
- Architecture freeze: **v0.3** (v0.2 pipeline/boundaries reaffirmed; Projection dual-input + Market findings-only ratified)
- Product roadmap (sole post-v0.2 sequencing authority): `docs/40_PRODUCT_ROADMAP.md`
- Project Governance Rule: no new Architecture docs / Engines without defect or capability gap; Sprint → code+tests+validation first; every Sprint cites doc 40 with I/O + acceptance + completion report
- Document map for AI/onboarding: `docs/PROJECT_INDEX.md`
- Approved gate (facts provider): `docs/sprints/VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md` (API-Football, `@fas/provider-football`, API-Sports direct). **xG is roadmap Sprint F1.3** (doc 40 supersedes informal “F.1.1 = xG” naming).

Update this document after every sprint, implementation gate, or material governance change.

## Current Repository Status

The repository contains the Milestone 3A bootstrap platform **and** a working private-environment deterministic analysis vertical slice.

### Platform / bootstrap (still true)

- pnpm and Turborepo workspace with exact Node.js `24.18.0` and pnpm `11.13.0` pins;
- `@fas/tsconfig`, `@fas/config`, `@fas/database` (Prisma; P.2 Evidence/Match models; bootstrap plus first domain persistence);
- NestJS API, Next.js web, standalone NestJS worker;
- Biome, dependency-cruiser, Husky/lint-staged, Vitest, toolchain enforcement;
- container images and local Compose topology for PostgreSQL, API, web, and profiled worker;
- architecture documents, ADRs, sprint reports, and AI-agent governance.

### Football domain vertical slice (now implemented)

Fixture-driven, in-memory evidence path (not durable PostgreSQL domain models):

```text
Import MATCH_INFO + TEAM_FORM×2 + STATISTICS×2
  (+ optional HEAD_TO_HEAD, + optional ODDS)
  → FeatureBundle
  → Rule findings (football + market; market does not enter softmax)
  → DeterministicMatchProjection (independent Poisson + rule adjust
     + identity calibration artifact reference + market-conflict gate)
  → AnalysisReport (+ local inference narrative draft)
  → Web Match Center / Session / Workspace / Library
```

Default Match Center schedule source is Football Data (`FOOTBALL_DATA_PROVIDER_MODE=recorded`): cassette fixtures with Form/Stats/H2H mapped through FAS Football Domain Model before Evidence (never raw API-Football JSON). Odds (`ODDS_PROVIDER_MODE=recorded|live`) remains an optional market layer / `odds:*` analyze path; when Football Data mode is `fixture`, Match Center falls back to the Odds calendar. Live Football Data uses API-Sports official host + `API_FOOTBALL_KEY` (`x-apisports-key`). Live Odds still requires `THE_ODDS_API_KEY` and `ODDS_SPORT_KEYS` fan-out. True xG Evidence is **F1.3A** (`EXPECTED_GOALS`); Feature/Rule/Confidence/Projection consume is **F1.3B** (`feature.v2.f13b.xg` / `rule.mvp.f13b.xg` / `projection.v2.f13b.xg`). Match Context Evidence is **I1A** (`MATCH_CONTEXT`); Feature/Rule/Confidence/Projection consume is **I1B** (`feature.v2.i1b.context` / `rule.mvp.i1b.context` / `projection.v2.i1b.context`). Odds & Market Evidence depth is **I2A** (extended `ODDS` payload + Workspace/Report); Market Intelligence Feature/Rule/Confidence/Projection supporting consume is **I2B** (`feature.v2.i2b.market` / `rule.mvp.i2b.market` / `projection.v2.i2b.market`; Market Rules `channel: none`).

Implemented packages used by the slice (non-exhaustive):

- `@fas/match`, `@fas/evidence`, `@fas/evidence-normalizer`, `@fas/evidence-import`, `@fas/evidence-query`
- `@fas/provider-fixture`, `@fas/provider-football`, `@fas/provider-odds`, `@fas/application`
- `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`
- `@fas/statistics` (pinned `population_demo_v1` frequency-ratio candidate by default; identity still selectable; no match-run training)
- `@fas/prompt` (sealed-context composition; no retrieval / no network)
- `@fas/ai-provider` (`LocalDeterministicNarrativeAdapter` only; no provider SDK)

### API surface (current)

Operational:

- `GET /`
- `GET /health/live`
- `GET /health/ready` (live `SELECT 1` ping when `DATABASE_CLIENT_MODE=live`; stub in tests)
- `GET /version`

Domain (private demo):

- `POST /api/import/match/:matchId`
- `POST /api/analyze/match/:matchId`
- `GET /api/matches/upcoming`
- `GET /api/evidence/example`
- `GET /api/evidence/match/:matchId`
- `GET /api/evidence/:id`

### Web surface (current)

- Match Center, analysis session pacing UI, explainable workspace, analysis library (`/reports`)
- Workspace maps sealed projection / narrative; does not recompute λ, 1X2, confidence, or recommendations

### Worker

Still initializes, logs startup, and exits without a durable job queue.

## Current Toolchain

- Node.js: `24.18.0`
- pnpm: `11.13.0`
- Turborepo: `2.10.5`
- TypeScript: `6.0.3`
- Biome: `2.5.3`
- dependency-cruiser: `18.1.0`
- Husky: `9.1.7`
- lint-staged: `17.0.8`
- Vitest: `4.1.10`
- Zod: `4.4.3`
- Next.js: `16.2.10`
- React / React DOM: `19.2.7`
- NestJS: `11.1.28`
- Prisma CLI / Client / PostgreSQL adapter: `7.8.0`
- PostgreSQL driver: `8.22.0`
- Docker Engine validation baseline: `29.6.1` on `darwin/arm64`
- Docker Compose validation baseline: `5.3.0`

TypeScript 6.0.3 is the approved compiler baseline. TypeScript 7.0.2 failed because Nest CLI 11 requires a programmatic compiler API that TypeScript 7.0 does not expose.

## Completed Milestones and Gates

- Architecture Design: complete.
- Architecture Completion: complete for the current documented scope.
- ADR-001 through ADR-004: accepted.
- Milestone 3A implementation plan: approved with conditions.
- Milestone 3A Sprint 1 — Repository Foundation: complete.
- Milestone 3A Sprint 2 — Application Skeleton: complete.
- Milestone 3A.5 — AI Collaboration Governance: complete.
- Milestone 3A Sprint 3 — Platform Foundation: complete.
- Milestone 3A Sprint 4 — Engineering Quality Foundation: complete.
- Milestone 3A Sprint 5 — Configuration Foundation: complete.
- Milestone 3A Sprint 6 — Toolchain Enforcement: complete.
- Milestone 3A Sprint 7 — TypeScript Compiler Baseline Alignment: complete.
- Milestone 3A Sprint 8 — Prisma No-model Bootstrap: complete.
- Milestone 3A Sprint 9 — Container Image Packaging Foundation: complete.
- Milestone 3A Sprint 10 — Local Compose Topology Foundation: complete.
- V2 architecture alignment (doc 34) and first vertical slice specification (doc 35): accepted for planning; slice 1.0–1.4 implemented in code.

Milestone 3A and canonical v0.1 Foundation are **not** fully closed (persistence models, durable jobs, CI/ops gates remain). The deterministic vertical slice is a **parallel product capability** on top of the bootstrap platform, not a claim that v0.1 is complete.

## Completed Sprints

Historical Sprint 1–10 reports remain the evidence record for Milestone 3A bootstrap. See `docs/sprints/SPRINT1_REPORT.md` through `docs/sprints/SPRINT10_REPORT.md`.

### Vertical slice delivery (2026-07)

Not a numbered Sprint 11 authorization; delivered as bounded implementation against docs 34–35 and follow-on A→B→C:

| Slice | Delivery | Evidence |
|---|---|---|
| 1.0 | Deterministic Feature → Rule → Projection → Report → Workspace | commit `ab0446b` and successors |
| 1.1 | Optional `HEAD_TO_HEAD` | commit `007d595` |
| 1.2 | Optional `ODDS` + market conflict → `cautious` | commit `e370299` |
| 1.3 | `@fas/statistics` identity calibration artifact consumption | commit `690c988` |
| 1.4 | `@fas/prompt` + local `@fas/ai-provider` inference narrative | commit `39b55b2` |
| B.1 | Real-shaped pre-match 1X2 ODDS ingest (`@fas/provider-odds`, recorded default) | `docs/sprints/VERTICAL_SLICE_B1_ODDS_INGEST_SPEC.md` |
| B.2 | International 1X2 + Asian handicap on ODDS; AH features/rules; AH conflict limitation | `docs/sprints/VERTICAL_SLICE_B2_AH_MARKET_SPEC.md` |
| C.1 | Match Center upcoming fixtures from Odds-shaped feed + fixture demos | `docs/sprints/VERTICAL_SLICE_C1_MATCH_CENTER_FIXTURES_SPEC.md` |
| C.2 | Scores-backed TEAM_FORM + goals-proxy STATISTICS; `odds:*` analyzable when both sides have results | `docs/sprints/VERTICAL_SLICE_C2_SCORES_FORM_STATS_SPEC.md` |
| A.1 | Population frequency-ratio 1X2 calibration artifact (`calibration:population-demo:v1`) | `docs/sprints/VERTICAL_SLICE_A1_CALIBRATION_POPULATION_SPEC.md` |
| P.1 | Database-aware `/health/ready` via `@fas/database` ping (no domain models) | `docs/sprints/VERTICAL_SLICE_P1_DATABASE_READY_SPEC.md` |
| P.2 | First Prisma Evidence/Match models + `EVIDENCE_REPOSITORY_MODE` adapter | `docs/sprints/VERTICAL_SLICE_P2_EVIDENCE_PERSISTENCE_SPEC.md` |
| ZH-1 | Chinese UI chrome for Match Center + Analysis Session | `apps/web/src/copy/zh.ts` |
| C.2+ | Multi-league live scores fan-out (same sport keys as Match Center odds) | `@fas/provider-odds` `LiveTheOddsApiScoresSource` |
| ZH-2 | Chinese UI for Workspace / explainable report / Library | `apps/web/src/copy/zh.ts` |

Summary evidence: `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md` and B.1/B.2/C.1/C.2/A.1/P.1/P.2 specs above.

## Architecture Status

Architecture direction remains **approved with conditions**.

Binding principles still include: evidence before assumption; facts / market signals / findings / inference separation; deterministic policy outside generative AI; Analysis-owned match projection; Statistics-owned calibration maps; Prompt does not retrieve or call providers; UI does not recompute projections.

Open Milestone 3A / v0.1 items (unchanged in spirit):

- durable PostgreSQL domain models and Evidence/Match repositories;
- durable jobs, audit/idempotency baselines;
- remaining container/CI/security/runtime-smoke gates.

Closed relative to MF-11: API Compose wiring supplies `DATABASE_URL` + live client mode; `/health/ready` fails closed when PostgreSQL is unreachable.

Vertical-slice deferrals (intentional):

- Evaluation-qualified calibration / release gates (A.1 ships `computed_candidate` only);
- network AI provider SDKs;
- Redis, BullMQ, pgvector;
- authentication, public deployment, wagering advice.

## Approved Documents

### Governing and Canonical

- `docs/00_PROJECT_BIBLE.md`
- `docs/01_PRODUCT.md` through `docs/19_DATABASE_ERD.md`
- `docs/30_RULE_ENGINE_V2.md` through `docs/33_ANALYSIS_PIPELINE_V2.md` (design; non-authoritative where they conflict with canonical docs)
- `docs/34_V2_ARCHITECTURE_ALIGNMENT.md`
- `docs/35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md`
- `docs/decisions/ADR-001` through `ADR-004`

### Implementation Authority

- `docs/20_IMPLEMENTATION_PLAN.md`
- `docs/21_ARCHITECTURE_SIGNOFF.md`
- Sprint 3–10 specifications and alignment approvals under `docs/sprints/`

### Governance and Evidence

- `AGENTS.md`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/PROJECT_STATE.md`
- Sprint 1–10 reports and Milestone 3A gate/health reports under `docs/sprints/`
- `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md`

Sprint reports are evidence records, not replacements for canonical architecture.

## Known Constraints

- V1 is private and trusted-environment only.
- Public exposure is prohibited until authentication and authorization are designed and implemented.
- Live or in-play analysis is out of scope.
- AI cannot make authoritative deterministic, lifecycle, publication, or governance decisions.
- Narrative output is labeled `inference` and must not alter sealed projection numbers.
- Market odds are market signals, not ground truth; slice 1.2 does not blend them into 1X2.
- Default calibration is pinned `calibration:population-demo:v1` (frequency-ratio over a recorded demo population); still not Evaluation-qualified; match runs do not retrain.
- Demo evidence is fixture-backed and may be `unverified`.
- Prisma now includes the first Evidence/Match catalog models (P.2); default API mode remains in-memory Evidence unless `EVIDENCE_REPOSITORY_MODE=postgres` after migrate.
- Durable jobs, Redis, BullMQ, pgvector, analysis snapshots, and object storage are not implemented.
- Web ZH-1/ZH-2 Chinese copy covers Match Center/Session/Workspace/Library/report chrome; team and competition names stay English.
- No OpenAI or other network provider SDK is installed for narrative generation.
- Direct dependencies are exact-pinned and the root lockfile is authoritative.
- Speculative empty engine directories must not be treated as implemented packages.

## Known Documentation Drift

- Before 2026-07-19, this file still claimed “no football-domain behavior” and API-only health endpoints; that drift is corrected here.
- Doc 35 header status text may still read as pre-implementation; treat implemented slice 1.0–1.4 behavior in code and `VERTICAL_SLICE_1_COMPLETION_REPORT.md` as delivery evidence.
- Canonical v0.1 roadmap package naming (`@fas/*-engine`) vs interim packages (`@fas/rule`, `@fas/prompt`, `@fas/statistics`) remains an intentional migration gap documented in `docs/14_MONOREPO.md`.

## Next Work

No numbered sprint is active. B.1/B.2/C.1/C.2/A.1/P.1/P.2/ZH-1 path is implemented with default offline recorded + memory Evidence.

Recommended follow-ons (ordered):

1. Follow **`docs/40_PRODUCT_ROADMAP.md`**: next product sprint **F1.1** (then F1.2 → F1.3 → A1 → A2 → K1/C1/S1/R1 → v1.0 → v2.0);
2. Keep Odds as optional market layer only; do not re-merge schedule ownership into Odds;
3. Compose migrate automation / postgres-mode smoke evidence (platform companion);
4. Do not start a sprint without citing doc 40 Sprint id;
5. Later product items only as listed in doc 40 (no ad-hoc engine invention).

Recently delivered: Architecture Freeze Review **v0.3** (`docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`); Intelligence MVP (F1.2–I2B); prior Freeze v0.2; F.1 Football Data Provider; Match Center; ZH-2; `docs/PROJECT_INDEX.md`.

Do not start Redis/BullMQ/pgvector, public auth, or network AI provider SDKs without a separate approved milestone.

## Future Roadmap

- Complete remaining Milestone 3A / v0.1 Foundation gates (persistence, jobs, CI/ops).
- Grow calibration from identity baseline to reviewed population artifacts.
- Optionally attach a network AI provider behind `@fas/ai-provider` without allowing it to mutate sealed numbers.
- Continue governed engines (Knowledge, Case, Review, Evaluation) per canonical roadmap when authorized.
- v1.0: controlled private production acceptance.

## Update Checklist

After each sprint or material delivery:

- update snapshot date, current milestone, sprint, and next work;
- move completed work into the completed sections;
- reconcile repository status with actual code and commands;
- add or remove known constraints;
- record architecture or implementation-gate changes;
- link new evidence reports;
- keep release claims narrower than demonstrated evidence.
