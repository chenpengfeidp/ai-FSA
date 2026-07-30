# P2E.5 — Projection Replay Validation Completion Report

| Field | Value |
|---|---|
| Sprint | **P2E.5** Projection Replay Validation |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2D · P2E · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Production coding — deterministic replay framework comparing Projection V1 vs V2 on sealed Evaluation History without mutating historical records |
| Explicit exclusions | Evaluation History mutation · Prediction record mutation · Feature extraction · Rule evaluation · Confidence · Calibration · Validation · Contribution changes · ML · UI · planning documents |

---

## 0. Governance note (roadmap citation gap)

**P2E.5** was authorized by an explicit task request. **P2A**–**P2E.5** and proposed **P2F**–**P2M** are not yet listed in `docs/40_PRODUCT_ROADMAP.md`. Add them before further coding sprints in this track.

---

## 1. Completion summary

P2E.5 delivers a **deterministic replay framework** that reads sealed Evaluation History (A1.5), replays Projection V1 and V2, compares outputs, and produces grouped comparison reports. Historical Evaluation records remain **immutable**; replay results are **temporary analysis artifacts only**.

**Architecture:**

```text
EvaluationHistoryRepository.query()
  → ReplayRunner (@fas/statistics)
      → ProjectionReplayPort.replayV1()  — sealed predictionSnapshot (original output)
      → ProjectionReplayPort.replayV2()  — computeMatchProjection pin "v2" via sidecar
  → computeProjectionReplayComparisonReport()
      → grouped segments + A2 calibration reuse + accuracy deltas
```

| Component | Package | Role |
|---|---|---|
| `ReplayRunner` | `@fas/statistics` | Orchestrates read-only replay over History rows |
| `ProjectionReplayPort` | `@fas/statistics` | Port interface (statistics does not import analysis) |
| `AnalysisProjectionReplayPort` | `@fas/analysis` | V1/V2 adapter implementing the port |
| `SealedProjectionReplayContext` | `@fas/statistics` | Sidecar inputs for V2 re-projection (not stored in History) |
| `runProjectionReplayValidation()` | `@fas/statistics` | High-level orchestrator wiring runner + comparison report |

**V1 replay:** uses stored `record.predictionSnapshot` (original sealed output).

**V2 replay:** requires `SealedProjectionReplayContext` sidecar keyed by `historyId` or `matchId`; records without sidecar are skipped with explicit reason.

---

## 2. Deliverables produced

| # | Deliverable | Status |
|---|---|---|
| 1 | Completion Report | This document |
| 2 | Files changed | §3 |
| 3 | ReplayRunner implementation | §4 |
| 4 | Comparison metrics | §5 |
| 5 | Quality gates | §6 |
| 6 | Remaining limitations | §7 |
| 7 | Recommended next sprint | §8 |

---

## 3. Files changed

### `@fas/statistics` (new replay framework)

| File | Change |
|---|---|
| `packages/statistics/src/domain/projection-replay-comparison-report.ts` | Report types, segment model, validation error |
| `packages/statistics/src/replay/projection-replay-context.ts` | `SealedProjectionReplayContext`, sidecar map types |
| `packages/statistics/src/replay/projection-replay-metrics.ts` | Winner/draw/score/goal-range/BTTS/O/U metrics + Pearson correlation |
| `packages/statistics/src/replay/projection-replay-port.ts` | `ProjectionReplayPort` interface |
| `packages/statistics/src/replay/replay-runner.ts` | `ReplayRunner` class |
| `packages/statistics/src/replay/compute-projection-replay-comparison-report.ts` | Grouped comparison report (competition, season, feature profile, intelligence domain) |
| `packages/statistics/src/replay/run-projection-replay-validation.ts` | Orchestrator function |
| `packages/statistics/src/index.ts` | Public exports |
| `packages/statistics/test/projection-replay.spec.ts` | Unit tests (metrics, runner, comparison report) |

### `@fas/analysis` (replay port adapter)

| File | Change |
|---|---|
| `packages/analysis/src/replay/analysis-projection-replay-port.ts` | `AnalysisProjectionReplayPort`, `buildProjectionReplayContext()` |
| `packages/analysis/src/index.ts` | Public exports |
| `packages/analysis/test/projection-replay-port.spec.ts` | Integration test (pipeline → sidecar → V2 replay) |

---

## 4. ReplayRunner implementation

