# FAS Project State

## Snapshot

- Last updated: 2026-07-19
- Current delivery milestone: Deterministic football vertical slice (post–Milestone 3A bootstrap)
- Canonical roadmap alignment: v0.1 Foundation bootstrap remains incomplete; V2 first vertical slice (docs 34–35) plus B.1/B.2 international market path landed
- Current task status: C.2 scores-backed TEAM_FORM + goals-proxy STATISTICS implemented (recorded default; live optional)
- Current sprint: No numbered implementation sprint active
- Last completed delivery: Vertical slice C.2 — Odds scores → form/stats for analyzable `odds:*` rows
- Next authorized work: Step 3 true calibration population; interleave platform persistence
- Release status: Pre-release; private trusted environment only; not production

Update this document after every sprint, implementation gate, or material governance change.

## Current Repository Status

The repository contains the Milestone 3A bootstrap platform **and** a working private-environment deterministic analysis vertical slice.

### Platform / bootstrap (still true)

- pnpm and Turborepo workspace with exact Node.js `24.18.0` and pnpm `11.13.0` pins;
- `@fas/tsconfig`, `@fas/config`, `@fas/database` (Prisma no-model bootstrap);
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

Default API odds mode is `ODDS_PROVIDER_MODE=recorded`: fixture form/stats/h2h remain, while mapped demo matches overlay The Odds API–shaped recorded **1X2 + spreads (Asian handicap)** cassettes (`source=the-odds-api`). Live fetch requests `markets=h2h,spreads` and requires `THE_ODDS_API_KEY`. Match Center list remains demo fixtures.

Implemented packages used by the slice (non-exhaustive):

- `@fas/match`, `@fas/evidence`, `@fas/evidence-normalizer`, `@fas/evidence-import`, `@fas/evidence-query`
- `@fas/provider-fixture`, `@fas/provider-odds`, `@fas/application`
- `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`
- `@fas/statistics` (pinned identity calibration artifact; no population training)
- `@fas/prompt` (sealed-context composition; no retrieval / no network)
- `@fas/ai-provider` (`LocalDeterministicNarrativeAdapter` only; no provider SDK)

### API surface (current)

Operational:

- `GET /`
- `GET /health/live`
- `GET /health/ready`
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

Summary evidence: `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md` and B.1/B.2/C.1/C.2 specs above.

## Architecture Status

Architecture direction remains **approved with conditions**.

Binding principles still include: evidence before assumption; facts / market signals / findings / inference separation; deterministic policy outside generative AI; Analysis-owned match projection; Statistics-owned calibration maps; Prompt does not retrieve or call providers; UI does not recompute projections.

Open Milestone 3A / v0.1 items (unchanged in spirit):

- durable PostgreSQL domain models and application DB integration;
- durable jobs, audit/idempotency baselines;
- remaining container/CI/security/runtime-smoke gates.

Vertical-slice deferrals (intentional):

- trained / population calibration maps (only identity baseline);
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
- Calibration is the pinned identity artifact (`calibration:identity:v1`); not Evaluation-qualified; not trained from populations.
- Demo evidence is fixture-backed and may be `unverified`.
- The Prisma schema intentionally contains no football domain models, migrations, or seeds.
- No application PostgreSQL runtime integration for domain persistence, durable jobs, Redis, BullMQ, pgvector, or object storage is implemented.
- No OpenAI or other network provider SDK is installed for narrative generation.
- Direct dependencies are exact-pinned and the root lockfile is authoritative.
- Speculative empty engine directories must not be treated as implemented packages.

## Known Documentation Drift

- Before 2026-07-19, this file still claimed “no football-domain behavior” and API-only health endpoints; that drift is corrected here.
- Doc 35 header status text may still read as pre-implementation; treat implemented slice 1.0–1.4 behavior in code and `VERTICAL_SLICE_1_COMPLETION_REPORT.md` as delivery evidence.
- Canonical v0.1 roadmap package naming (`@fas/*-engine`) vs interim packages (`@fas/rule`, `@fas/prompt`, `@fas/statistics`) remains an intentional migration gap documented in `docs/14_MONOREPO.md`.

## Next Work

No numbered sprint is active. B.1/B.2/C.1/C.2 path is implemented with default offline recorded mode.

Recommended follow-ons (ordered):

1. **Step 3 — true calibration population**;
2. Interleave Milestone 3A platform persistence / jobs / CI gates;
3. True shots/xG STATISTICS provider (replace goals-proxy);
4. Later: volume / 战意 as separate evidence kinds (not ODDS fields).

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
