# P2I Projection Diagnostics Engine — Completion Report

**Sprint:** P2I  
**Type:** Production coding sprint  
**Report model:** `projectionDiagnosticsReport.v1.p2i`  
**Date:** 2026-07-31  

## Goal

Deliver a deterministic diagnostics layer over sealed Evaluation History replay outcomes. Root-cause analysis only — no Projection redesign, no Evidence/Feature/Rule/Football State/Match Script/Projection logic changes, no ML, no parameter tuning.

## Diagnostics pipeline

```text
Evaluation History (read-only)
  → ReplayRunner (P2H)
      → V2 outcomes when sidecar present; else sealed V1
  → computeProjectionDiagnosticsReport()
      → FailureDistribution
      → ScriptDiagnostics
      → FootballStateDiagnostics
      → RuleDiagnostics
      → ConfidenceDiagnostics
  → ProjectionDiagnosticsReport
  → Workspace overlay / GET /api/projection-diagnostics
```

Analyze flow reuses one P2H replay run, then derives diagnostics from the same `replayResult` (no second provider/Evidence pass).

## Files changed

| Area | File | Change |
|------|------|--------|
| Domain | `packages/statistics/src/domain/projection-diagnostics-report.ts` | **New** — report types |
| Compute | `packages/statistics/src/diagnostics/compute-projection-diagnostics-report.ts` | **New** — deterministic diagnostics |
| Orchestrator | `packages/statistics/src/diagnostics/run-projection-diagnostics-report.ts` | **New** — History + sidecar + runner |
| Exports | `packages/statistics/src/index.ts` | Public P2I symbols |
| Report use case | `packages/report/src/use-case/generate-match-report-use-case.ts` | Population diagnostics overlay |
| Report contract | `packages/report/src/domain/analysis-report.ts` | Optional `projectionDiagnostics` |
| API | `apps/api/src/projection-diagnostics.controller.ts` | **New** — `GET /api/projection-diagnostics` |
| API wiring | `apps/api/src/evidence.module.ts`, `http-response.dto.ts` | Controller + DTO field |
| Web | `projection-diagnostics-section.tsx`, types, copy, report layout | **New** workspace section |
| Tests | `projection-diagnostics-report.spec.ts`, API + web tests | P2I acceptance |
| Docs | `PROJECT_STATE.md`, this completion report | Sprint status |

## Metrics

**FailureDistribution:** Winner / Draw / Score / Goal-range / BTTS / Over-Under miss counts + rates; top failure reasons sorted by count.

**ScriptDiagnostics:** activation count, winner accuracy, average confidence, average score error (|Δhome|+|Δaway| from mostLikely), average goal error (|Δtotal|); best/worst scripts by accuracy.

**FootballStateDiagnostics:** per dimension × level sample size, winner accuracy, falsePositive (elevated high/medium + winner miss), falseNegative (absent/low + winner miss).

**RuleDiagnostics:** most frequently activated PASS rules; rules with highest incorrect rate among activations; home+/away+ conflict pairs; saturation (average PASS, saturated match count at threshold 12).

**ConfidenceDiagnostics:** high-confidence wrong / low-confidence correct counts + rates; calibration buckets by confidence band.

## Workspace / API

- Workspace section **投影诊断** — top failures, worst/best scripts, Football State effectiveness, rule conflicts, confidence analysis, limitations.
- `GET /api/projection-diagnostics` — same report; optional filters (`competitionId`, `competitionName`, `season`, `from`, `to`).
- Analyze flow attaches `projectionDiagnostics` when Evaluation History + sidecar repositories are wired.

## Tests

- `packages/statistics/test/projection-diagnostics-report.spec.ts` (new)
- `apps/api/test/import-evidence-workflow.spec.ts` — `GET /api/projection-diagnostics`
- `apps/web/test/explainable-report.spec.tsx` — section unavailable state
- `packages/report/test/report-builder.spec.ts` — 14 passed

## Quality gates

| Gate | Result |
|------|--------|
| `pnpm quality` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` (P2I packages) | Pass — statistics diagnostics, api 21, web explainable-report 7, report 14 |
| `pnpm build` | Pass |
| `pnpm validate` | Requires `DATABASE_URL` in environment |

## Remaining limitations

1. Script / Football State diagnostics require V2 replay metadata (sidecar); empty when only sealed V1 History exists.
2. False positive / false negative for Football State are operational definitions (elevated vs weak state with winner miss), not causal claims.
3. Rule conflict pairs and incorrect correlations are observational co-occurrence statistics only.
4. BTTS / O-U miss metrics still use sealed scenario / goal-range proxies from replay (Evaluation unchanged).
5. Sidecar storage remains process-local memory (P2H limitation).
6. P2I not yet listed in `docs/40_PRODUCT_ROADMAP.md`.

## Recommended next sprint

**P2J — Durable replay sidecar persistence** (PostgreSQL alongside Evaluation History) so diagnostics and replay cover legacy History after restart; or parallel **M1B** Manager Intelligence Features → Rules → Confidence → Projection.