**Entry points:**

- `ReplayRunner.run({ records, replayPort, replaySidecar?, evaluatedAt })` — per-record V1/V2 replay outcomes with metrics
- `runProjectionReplayValidation({ repository, replayPort, replaySidecar?, computedAt, query? })` — loads History, runs runner, returns comparison report

**Immutability guarantees:**

- Reads `EvaluationHistoryRecord` via repository query only
- Never calls `repository.save()` or mutates History rows
- V1 returns the existing sealed `predictionSnapshot` reference path (no re-seal)
- Sidecar context is supplied externally; not written into History

**Sidecar builder (analysis layer):**

- `buildProjectionReplayContext(analysis)` captures feature values, rule snapshots (with ruleId/weight/score), bundle checksum/status, and required-evidence count from a live `AnalysisResult`
- Intended for operators to persist sidecars separately when sealing History (future wiring); P2E.5 does not add persistence or API endpoints

---

## 5. Comparison metrics

Per replay outcome (`ProjectionReplayMetrics`):

| Metric | Source |
|---|---|
| Winner accuracy | A1 `evaluatePrediction` → `winnerHit` |
| Draw accuracy | Predicted winner vs actual when `actual.winner === "draw"` |
| Exact score hit | A1 `scoreHit` |
| Goal-range hit | A1 `goalRangeHit` |
| BTTS hit | Most-likely scenario both sides score vs actual |
| Over/Under 2.5 hit | Goal-range marginal ≥ 0.5 vs actual total goals |
| Calibration | A2 `computePredictionCalibrationReport` over synthetic replay snapshots |
| Confidence correlation | Pearson(confidence, winnerHitNumeric) |

**Grouped comparison report segments:**

- Overall population
- By competition (`actualResult.competitionId`)
- By season (`record.season`)
- By feature profile (V1A `classifyFeatureProfile`)
- By Football Intelligence domain (O1 `hasDomainFeatures`)

Each segment includes V1 block, V2 block (when replayed), and accuracy deltas (V2 − V1).

---

## 6. Quality gates

| Command | Result |
|---|---|
| `pnpm exec turbo run typecheck test --filter=@fas/statistics --filter=@fas/analysis` | **Pass** — statistics 61 tests, analysis 25 tests |
| `pnpm quality` | **Pass** — Biome, dependency-cruiser, boundary negative fixtures |

**Test coverage highlights:**

- Metrics computation (winner, BTTS, correlation)
- ReplayRunner V2 complete vs skipped paths
- Comparison report grouping + calibration blocks
- Analysis port integration without History mutation

**Not run:** full `pnpm validate` (pre-existing `DATABASE_URL` requirement for database package integration tests).

---

## 7. Remaining limitations

1. **V2 sidecar not persisted** — sealed History alone is insufficient for V2 replay; operators must supply `SealedProjectionReplayContext` sidecars keyed by `historyId` or `matchId`. Legacy History rows without sidecars skip V2 with explicit reason.
2. **No HTTP/API endpoint** — replay is library-only; callers wire repository + port + sidecar in composition root or scripts.
3. **BTTS / O/U 2.5** — deterministic research overlays derived from sealed scenarios and goal-range marginals; not part of A1 sealed evaluation metrics.
4. **Calibration on synthetic records** — A2 reuse builds temporary History-shaped records from replay predictions for display/analysis; does not mutate stored History.
5. **Segment qualification** — per-segment `qualified` flag requires ≥ 5 samples (`MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE`).
6. **Roadmap citation gap** — P2E.5 not yet listed in doc 40.

---

## 8. Recommended next sprint

**P2F — Match Script module** (`matchScript.v1`, P2B semantics) in the Projection V2 track: replace identity Match Script passthrough with governed scenario narrative inputs while keeping V1 default pin unchanged.

Parallel authorized work remains **M1B** Manager Intelligence Features → Rules → Confidence → Projection (Wave 3).

Optional follow-up to P2E.5 (not authorized here): persist sidecars at History seal time and expose `GET /api/projection-replay` read-only report endpoint.

---

## Acceptance checklist

- [x] Completion Report
- [x] Files changed
- [x] ReplayRunner implementation
- [x] Comparison metrics
- [x] Quality gates evidence
- [x] Remaining limitations
- [x] Recommended next sprint
- [x] Production code only (no Prediction architecture redesign)
- [x] Evaluation History immutability preserved
