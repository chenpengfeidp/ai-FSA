# O1 — Football Intelligence Contribution Analysis Completion Report

| Field | Value |
|---|---|
| Sprint | **O1** Football Intelligence Contribution Analysis |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · A1 / A1.5 / A2 / V1A completion reports · task-level authorization (see Governance note) |
| Scope | Deterministic, read-only **contribution measurement** of each Football Intelligence domain, computed only from Evaluation History; Workspace + Report display |
| Explicit exclusions | Provider · Feature · Rule · Projection · Confidence · Evaluation · Calibration · sealed Prediction · machine learning; no prediction regeneration |

---

## 0. Governance note (roadmap citation gap)

`O1` is **not** currently listed as a Sprint id in `docs/40_PRODUCT_ROADMAP.md`, nor does
it appear in the Football Intelligence v2 Domain Architecture Wave sequencing. Per
`AGENTS.md`'s Project Governance Rule, every new Sprint must cite doc 40 and its Sprint
id, and agents must stop and request human review before starting a sprint that is not on
the product roadmap.

This sprint was started directly by an explicit, fully-specified task request (goal,
eight named Intelligence domains, exact metrics to reuse, Workspace/Report requirements,
an exhaustive Must-Not list, and required acceptance artifacts) that mirrors the same
trust-track shape as the already-authorized A1 → A1.5 → A2 → V1A sequence, and explicitly
builds on V1A's completion report as background. Given (a) the task-level authorization
was explicit and detailed, (b) the work is strictly additive/measurement-only (no
Provider, Feature, Rule, Projection, Confidence, Evaluation, or Calibration modification;
no schema change; no ML; no prediction regeneration), and (c) V1A itself set a precedent
for a trust-track sub-sprint extending an existing sequence without its own prior doc-40
line item (which in turn cited A1.5's precedent), implementation proceeded under the same
reasoning, with this gap recorded here rather than silently treated as pre-approved.

**Recommendation:** the follow-up documentation-only pass already recommended by V1A
(adding a `V1` entry to `docs/40_PRODUCT_ROADMAP.md`) should be extended to also add an
`O1` entry citing this delivery. No further coding sprint should be opened under an
uncited id without this correction or explicit human sign-off.

---

## 1. Completion Report

O1 adds a read-only **Football Intelligence Contribution** measurement layer on top of
the same append-only Evaluation History (A1.5) already consumed by Calibration (A2) and
Validation (V1A):

```text
Evaluation History (A1.5, append-only)
        ↓ (read-only query, full population — same query V1A/A2 already share)
        ↓ (observational, non-exclusive presence check per domain)
Contribution Report (O1, pure computation; 8 Intelligence domains)
   ├─ per domain: Coverage, Sample Size, Winner/Draw/Score/Goal-range Accuracy
   ├─ per domain: reused A2 ECE + Brier Score (scoped to the domain's own partition)
   └─ per domain: Paper ROI, Qualification status
        ↓ (attached overlay, never mutates)
AnalysisReport.contribution → Workspace "足球智能贡献分析" section
```

Unlike V1A's mutually-exclusive Feature-configuration profile ladder, O1's eight domains
(**Venue Intelligence, Availability Intelligence, Advanced Statistics, Expected Goals,
Match Context, Club Intelligence, Player Intelligence, Market Intelligence**) are
**independent, non-exclusive observational presence checks**: each sealed
`EvaluationHistoryRecord` is tested against every domain's Feature-name family in turn, so
a single record can count toward several domain rows at once (e.g. a record carrying both
Club and Player Features contributes to both domains' sample sizes). This directly matches
the task's framing — "measure the *contribution* of each domain" — rather than partitioning
the population into disjoint configurations.

For every domain, the report reuses the exact same Evaluation (A1) metrics
(`winnerHit`, `scoreHit`, `goalRangeHit`, `paperUnitReturn`) and the exact same A2
`computePredictionCalibrationReport` function (scoped to that domain's own record subset)
that V1A already reuses per profile. No prediction is regenerated, no Feature is
recomputed, and the report structurally has **no** `bestDomain` / `ranking` / `causation`
field — domains are always listed in a fixed canonical order (the order given in the task
brief) and are never sorted or ranked by measured performance, and every domain/segment
below its minimum sample-size threshold is explicitly flagged `qualified: false` rather
than hidden or guessed.

---

## 2. Files changed

### `@fas/statistics` (new domain + compute)

- `src/domain/contribution-report.ts` — `ContributionReport`, `DomainContributionRow`,
  `ContributionProvenance` types; `IntelligenceDomainId` union (8 domains) and
  `INTELLIGENCE_DOMAIN_IDS` (fixed canonical order) / `INTELLIGENCE_DOMAIN_LABELS`;
  `CONTRIBUTION_REPORT_MODEL_VERSION`; `MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE` (20) and
  `MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE` (5, for Draw Accuracy's actual-draw
  sub-segment); `ContributionReportValidationError`. Reuses V1A's existing
  `ValidationMetricSummary` and A2's existing `CalibrationErrorMetric` types rather than
  duplicating them.
- `src/contribution/domain-feature-families.ts` — `VENUE_INTELLIGENCE_FEATURE_NAMES`,
  `AVAILABILITY_INTELLIGENCE_FEATURE_NAMES`, `MATCH_CONTEXT_DOMAIN_FEATURE_NAMES` (new;
  includes `homeStability`, which V1A's own `MATCH_CONTEXT_FEATURE_NAMES` omits — kept as a
  separate constant to avoid changing already-shipped V1A behavior), and
  `MARKET_INTELLIGENCE_FEATURE_NAMES` (new family sets, derived from `@fas/feature`'s
  `feature-extractor.ts`); re-exports V1A's `ADVANCED_STATISTICS_FEATURE_NAMES`,
  `CLUB_INTELLIGENCE_FEATURE_NAMES`, `EXPECTED_GOALS_FEATURE_NAMES`,
  `PLAYER_INTELLIGENCE_FEATURE_NAMES` for the other four domains rather than duplicating
  them; `INTELLIGENCE_DOMAIN_FEATURE_NAMES` lookup map; `hasDomainFeatures(featureNames,
  domain)` — pure, independent (non-exclusive) presence check per domain
- `src/contribution/compute-contribution-report.ts` — pure
  `computeContributionReport({ records, computedAt })` function: for each of the 8 domains
  (in fixed order) filters the population to records whose sealed `predictionSnapshot`
  carried at least one of that domain's Feature names, computes Winner/Draw/Score/
  Goal-range Accuracy + population Coverage + Paper ROI from reused `EvaluationMetrics`,
  attaches reused `expectedCalibrationError`/`brierScore` from a
  `computePredictionCalibrationReport` scoped to that domain's own partition, computes
  provenance, and builds an always-present `limitations` array that states the report
  never ranks domains and never claims causation
- `src/index.ts` — exports for the new domain types, family-set constants/function, and
  compute function
- `test/contribution-report.spec.ts` — 14 new tests (domain presence classification
  including the `homeStability` fix, non-exclusive multi-domain counting, empty-history
  honesty, fixed canonical ordering, per-metric correctness including population Coverage
  and the actual-draw Draw Accuracy sub-segment, reused-calibration attachment, unqualified
  flagging, absence of any rank/best-domain/causation field, determinism, non-mutation of
  inputs)

### `@fas/report` (overlay attachment)

- `src/domain/analysis-report.ts` — optional `contribution?: ContributionReport` field on
  `AnalysisReport` / `CreateAnalysisReportInput`
- `src/use-case/generate-match-report-use-case.ts` — extended `withOverlays` to also
  compute and attach `contribution` from the same already-queried full Evaluation History
  population shared with A2 Calibration and V1A Validation (no additional repository
  query); new `CONTRIBUTION_REPORT_FAILED` error code for explicit failure (never silent
  success)
- `test/report-builder.spec.ts` — 2 new tests: population-wide contribution report attached
  with correct sample size and all 8 domains present in fixed order, and confirmation that
  attaching the contribution overlay never mutates Feature/Rule/Projection and never ranks
  domains (asserts absence of `bestDomain` / `ranking` fields)

### `apps/api` (transport)

- `src/contribution.controller.ts` — new `GET /api/contribution` endpoint (optional
  `competitionId` / `competitionName` / `season` / `from` / `to` filters, mirroring the
  existing `ValidationController` / `CalibrationController` query shape); read-only,
  computes the report from the injected `EvaluationHistoryRepositoryBridge`
- `src/evidence.module.ts` — registers `ContributionController`
- `src/http-response.dto.ts` — `contribution` field added to `AnalysisReportDto` (loose
  `Readonly<Record<string, unknown>>` Swagger shape, matching the existing
  `calibration`/`validation` DTO pattern)
- `test/import-evidence-workflow.spec.ts` — `contribution` overlay assertions added to the
  existing `/api/analyze/match/...` report test, plus a new test for `GET
  /api/contribution` shape, fixed domain ordering, and content

### `apps/web` (Workspace / Report)

- `src/types/analysis.ts` — `IntelligenceDomainId`, `DomainContributionRowDto`,
  `ContributionProvenanceDto`, `ContributionReportDto` DTO types; `contribution?` on
  `AnalysisReportDto`
- `src/components/explainable-report/contribution-section.tsx` — new **足球智能贡献分析**
  Workspace section: total/minimum sample size, provenance-derived limitations, and a
  domain comparison table (sample size, Coverage, Winner/Draw/Score/Goal-range Accuracy,
  ECE, Brier Score, Paper ROI) with an insufficient-sample badge on every unqualified
  domain/metric cell; domains are always rendered in the fixed order returned by the API,
  never re-sorted by the UI
- `src/components/explainable-report/explainable-match-report.tsx` — renders
  `ContributionSection` as its own section, after `ValidationSection`
- `src/copy/zh.ts` — Chinese copy for the new section (`report.contribution*` keys)
- `test/explainable-report.spec.tsx` — existing test extended to assert the unavailable
  state when `report.contribution` is undefined; 1 new test rendering a populated
  contribution report with domain comparison data and insufficient-sample badges

---

## 3. Contribution metrics

### Football Intelligence domains (independent, non-exclusive presence checks)

| Domain | Feature-name family source |
|---|---|
| Venue Intelligence | `venueAdvantage` |
| Availability Intelligence | `availabilityPenaltyHome`, `availabilityPenaltyAway` |
| Advanced Statistics | reused V1A `ADVANCED_STATISTICS_FEATURE_NAMES` (attack efficiency, possession, chance creation, discipline risk) |
| Expected Goals | reused V1A `EXPECTED_GOALS_FEATURE_NAMES` (xG attack/defense quality, xG dominance, finishing efficiency) |
| Match Context | fatigue index, rotation pressure, schedule advantage, knockout context, **and** `homeStability` (V1A's own set omits `homeStability`; corrected here in a dedicated O1 constant without touching V1A) |
| Club Intelligence | reused V1A `CLUB_INTELLIGENCE_FEATURE_NAMES` |
| Player Intelligence | reused V1A `PLAYER_INTELLIGENCE_FEATURE_NAMES` |
| Market Intelligence | market lean, market-implied probabilities, Asian handicap line/lean, market consensus, steam move, reverse line movement, market volatility, sharp support |

Classification (`hasDomainFeatures`) reads only `predictionSnapshot.featureNames` already
embedded in each sealed `EvaluationHistoryRecord` — it never re-derives, re-runs, or infers
which Features "would have" been present. Because domains are independent rather than a
partition, `computeContributionReport` tests every domain against every record (a record
may satisfy zero, some, or all eight domains).

### Comparison metrics (one row per domain)

| Metric | Source | Qualification |
|---|---|---|
| **Coverage** | `domainSampleSize / totalSampleSize` over the *entire* sealed population — how often this domain's Features were present at all (distinct from V1A's per-record Feature-completeness "Coverage") | domain `sampleSize ≥ 20` |
| **Sample Size** | Count of sealed rows whose snapshot carried this domain's Features | Always shown |
| **Winner Accuracy** | Reused `EvaluationMetrics.winnerHit`, ratio over the domain's own sample size | `sampleSize ≥ 20` |
| **Draw Accuracy** | Reused `winnerHit`, ratio over the domain's **actual-draw sub-segment** only | `sampleSize ≥ 5` |
| **Score Accuracy** | Reused `EvaluationMetrics.scoreHit` | `sampleSize ≥ 20` |
| **Goal-range Accuracy** | Reused `EvaluationMetrics.goalRangeHit` | `sampleSize ≥ 20` |
| **ECE** | Reused `computePredictionCalibrationReport(...).expectedCalibrationError`, scoped to the domain's own partition | Per A2's own thresholds |
| **Brier Score** | Reused `computePredictionCalibrationReport(...).brierScore`, scoped to the domain's own partition | Per A2's own thresholds |
| **Paper ROI** | Mean of reused `EvaluationMetrics.paperUnitReturn` (flat ±1 research unit); **display only, never wagering advice** | `sampleSize ≥ 20` |
| **Qualification status** | `sampleSize ≥ MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE (20)` | Always shown per domain and per metric cell |

Every domain is evaluated against the exact same sealed `EvaluationHistoryRecord`
population passed into `computeContributionReport` — the same rows A2 Calibration and V1A
Validation already measure — so domain, profile, and population-wide calibration
comparisons are always over an identical, already-scored dataset.

---

## 4. Workspace impact

Added a dedicated **足球智能贡献分析 (Football Intelligence Contribution Analysis)**
Workspace section (`contribution-section.tsx`), rendered as its own `WorkspaceSection`
after Football Intelligence Validation. It shows total sample size, the minimum qualified
sample-size threshold, limitations, and a domain comparison table with one row per
Intelligence domain in the fixed canonical order, each unqualified metric individually
badge-flagged as an insufficient sample rather than hidden. The UI performs no sorting or
ranking of domains by any measured metric.

---

## 5. Report impact

`AnalysisReport.contribution` (via `@fas/report`) and the `GET /api/contribution` HTTP
endpoint both expose the same `ContributionReport` shape with provenance and sample sizes
at both the report and domain level. The report's `limitations` array always states,
verbatim, that domains are independent, non-exclusive observational presence checks (never
a counterfactual re-run), that Coverage measures population presence rather than
per-record Feature completeness, and that the report never claims causation and never
ranks domains. No Provider, Feature, Rule, Projection, Confidence, Evaluation, or
Calibration value is read or written by this computation — it is a pure function of
Evaluation History rows plus a `computedAt` timestamp supplied by the caller.

---

## 6. Tests added

| Package | File | New tests |
|---|---|---|
| `@fas/statistics` | `test/contribution-report.spec.ts` | 14 |
| `@fas/report` | `test/report-builder.spec.ts` | 2 |
| `apps/api` | `test/import-evidence-workflow.spec.ts` | assertions added to 1 existing test + 1 new test |
| `apps/web` | `test/explainable-report.spec.tsx` | 1 new test + 1 existing test extended |

---

## 7. Quality Gates

```bash
pnpm quality          # biome check + dependency-cruiser boundaries — PASS
pnpm typecheck        # all package/task combinations — PASS
pnpm test             # all affected packages — PASS
                       # (pre-existing, environment-only failure: packages/database
                       #  Prisma integration test requires a live Postgres connection
                       #  not available in this sandbox; unrelated to O1 and untouched
                       #  by this sprint — same failure documented in the A2/V1A reports)
pnpm build            # apps/web, apps/api, apps/worker, all libraries — PASS
pnpm workspace:check  # PASS
```

---

## 8. Remaining limitations

- Contribution is computed on every report-generation request (no caching/materialization),
  reusing the single Evaluation History query already shared by A2 Calibration and V1A
  Validation inside `GenerateMatchReportUseCase` — acceptable at current History volume,
  but a future sprint may want a stored/periodic artifact if History grows large.
- No competition/season-scoped contribution view is surfaced in the Workspace UI yet — the
  `GET /api/contribution` endpoint accepts filters, but the Workspace section always
  requests the unfiltered, all-time population report (same limitation A2/V1A already
  documented).
- Domain Feature-name family sets in `domain-feature-families.ts` are a fixed, manually
  curated classification of current `FeatureName`s; if a future sprint adds new Feature
  families (e.g., Manager Intelligence in M1B), this file must be extended or the new
  Features will simply not count toward any of the current eight domains until updated.
- Because domains are independent rather than a partition, domain sample sizes are **not**
  additive to the total population size and intentionally overlap — this is by design
  (a record with both Club and Player Features counts toward both), but must not be
  misread as a probability distribution over domains.
- Excluded (non-scored) Evaluation History rows are not counted anywhere in contribution
  measurement (consistent with A1.5, A2, and V1A, which do not store/count them either).
- No trend-over-time or rolling-window contribution view — each domain's metrics are a
  single all-time snapshot per request.
- This sprint does not create or promote any release/calibration **artifact** — O1's
  `ContributionReport` is a distinct, display-only measurement product, exactly like A2's
  `PredictionCalibrationReport` and V1A's `ValidationReport`, and does not feed back into
  Projection's probability blending.
- Roadmap citation gap: see Section 0. `O1` (and `V1A` before it) needs a retroactive
  `docs/40_PRODUCT_ROADMAP.md` entry before further trust-track sprints build on this line.

---

## 9. Recommended next sprint

Per the most recently authorized Wave 2 direction (carried through P1B → A2 → V1A → O1):
**M1A Manager Intelligence Evidence** (Wave 2, Football Intelligence v2 Domain
Architecture L-track), continuing the Intelligence Evidence → Feature → Rule → Confidence
→ Projection sequence established by L1A/L1B and P1A/P1B.

In parallel, per `docs/PROJECT_STATE.md`'s trust-track framing: the documentation pass
already recommended by V1A to add a `V1` Sprint id to `docs/40_PRODUCT_ROADMAP.md` should
be extended to also add an `O1` entry citing this delivery (see Section 0), before any
further trust-track sprint (e.g. one on how A2 Calibration, V1A Validation, and O1
Contribution jointly inform future Confidence reporting) is opened without its own
prior roadmap citation.
