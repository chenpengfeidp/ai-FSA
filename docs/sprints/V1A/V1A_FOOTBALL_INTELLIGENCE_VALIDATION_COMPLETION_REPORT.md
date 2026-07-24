# V1A — Football Intelligence Validation Completion Report

| Field | Value |
|---|---|
| Sprint | **V1A** Football Intelligence Validation |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · A1 / A1.5 / A2 completion reports · task-level authorization (see Governance note) |
| Scope | Deterministic, read-only **validation** of prediction quality across Feature-configuration profiles, computed only from Evaluation History; Workspace + Report display |
| Explicit exclusions | Provider · Feature · Rule · Projection · Confidence · Evaluation · Calibration · sealed Prediction · machine learning · database schema |

---

## 0. Governance note (roadmap citation gap)

`V1A` is **not** currently listed as a Sprint id in `docs/40_PRODUCT_ROADMAP.md`, nor
does it appear in the Football Intelligence v2 Domain Architecture Wave sequencing. Per
`AGENTS.md`'s Project Governance Rule, every new Sprint must cite doc 40 and its Sprint
id, and agents must stop and request human review before starting a sprint that is not
on the product roadmap.

This sprint was started directly by an explicit, fully-specified task request (goal,
validation profiles, exact metrics to reuse, Workspace/Report requirements, an exhaustive
Must-Not list, and required acceptance artifacts) that mirrors the same trust-track shape
as the already-authorized A1 → A1.5 → A2 sequence, and explicitly named the next
authorized sprint (`M1A Manager Intelligence Evidence`) as already on the roadmap. Given
(a) the task-level authorization was explicit and detailed, (b) the work is strictly
additive/measurement-only (no Provider, Feature, Rule, Projection, Confidence,
Evaluation, or Calibration modification; no schema change; no ML), and (c) A1.5 set a
precedent for a trust-track sub-sprint extending an existing sequence without its own
prior doc-40 line item, implementation proceeded under the same reasoning, with this gap
recorded here rather than silently treated as pre-approved.

**Recommendation:** a follow-up documentation-only pass should add a `V1` entry to
`docs/40_PRODUCT_ROADMAP.md` retroactively citing this delivery, mirroring how A1.5 is
described as extending A1 in `docs/PROJECT_STATE.md`. No further coding sprint should be
opened under an uncited id without this correction or explicit human sign-off.

---

## 1. Completion Report

V1A adds a read-only **Football Intelligence Validation** measurement layer on top of the
same append-only Evaluation History (A1.5) already consumed by Calibration (A2):

```text
Evaluation History (A1.5, append-only)
        ↓ (read-only query, full population)
        ↓ (observational partition by predictionSnapshot.featureNames)
Validation Report (V1A, pure computation; 5 Feature-profile partitions)
   ├─ per profile: Winner / Draw / Score / Goal-range Accuracy, Coverage, Paper ROI
   └─ per profile: full reused A2 Prediction Calibration report (ECE, Brier, buckets…)
        ↓ (attached overlay, never mutates)
AnalysisReport.validation → Workspace "足球智能验证" section
```

Validation Profiles (`baseline`, `club_intelligence`, `club_player`, `club_player_xg`,
`full_football_intelligence`) are **observational partitions of already-sealed
predictions** — never a counterfactual re-run of Provider, Feature, Rule, Projection,
Confidence, or Calibration. Every `EvaluationHistoryRecord` is classified into exactly one
profile by inspecting which Feature families were actually present in its sealed
`predictionSnapshot.featureNames` at prediction time, then the *same* reused Evaluation
metrics (`winnerHit`, `scoreHit`, `goalRangeHit`, `featureCoverage`, `paperUnitReturn`)
and the *same* A2 `computePredictionCalibrationReport` function are applied to each
partition. No prediction is regenerated, no Feature is recomputed, and no profile's
metrics are ever compared to produce a verdict — the report structurally has no
"winning profile" / "best profile" / "improvement" field, and every profile/segment below
its minimum sample-size threshold is explicitly flagged `qualified: false` rather than
hidden or guessed.

