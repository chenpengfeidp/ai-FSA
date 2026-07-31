# P2H Projection Replay Validation Engine — Completion Report

**Sprint:** P2H  
**Type:** Production coding sprint  
**Report model:** `projectionReplayReport.v1.p2h`  
**Date:** 2026-07-30  

## Goal

Deliver a deterministic replay and comparison framework over sealed Evaluation History, comparing Projection V1 vs V2 without mutating History, re-fetching Evidence, or changing Intelligence pipeline engines.

## Replay pipeline

```text
Evaluation History (read-only)
  → ReplayRunner
      → replayV1() — sealed predictionSnapshot
      → replayV2() — sidecar + computeMatchProjection pin "v2"
  → computeProjectionReplayComparisonReport() — grouped V1/V2 metrics
  → computeProjectionReplayReport() — summary + script + football state stats
  → ReplayComparisonReport / Workspace / GET /api/projection-replay
```

Sidecars (`SealedProjectionReplayContext`) are persisted at History seal time from `buildProjectionReplayContext(analysis)` — features/rules/checksums only, never raw Evidence refetch.

## Files changed

| Area | File | Change |
|------|------|--------|
| Domain | `packages/statistics/src/domain/projection-replay-report.ts` | **New** — `ReplaySummary`, `ProjectionVersionComparison`, `ScriptContribution`, `FootballStateContribution`, `ProjectionReplayReport` |
| Metadata | `packages/statistics/src/replay/projection-replay-metadata.ts` | **New** — V2 replay metadata snapshots |
| Report compute | `packages/statistics/src/replay/compute-projection-replay-report.ts` | **New** — P2H report assembly |
| Orchestrator | `packages/statistics/src/replay/run-projection-replay-report.ts` | **New** — History + sidecar + runner |
| Sidecar store | `packages/statistics/src/repository/*sidecar*` | **New** — in-memory repository + port |
| Runner | `packages/statistics/src/replay/replay-runner.ts` | `v2Metadata` on outcomes |
| Port | `packages/statistics/src/replay/projection-replay-port.ts` | Optional `metadata` on replay results |
| Analysis adapter | `packages/analysis/src/replay/analysis-projection-replay-port.ts` | V2 metadata from projection result (read-only) |
| Report use case | `packages/report/src/use-case/generate-match-report-use-case.ts` | Sidecar persist + population replay overlay |
| Report contract | `packages/report/src/domain/analysis-report.ts` | Optional `projectionReplay` |
| API | `apps/api/src/projection-replay.controller.ts` | **New** — `GET /api/projection-replay` |
| API wiring | `apps/api/src/evidence.module.ts`, `runtime-database.ts`, bridges | Sidecar repo + controller |
| Web | `projection-replay-section.tsx`, types, copy, report layout | **New** workspace section |
| Tests | `projection-replay-report.spec.ts`, API + web tests | P2H acceptance |

## Replay metrics

Compared per population and segment (via existing P2E.5 comparison report):

- Winner / Draw / Exact Score / Goal Range / BTTS / Over-Under hit rates  
- Confidence correlation (Pearson)  
- Calibration (A2 synthetic snapshots — display only)  

**Script contributions (V2 metadata):** activation frequency, average weight, average confidence, weight-weighted winner / goal-range / score accuracy.

**Football State contributions (V2 metadata):** per dimension × level sample with winner / goal-range / score accuracy (Attack, Defense, Control, Transition, Pressure, Risk).

## Workspace / API

- Workspace section **投影回放验证** — sample size, V1 vs V2 table with improvement deltas, script statistics, football state statistics, limitations.  
- `GET /api/projection-replay` — same report; optional filters (`competitionId`, `competitionName`, `season`, `from`, `to`).  
- Analyze flow attaches `projectionReplay` population overlay when Evaluation History repository is wired.

## Tests added

- `packages/statistics/test/projection-replay-report.spec.ts`  
- `apps/api/test/import-evidence-workflow.spec.ts` — `GET /api/projection-replay`  
- `apps/web/test/explainable-report.spec.tsx` — section unavailable state  

## Quality gates

```text
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate   # requires DATABASE_URL in environment
```

## Remaining limitations

1. **Sidecar storage is process-local memory** — not durable PostgreSQL; restart clears V2 replay contexts for legacy History rows.  
2. **V2 replay requires sidecar** — History rows sealed before P2H wiring have V1-only replay until re-analyzed.  
3. **BTTS / O-U replay metrics** still use sealed scenario / goal-range proxies (Evaluation engine unchanged).  
4. **Script attribution** uses weight-weighted multi-label attribution across all active scripts per replay.  
5. **Governance** — P2H not yet listed in `docs/40_PRODUCT_ROADMAP.md`.

## Recommended next sprint

**P2I — Durable replay sidecar persistence** (PostgreSQL alongside Evaluation History) + matrix-native BTTS/O-U replay metrics aligned with P2G unified matrix metadata; or **M1B** Manager Intelligence Features → Rules → Confidence → Projection per parallel roadmap.
