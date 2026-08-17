# FAS Project State

## Snapshot

- Last updated: 2026-08-16 (P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run)
- Current delivery milestone: Deterministic football vertical slice (post–Milestone 3A bootstrap)
- Canonical roadmap alignment: v0.1 Foundation bootstrap remains incomplete; V2 first vertical slice (docs 34–35) plus B.1/B.2 international market path landed
- Current task status: **P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run COMPLETED**. Baseline A `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` and Candidate C `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` on SEALED cohort `p2k.e.validation.expansion.v2.analyzematch.v1`: A 30/30, C 30/30, pairedSuccessfulCount 30, sameHistoricalContext 30/30, identity 30/30, A/C offline artifacts differ, PostgreSQL round-trip PASS. **No population metrics computed. P2K-G NOT executed; P2K-H NOT authorized.** No promotion; no production change; old v1 + recovery-v2 cohorts and their runs untouched. Product roadmap remains `docs/40_PRODUCT_ROADMAP.md`
- Delivery phase: **Product development** (architecture-design phase closed; see Project Governance Rule in `AGENTS.md` and doc 40)
- Current sprint: P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run complete (`docs/sprints/P2K/P2K_F_VALIDATION_EXPANSION_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`). Prior P2K-E Validation Expansion V2 Sealed Replay Cohort, P2K-G2-A Validation Dataset Diversity Expansion, P2K-G2 planning/audit, P2K-G Recovery V2 population evaluation, P2K-F Recovery V2 replay, P2K-E Recovery V2 seal, P2K-G-RECOVERY v2 bootstrap, prior P2K-F validation fail-closed on v1 cohort. **Governance note:** R1A/R1B / P2A–P2K / M1B not yet listed in doc 40 (doc 40 **R1** = AI Review ≠ R1B).
- Last completed delivery: **P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run** (`docs/sprints/P2K/P2K_F_VALIDATION_EXPANSION_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`); prior P2K-E Validation Expansion V2 Sealed Replay Cohort, P2K-G2-A Validation Dataset Diversity Expansion, P2K-G2 Planning/Audit, P2K-G Validation Recovery V2 Population Evaluation, P2K-F Validation Recovery V2 Offline Replay, P2K-E Validation Recovery V2 Sealed Cohort, P2K-G-RECOVERY Projection V2 Bootstrap, P2K-F Validation FAIL CLOSED, P2K-E Validation Sealed Cohort, Validation Data Bootstrap, P2K-G, P2K-F (implementation), P2K-E (implementation), P2K-D, P2K-C, P2K-A/B, P2K planning, R1B, R1A, M1B, P2J, P2I, P2H, P2G, P2F, P2E, P2D, M1A, O1, V1A, A2, P1B, P1A, L1B, L1A, DA, P0, A1.5, A1
- Demo: recorded cassette `football:100001` includes full xG windows + Match Context + Club Intelligence + Manager Intelligence (both sides; confirmed match managers with identity/tenure/previous clubs) + enriched Player Intelligence (season stats/age/captain/availability/match squad status); odds cassette `match-example` includes O/U + optional market depth; Evidence catalog: `docs/50_EVIDENCE_CATALOG.md`; evaluation demo population + Evaluation History + Prediction Calibration report + Football Intelligence Validation report + Football Intelligence Contribution report (9 domains incl. Manager) in `@fas/statistics`
- Next authorized work: **P2K-G population evaluation** on SEALED cohort `p2k.e.validation.expansion.v2.analyzematch.v1` (Baseline A / Candidate C replay runs ready: paired 30/30) — separately authorized; descriptive only (no significance). Candidate C promotion decision remains an explicit human gate. Do **not** auto-promote Candidate C. Do not implement P2K-H unless separately authorized. Parallel: **L2A** or doc 40 items.
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

