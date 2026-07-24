# A2 — Prediction Calibration Completion Report

| Field | Value |
|---|---|
| Sprint | **A2** Prediction Calibration |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · `docs/40_PRODUCT_ROADMAP.md` (A2) · B2 Coding Law · A1 / A1.5 completion reports |
| Scope | Deterministic calibration **measurement** over Evaluation History; Workspace + Report display |
| Explicit exclusions | Provider · Feature · Rule · Projection · sealed Prediction · Evaluation logic · machine learning · database schema |

---

## 1. Completion Report

A2 adds a read-only **Prediction Calibration** measurement layer on top of the append-only
Evaluation History (A1.5):

```text
Evaluation History (A1.5, append-only)
        ↓ (read-only query, full population)
Prediction Calibration Report (A2, pure computation)
        ↓ (attached overlay, never mutates)
AnalysisReport.calibration → Workspace "预测校准" section
```

Calibration is computed **only** from existing `EvaluationHistoryRecord` rows. Missing
history is never estimated, interpolated, or fabricated — buckets and the overall report
are explicitly flagged `qualified: false` below their minimum sample-size thresholds
instead of being hidden or guessed. The report is population-wide (all matches), not
scoped to the match being viewed, and is purely descriptive: it never adjusts Prediction,
Feature, Rule, Projection, or Confidence.

---

## 2. Files changed

### `@fas/statistics` (new domain + compute)

- `src/domain/prediction-calibration-report.ts` — `PredictionCalibrationReport` and row
  types (`ConfidenceBucketAccuracyRow`, `ConfidenceDistributionRow`, `ProbabilityBucketRow`,
  `OutcomeCalibrationRow`, `GoalRangeCalibrationRow`, `CalibrationErrorMetric`,
  `PredictionCalibrationProvenance`); `PREDICTION_CALIBRATION_REPORT_MODEL_VERSION`;
  minimum qualified sample-size constants
- `src/reliability/compute-prediction-calibration-report.ts` — pure
  `computePredictionCalibrationReport(records, computedAt)` function implementing all
  required metrics
- `src/index.ts` — exports for the new domain types and compute function
- `test/prediction-calibration-report.spec.ts` — 11 new tests (empty report, per-metric
  correctness, qualification thresholds, provenance, determinism, immutability)

### `@fas/report` (overlay attachment)

- `src/domain/analysis-report.ts` — optional `calibration?: PredictionCalibrationReport`
  field on `AnalysisReport` / `CreateAnalysisReportInput`
- `src/use-case/generate-match-report-use-case.ts` — `computeCalibrationOverlay` queries
  the **full** Evaluation History population (`repository.query({})`) and computes the
  report; `withOverlays` attaches it alongside the existing per-match `evaluationHistory`;
  new `CALIBRATION_REPORT_FAILED` error code for explicit failure (never silent success)
- `test/report-builder.spec.ts` — 4 new tests: population-wide aggregation (seeded from an
  unrelated match), no mutation of Feature/Rule/Projection, always-attached overlay even
  with zero History

### `apps/api` (transport)