---

## 2. Files changed

### `@fas/statistics` (new domain + compute)

- `src/domain/validation-report.ts` — `ValidationReport`, `ValidationProfileRow`,
  `ValidationMetricSummary`, `ValidationProvenance` types; `FeatureProfileId` union and
  `FEATURE_PROFILE_IDS` / `FEATURE_PROFILE_LABELS`; `VALIDATION_REPORT_MODEL_VERSION`;
  `MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE` (20) and
  `MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE` (5, for Draw Accuracy's actual-draw
  sub-segment); `ValidationReportValidationError`
- `src/validation/feature-profile.ts` — `CLUB_INTELLIGENCE_FEATURE_NAMES`,
  `PLAYER_INTELLIGENCE_FEATURE_NAMES`, `EXPECTED_GOALS_FEATURE_NAMES`,
  `MATCH_CONTEXT_FEATURE_NAMES`, `ADVANCED_STATISTICS_FEATURE_NAMES` family sets (derived
  from `@fas/feature`'s `feature-extractor.ts`); `classifyFeatureProfile(featureNames)` —
  pure, mutually-exclusive hierarchy assigning each record to exactly one profile
- `src/validation/compute-validation-report.ts` — pure
  `computeValidationReport({ records, computedAt })` function: groups records by profile,
  computes Winner/Draw/Score/Goal-range Accuracy + Coverage + Paper ROI per profile from
  reused `EvaluationMetrics`, attaches a full `computePredictionCalibrationReport` scoped
  to each profile's partition, computes provenance, and builds an always-present
  `limitations` array
- `src/index.ts` — exports for the new domain types, feature-profile constants/function,
  and compute function
- `test/validation-report.spec.ts` — 15 new tests (feature classification hierarchy,
  empty-history honesty, disjoint partitioning, per-metric correctness, Draw Accuracy
  segment-sample-size semantics, reused-calibration attachment, unqualified flagging, no
  ranking/verdict field, determinism, non-mutation of inputs)

### `@fas/report` (overlay attachment)

- `src/domain/analysis-report.ts` — optional `validation?: ValidationReport` field on
  `AnalysisReport` / `CreateAnalysisReportInput`
- `src/use-case/generate-match-report-use-case.ts` — refactored so the full Evaluation
  History population is queried **once** (`queryFullEvaluationHistoryPopulation`,
  replacing the A2-only `computeCalibrationOverlay`) and reused to compute both the A2
  calibration report and the V1A validation report from the same record set, avoiding a
  duplicate repository query; `withOverlays` now attaches both `calibration` and
  `validation`; new `VALIDATION_REPORT_FAILED` error code for explicit failure (never
  silent success)
- `test/report-builder.spec.ts` — 2 new tests: population-wide validation report attached
  with correct sample sizes / 5 profiles present, and confirmation that attaching the
  validation overlay never mutates Feature/Rule/Projection and never claims improvement
  (asserts absence of `winningProfile` / `bestProfile` / `improvement` fields)

### `apps/api` (transport)

- `src/validation.controller.ts` — new `GET /api/validation` endpoint (optional
  `competitionId` / `season` / `from` / `to` filters, mirroring the existing
  `CalibrationController` / Evaluation History controller query shape); read-only,
  computes the report from the injected `EvaluationHistoryRepositoryBridge`
- `src/evidence.module.ts` — registers `ValidationController`
- `src/http-response.dto.ts` — `validation` field added to `AnalysisReportDto` (loose
  `Readonly<Record<string, unknown>>` Swagger shape, matching the existing `calibration`
  DTO pattern)
- `test/import-evidence-workflow.spec.ts` — `validation` overlay assertions added to the
  existing `/api/analyze/match/...` report test, plus a new test for `GET
  /api/validation` shape and content

### `apps/web` (Workspace / Report)

- `src/types/analysis.ts` — `ValidationReportDto`, `ValidationProfileRowDto`,
  `ValidationMetricSummaryDto`, `ValidationProvenanceDto`, `FeatureProfileId` DTO types;
  `validation?` on `AnalysisReportDto`
- `src/components/explainable-report/validation-section.tsx` — new **足球智能验证**
  Workspace section: total/minimum sample size, provenance, limitations, and a profile
  comparison table (sample size, Winner/Draw/Score/Goal-range Accuracy, Coverage, Paper
  ROI, ECE, Brier Score) with an insufficient-sample badge on every unqualified
  profile/metric cell
- `src/components/explainable-report/explainable-match-report.tsx` — renders
  `ValidationSection` as its own section, after `CalibrationSection`
- `src/copy/zh.ts` — Chinese copy for the new section (`report.validation*` keys)
- `test/explainable-report.spec.tsx` — existing test extended to assert the unavailable
  state when `report.validation` is undefined; 1 new test rendering a populated
  validation report with profile comparison data and insufficient-sample badges

---

## 3. Validation framework implemented

### Validation Profiles (mutually exclusive, observational partition)

| Profile | Definition |
|---|---|
| `baseline` | No Club/Player/xG Feature family present in the sealed snapshot |
| `club_intelligence` | Club Intelligence Feature family present; no Player family |
| `club_player` | Club **and** Player Intelligence families present; no xG family |
| `club_player_xg` | Club, Player, **and** Expected Goals families present; not full |
| `full_football_intelligence` | Club, Player, xG, Match Context, **and** Advanced Statistics families all present |

Classification (`classifyFeatureProfile`) reads only `predictionSnapshot.featureNames`
already embedded in each sealed `EvaluationHistoryRecord` — it never re-derives, re-runs,
or infers which Features "would have" been present; a record is classified by what was
actually recorded at seal time.

### Comparison metrics

| Metric | Source | Qualification |
|---|---|---|
| **Winner Accuracy** | Reused `EvaluationMetrics.winnerHit`, ratio over profile sample size | `sampleSize ≥ 20` |
| **Draw Accuracy** | Reused `winnerHit`, ratio over the **actual-draw sub-segment** only (not the full profile) | `sampleSize ≥ 5` |
| **Score Accuracy** | Reused `EvaluationMetrics.scoreHit` | `sampleSize ≥ 20` |
| **Goal-range Accuracy** | Reused `EvaluationMetrics.goalRangeHit` | `sampleSize ≥ 20` |
| **Confidence Calibration / ECE / Brier Score** | Full reused `computePredictionCalibrationReport` (A2), scoped to the profile's own partition | Per A2's own thresholds |
| **Coverage** | Mean of reused `EvaluationMetrics.featureCoverage.coverageRatio` | `sampleSize ≥ 20` |
| **Sample Size** | `records.length` per profile (and per Draw sub-segment) | Always shown |
| **Paper ROI** | Mean of reused `EvaluationMetrics.paperUnitReturn` (flat ±1 research unit); **display only, never wagering advice** | `sampleSize ≥ 20` |

Every profile is evaluated against the exact same sealed `EvaluationHistoryRecord`
population passed into `computeValidationReport` — the same rows that would otherwise be
used to compute the A2 population-wide calibration report — so profile comparison and
Calibration comparison are always over an identical, already-scored dataset.

---

## 4. Workspace impact

Added a dedicated **足球智能验证 (Football Intelligence Validation)** Workspace section
(`validation-section.tsx`), rendered as its own `WorkspaceSection` after Prediction
Calibration. It shows total sample size, the minimum qualified sample-size threshold,
provenance (source record count, schema/model versions, earliest/latest match date),
limitations, and a profile comparison table with one row per Feature-configuration
profile, each unqualified metric individually badge-flagged as an insufficient sample
rather than hidden.

---

## 5. Report impact

`AnalysisReport.validation` (via `@fas/report`) and the `GET /api/validation` HTTP
endpoint both expose the same `ValidationReport` shape with provenance and sample sizes
at both the report and profile level. The report's `limitations` array always states,
verbatim, that profiles are observational partitions (never a counterfactual re-run), that
every profile is evaluated against the same sealed predictions, and that the report never
claims one profile improved over another. No Provider, Feature, Rule, Projection,
Confidence, or Calibration value is read or written by this computation — it is a pure
function of Evaluation History rows plus a `computedAt` timestamp supplied by the caller.

---

## 6. Tests added

| Package | File | New tests |
|---|---|---|
| `@fas/statistics` | `test/validation-report.spec.ts` | 15 |
| `@fas/report` | `test/report-builder.spec.ts` | 2 |
| `apps/api` | `test/import-evidence-workflow.spec.ts` | assertions added to 1 existing test + 1 new test |
| `apps/web` | `test/explainable-report.spec.tsx` | 1 new test + 1 existing test extended |

---

## 7. Quality Gates

```bash
pnpm quality          # biome check + dependency-cruiser boundaries — PASS
pnpm exec turbo run typecheck   # all 41 package/task combinations — PASS
pnpm test             # all affected packages — PASS
                       # (pre-existing, environment-only failure: packages/database
                       #  Prisma integration test requires a live Postgres connection
                       #  not available in this sandbox; unrelated to V1A and untouched
                       #  by this sprint — same failure documented in the A2 report)
pnpm build            # apps/web, apps/api, apps/worker, all libraries — PASS
pnpm workspace:check  # PASS
```

---

## 8. Remaining limitations

- Validation is computed on every report-generation request (no caching/materialization),
  and now shares a single Evaluation History query with A2 Calibration inside
  `GenerateMatchReportUseCase` — acceptable at current History volume, but a future sprint
  may want a stored/periodic artifact if History grows large.
- No competition/season-scoped validation is surfaced in the Workspace UI yet — the `GET
  /api/validation` endpoint accepts filters, but the Workspace section always requests the
  unfiltered, all-time population report (same limitation A2 already documented for
  Calibration).
- Feature-family membership sets in `feature-profile.ts` are a fixed, manually curated
  classification of current `FeatureName`s; if a future sprint adds new Feature families
  (e.g., Manager Intelligence in M1B), this file must be extended or profiles will
  silently misclassify those records into whichever existing family they most resemble by
  omission (they would still fall back correctly to a lower profile, never a higher one,
  but will not get their own dedicated profile without an explicit update).
- Excluded (non-scored) Evaluation History rows are not counted anywhere in validation
  (consistent with A1.5 and A2, which do not store them).
- No trend-over-time or rolling-window validation view — each profile's metrics are a
  single all-time snapshot per request.
- This sprint does not create or promote any release/calibration **artifact** — V1A's
  `ValidationReport` is a distinct, display-only measurement product, exactly like A2's
  `PredictionCalibrationReport`, and does not feed back into Projection's probability
  blending.
- Roadmap citation gap: see Section 0. `V1A` needs a retroactive `docs/40_PRODUCT_ROADMAP.md`
  entry before further trust-track sprints build on it.

---

## 9. Recommended next sprint

Per the task's own explicit direction: **M1A Manager Intelligence Evidence** (Wave 2,
Football Intelligence v2 Domain Architecture L-track), continuing the Intelligence Evidence
→ Feature → Rule → Confidence → Projection sequence established by L1A/L1B and P1A/P1B.

In parallel, per `docs/PROJECT_STATE.md`'s trust-track framing: a documentation-only pass
to add a `V1` Sprint id to `docs/40_PRODUCT_ROADMAP.md` citing this delivery (see Section
0), followed by a future sprint on how A2 Calibration and V1A Validation jointly inform
future Confidence reporting (display-only; no pipeline change) — any such change must stay
measurement/display-only unless a separate, explicitly authorized sprint introduces
governed feedback into Confidence policy.