Default Match Center schedule source is Football Data (`FOOTBALL_DATA_PROVIDER_MODE=recorded`): cassette fixtures with Form/Stats/H2H mapped through FAS Football Domain Model before Evidence (never raw API-Football JSON). Odds (`ODDS_PROVIDER_MODE=recorded|live`) remains an optional market layer / `odds:*` analyze path; when Football Data mode is `fixture`, Match Center falls back to the Odds calendar. Live Football Data uses API-Sports official host + `API_FOOTBALL_KEY` (`x-apisports-key`). Live Odds still requires `THE_ODDS_API_KEY` and `ODDS_SPORT_KEYS` fan-out. True xG Evidence is **F1.3A** (`EXPECTED_GOALS`); Feature/Rule/Confidence/Projection consume is **F1.3B** (`feature.v2.f13b.xg` / `rule.mvp.f13b.xg` / `projection.v2.f13b.xg`). Match Context Evidence is **I1A** (`MATCH_CONTEXT`); Feature/Rule/Confidence/Projection consume is **I1B** (`feature.v2.i1b.context` / `rule.mvp.i1b.context` / `projection.v2.i1b.context`). Odds & Market Evidence depth is **I2A** (extended `ODDS` payload + Workspace/Report); Market Intelligence Feature/Rule/Confidence/Projection supporting consume is **I2B** (`feature.v2.i2b.market` / `rule.mvp.i2b.market` / `projection.v2.i2b.market`; Market Rules `channel: none`). Prediction Evaluation is **A1** (`MATCH_RESULT` Evidence + `@fas/statistics` `evaluatePrediction`; Report/Workspace Actual + Evaluation overlays; never mutates sealed Projection). Evaluation History is **A1.5** (append-only history records + memory/postgres repository; `GET /api/evaluation-history`; Workspace History section). Club Intelligence Evidence is **L1A** (`CLUB_INTELLIGENCE` from standings + optional manager); Feature/Rule/Confidence/Projection consume is **L1B** (`feature.v2.l1b.club` / `rule.mvp.l1b.club` / `projection.v2.l1b.club`). Player Intelligence Evidence is **P1A** (extended `PLAYER` payload: age/captain/availabilityStatus/matchSquadStatus/seasonStats, capped candidate coverage); Feature/Rule/Confidence/Projection consume is **P1B** (`feature.v2.p1b.player` / `rule.mvp.p1b.player` / `projection.v2.p1b.player`). Manager Intelligence Evidence is **M1A** (`MANAGER_INTELLIGENCE`); Feature/Rule/Confidence/Football State/Projection/Contribution consume is **M1B** (`feature.v2.m1b.manager` / `rule.mvp.m1b.manager` / `projection.v2.m1b.manager`; Features feed `pressureState`/`riskState` only — no direct λ injection, no new Football State dimensions).

Implemented packages used by the slice (non-exhaustive):

- `@fas/match`, `@fas/evidence`, `@fas/evidence-normalizer`, `@fas/evidence-import`, `@fas/evidence-query`
- `@fas/provider-fixture`, `@fas/provider-football`, `@fas/provider-odds`, `@fas/application`
- `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`
- `@fas/statistics` (pinned `population_demo_v1` frequency-ratio candidate by default; identity still selectable; no match-run training; A1 evaluation + A1.5 Evaluation History repository port / in-memory store + A2 Prediction Calibration report compute + V1A Football Intelligence Validation report compute + O1 Football Intelligence Contribution report compute + **P2H Projection Replay Validation** + **P2I Projection Diagnostics** — failure/script/state/rule/confidence diagnostics + `GET /api/projection-diagnostics`)
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
- `GET /api/evaluation-history/match/:matchId`
- `GET /api/evaluation-history`
- `GET /api/calibration`
- `GET /api/validation`
- `GET /api/contribution`
- `GET /api/projection-replay`
- `GET /api/projection-diagnostics`
- `GET /api/matches/upcoming`
- `GET /api/evidence/example`
- `GET /api/evidence/match/:matchId`
- `GET /api/evidence/:id`

### Web surface (current)

- Match Center, analysis session pacing UI, explainable workspace, analysis library (`/reports`)
- Workspace maps sealed projection / narrative; does not recompute λ, 1X2, confidence, or recommendations
- Workspace includes a dedicated **Manager Intelligence Evidence** section (M1A; `MANAGER_INTELLIGENCE`), visually separated from derived Feature Importance; displays provenance and honest absence; does not interpret manager quality or tactical ability
- Workspace separates **Prediction** / **Actual Result** (`MATCH_RESULT`) / **Evaluation** / **Evaluation History** (A1 + A1.5; History is append-only and read-only; never mutates Projection) / **Prediction Calibration** (A2; population-wide, measurement-only; never adjusts Prediction) / **Football Intelligence Validation** (V1A; population-wide comparison of prediction quality across Feature-configuration profiles evaluated against the same sealed historical predictions; measurement-only; never adjusts Prediction and never claims one profile improved over another) / **Football Intelligence Contribution Analysis** (O1; population-wide, per-domain measurement of Venue/Availability/Advanced Statistics/Expected Goals/Match Context/Club/Player/Market Intelligence contribution over the same sealed historical predictions; measurement-only; never adjusts Prediction, never ranks domains, and never claims causation)

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
- Prisma includes Evidence/Match catalog (P.2), Evaluation History (A1.5), and Projection Replay Sidecar (P2K-B). Default API mode remains in-memory unless `EVIDENCE_REPOSITORY_MODE=postgres` (`platformPersistence`) after migrate; that mode makes Evidence + Evaluation History + Sidecar durable together.
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