- `src/calibration.controller.ts` — new `GET /api/calibration` endpoint (optional
  `competitionId` / `competitionName` / `season` / `from` / `to` filters, mirroring the
  existing Evaluation History controller's query shape); read-only, computes the report
  from the injected `EvaluationHistoryRepositoryBridge`
- `src/evidence.module.ts` — registers `CalibrationController`
- `src/http-response.dto.ts` — `calibration` field added to `AnalysisReportDto` (loose
  `Record<string, unknown>` Swagger shape, matching the existing `evaluationHistory` DTO
  pattern)
- `test/import-evidence-workflow.spec.ts` — 2 new tests: `GET /api/calibration` shape, and
  `calibration` overlay assertions on the existing `/api/analyze/match/...` report test

### `apps/web` (Workspace / Report)

- `src/types/analysis.ts` — `PredictionCalibrationReportDto` and row DTOs; `calibration?`
  on `AnalysisReportDto`
- `src/components/explainable-report/calibration-section.tsx` — new **Calibration**
  Workspace section: sample size / qualification / provenance / limitations, Confidence
  Bucket Accuracy, Confidence Distribution, Reliability Table, ECE, Brier Score, Win/Draw/
  Loss (outcome) calibration, Goal-range calibration; insufficient-sample rows/report are
  visually flagged, never hidden
- `src/components/explainable-report/explainable-match-report.tsx` — renders
  `CalibrationSection` as its own section, separate from `EvaluationHistorySection`
- `src/copy/zh.ts` — Chinese copy for the new section (`report.calibration*` keys)
- `test/explainable-report.spec.tsx` — 1 new test rendering populated calibration data
  with insufficient-sample badges and limitations; existing test extended to assert the
  unavailable state

---

## 3. Calibration metrics implemented

All metrics are computed once, from the full Evaluation History population, in
`computePredictionCalibrationReport`:

| Metric | Definition | Qualification |
|---|---|---|
| **Confidence Bucket Accuracy** | Winner-hit rate per sealed confidence band (`low` / `medium` / `high` / `very_high`) | Per-band `sampleSize ≥ 5` |
| **Confidence Distribution** | Population share of History rows per confidence band | Informational (no threshold) |
| **Reliability Table** | 10 predicted-probability deciles (max of pHome/pDraw/pAway) vs. observed winner-hit frequency | Per-bucket `sampleSize ≥ 5` |
| **Calibration Error (ECE)** | Sample-weighted mean absolute gap between mean predicted probability and observed frequency across the Reliability Table | Report-level `sampleSize ≥ 20` |
| **Brier Score** | Mean squared error across (pHome, pDraw, pAway) vs. one-hot actual winner | Report-level `sampleSize ≥ 20` |
| **Win / Draw / Loss calibration** | Reliability Table repeated per outcome class (home / draw / away), using that outcome's predicted probability | Per-bucket `sampleSize ≥ 5` |
| **Goal-range calibration** | Hit rate for each predicted `GoalRangeBucket` (`range01` / `range23` / `range4Plus`) vs. `goalRangeHit` | Per-bucket `sampleSize ≥ 5` |

Every row/report carries an explicit `qualified: boolean`; unqualified rows are still
returned (not hidden) so the Workspace can render them with an "insufficient sample"
badge. `limitations: readonly string[]` always documents the Evaluation-History-only
input and the display-only, non-adjusting nature of the report; an additional limitation
is appended when the overall report or any bucket is unqualified.

---

## 4. Workspace impact

Added a dedicated **预测校准 (Prediction Calibration)** Workspace section
(`calibration-section.tsx`), rendered as its own `WorkspaceSection` between Evaluation
History and Reasoning — structurally and visually separate from the per-match Evaluation
History section, per the sprint requirement. It shows sample size, qualification status,
provenance (source record count, covered date range), limitations, and all seven metric
groups above, each qualified/unqualified row marked individually.

---

## 5. Report impact

`AnalysisReport.calibration` (via `@fas/report`) and the `GET /api/calibration` HTTP
endpoint both expose the same `PredictionCalibrationReport` shape with provenance
(`sourceRecordCount`, schema/evaluation/projection model versions, earliest/latest match
date) and sample sizes at both the report and bucket level. No prediction, feature, rule,
or projection value is read or written by this computation — it is a pure function of
Evaluation History rows plus a `computedAt` timestamp supplied by the caller.

---

## 6. Tests added

| Package | File | New tests |
|---|---|---|
| `@fas/statistics` | `test/prediction-calibration-report.spec.ts` | 11 |
| `@fas/report` | `test/report-builder.spec.ts` | 4 |
| `apps/api` | `test/import-evidence-workflow.spec.ts` | 2 |
| `apps/web` | `test/explainable-report.spec.tsx` | 1 |

---

## 7. Quality Gates

```bash
pnpm quality      # biome check + dependency-cruiser boundaries — PASS
pnpm typecheck    # all 23 packages — PASS
pnpm test         # all affected packages — PASS
                  # (pre-existing, environment-only failure: packages/database
                  #  Prisma integration test requires a live Postgres connection
                  #  not available in this sandbox; unrelated to A2 and untouched
                  #  by this sprint)
pnpm build        # apps/web, apps/api, apps/worker — PASS
pnpm workspace:check  # PASS
```

---

## 8. Remaining limitations

- Calibration is computed on every report-generation request (no caching/materialization);
  acceptable at current History volume, but a future sprint may want a stored/periodic
  artifact if History grows large.
- No competition/season-scoped calibration is surfaced in the Workspace UI yet — the
  `GET /api/calibration` endpoint accepts filters, but the Workspace section always
  requests the unfiltered, all-time population report.
- Excluded (non-scored) Evaluation History rows are not counted anywhere in calibration
  (consistent with A1.5, which does not store them).
- No calibration **curve visualization** (chart) — metrics are shown as structured
  numeric rows/tables only.
- This sprint does not create or promote any calibration **artifact** (that concept
  already exists for Projection's probability blending and is intentionally untouched);
  A2's `PredictionCalibrationReport` is a distinct, display-only measurement product.

---

## 9. Recommended next sprint

Per the roadmap's own framing: a follow-up sprint to determine **how Calibration informs
future Confidence reporting** — e.g., surfacing calibration-derived context notes
alongside Confidence in the Report — without altering the deterministic prediction
pipeline itself. Any such change must stay measurement/display-only unless a separate,
explicitly authorized sprint introduces governed feedback into Confidence policy.