**P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run** **COMPLETED**: Baseline A `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` (30/0) and Candidate C `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` (30/0) on SEALED cohort `p2k.e.validation.expansion.v2.analyzematch.v1`; pairedSuccessfulCount 30, sameHistoricalContext 30/30, identity 30/30, A/C offline parameter artifacts differ, PostgreSQL round-trip PASS, no failure reasonCodes. **No population metrics; P2K-G NOT executed; P2K-H NOT authorized.** **P2K-E Validation Expansion V2 Sealed Replay Cohort** **COMPLETED**: new SEALED cohort `p2k.e.validation.expansion.v2.analyzematch.v1` (30 members from namespace `match-p2kg-expansion-v2-*`; digest `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997`; 30/30 P2K-C `replayEligible`, 30/30 `offlineReplayExecutable`, 30/30 provenance complete; round-trip/immutability/idempotent reseal PASS; 142 excluded all `OUT_OF_NAMESPACE`). **P2K-G2-A Validation Dataset Diversity Expansion** **COMPLETED**: 30 new Projection-v2 History+Sidecar rows on `fas_validation` namespace `match-p2kg-expansion-v2-*` via real AnalyzeMatch (`projectionPolicyPin=v2`); coverage 28 distinct prediction profiles, 2 winner classes (home 19 / away 11), 3 goal-range classes (range01 ×1 / range23 ×2 / range4Plus ×27), 2 confidence bands (medium 6 / low 24), actual Home 10 / Draw 9 / Away 11, goal totals 0–6. Prior: **P2K-G** population evaluation complete (`computeSealedCohortPopulationEvaluation` + durable `PopulationEvaluationItem`; same sealed cohort; paired A/C; A1/A2/P2H metrics reused; `eval.p2k.g.validation.recovery.v2.analyzematch.v1`, paired sample 6, descriptive only). **P2K Validation Data Bootstrap** added 6 AnalyzeMatch-generated catalog-valid History+Sidecar rows on `fas_validation`. **P2K-E validation seal** created SEALED cohort `p2k.e.validation.bootstrap.analyzematch.v1` (6 offline-rebuildable members; 52 fixture Sidecars excluded). **P2K-F validation** on that cohort **FAIL CLOSED**: A/C runs persisted but 0 successes — Sidecars missing pinned `parameterVersionLabel` (Projection v1 bootstrap). **P2K-G-RECOVERY** wrote 6 new Projection-v2 History+Sidecar rows (`match-p2kg-recovery-v2-*`). **P2K-E Recovery V2 seal** created a **new** SEALED cohort `p2k.e.validation.recovery.v2.analyzematch.v1` (6 offline-executable members; digest `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439`). **P2K-F Recovery V2 replay** on that cohort **COMPLETED**: A 6/6, C 6/6, pairedSuccessfulCount 6 (`run.p2k.f.validation.recovery.v2.analyzematch.v1.a` / `.c`). **P2K-G Recovery V2 population evaluation** **COMPLETED**: `eval.p2k.g.validation.recovery.v2.analyzematch.v1` (paired sample 6; descriptive only; checksum `99d13ed765ae26e4e75490927c71046e27166a489c12fa95ca319104edfef833`). Old v1 and recovery-v2 cohorts remain SEALED and untouched. Candidate C remains NON-DEFAULT and is **not** auto-promoted. Production Match Script unchanged. P2K-H not authorized.

Recommended follow-ons (ordered):

1. **P2K-G population evaluation** on SEALED cohort `p2k.e.validation.expansion.v2.analyzematch.v1` (A/C replay runs ready, paired 30/30; descriptive only, no significance) — separately authorized;
2. Candidate C promotion decision remains an explicit human gate (no auto-promotion in code);
3. **L2A** Squad Intelligence Evidence (or other doc 40 items);
4. Follow **`docs/40_PRODUCT_ROADMAP.md`** for trust-track governance listing of P2*/R1B/M1B;
5. Keep Odds as optional market layer only;
6. Compose migrate automation / postgres-mode smoke evidence (platform companion);
7. Do not start Redis/BullMQ/pgvector, public auth, or network AI without a separate approved milestone.

Recently delivered: **P2K-F Validation Expansion V2 Sealed Cohort Offline Replay Run** (`docs/sprints/P2K/P2K_F_VALIDATION_EXPANSION_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`); **P2K-E Validation Expansion V2 Sealed Replay Cohort** (`docs/sprints/P2K/P2K_E_VALIDATION_EXPANSION_V2_SEALED_COHORT_COMPLETION_REPORT.md`); **P2K-G2-A Validation Dataset Diversity Expansion** (`docs/sprints/P2K/P2K_G2_A_VALIDATION_DATA_EXPANSION_COMPLETION_REPORT.md`); **P2K-G2 Planning/Audit** (`docs/sprints/P2K/P2K_G2_VALIDATION_DATASET_EXPANSION_PLANNING.md`); **P2K-G Validation Recovery V2 Population Evaluation**; **P2K-F Validation Recovery V2 Offline Replay**; **P2K-E Validation Recovery V2 Sealed Cohort**; **P2K-G-RECOVERY Projection V2 Bootstrap**; **P2K-F Validation Offline Replay FAIL CLOSED**; **P2K-E Validation Sealed Cohort**; **P2K Validation Data Bootstrap**; **P2K-G**; **P2K-F**; **P2K-E**; **P2K-D**; **P2K-C**; **P2K-A/B**; **P2K** planning; **R1B** / **R1A**; **M1B** / **M1A**; **P2J**–**P2A**; **O1**; **V1A**; **A2**; **P1B** / **P1A**; **L1B** / **L1A**; **A1.5** / **A1**; Freeze **v0.3**.

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
