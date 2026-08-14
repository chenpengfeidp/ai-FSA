# P2K-G2 — Validation Dataset Expansion Planning / Audit

**Status:** PLANNING / AUDIT ONLY (no code change, no DB mutation, no cohort, no P2K-E/F/G/H)  
**Date:** 2026-08-16  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-G Recovery V2 (`docs/sprints/P2K/P2K_G_VALIDATION_RECOVERY_V2_POPULATION_EVALUATION_COMPLETION_REPORT.md`). P2K-G2 is a planning/audit phase; per the Project Governance Rule in `AGENTS.md` every Sprint artifact must cite `docs/40_PRODUCT_ROADMAP.md` — this phase maps to the roadmap **A1 (Evaluation)** / **A2 (Calibration)** lineage (doc 40 §A1, §A2). Governance note carried from `docs/PROJECT_STATE.md`: P2A–P2K / R1A / R1B / M1B are **not yet listed** in doc 40 (doc 40 `R1` = AI Review ≠ R1B); this gap is recorded, not resolved here.  
**Stop boundary:** Audit + design only. **NO CODE CHANGES. NO DATABASE MUTATION. NO NEW COHORT. NO P2K-E. NO P2K-F. NO P2K-G. NO P2K-H.**

---

## 1. Executive Summary

The current validation dataset behind P2K-G is **n = 6 scored members** (`p2k.e.validation.recovery.v2.analyzematch.v1`, SEALED, digest `3b707860…`). That dataset is real in the pipeline sense (real `AnalyzeMatchUseCase` → `GenerateMatchReportUseCase` → History + Sidecar persistence with catalog-valid RuleResults and complete Projection-v2 parameter provenance), but it is **not** real-world football data: the 6 fixtures come from 6 recorded `FixtureProvider` templates (all SCHEDULED, no FT scores) and every actual outcome is a **hand-assigned** `MATCH_RESULT` (`providerSource = validation-bootstrap`).

The audit finds that the **true bottleneck is not the pipeline machinery** (Import → Evidence → Feature → Rule → Projection → Report → History/Sidecar, P2K-C eligibility, `offlineReplayExecutable`, offline A/C replay all work end-to-end) **but the underlying data supply and prediction diversity**:

1. **Template supply:** exactly **7** `FixtureProvider` templates exist (`match-example`, `match-example-1…6`), built from only **2 form profiles**, **3 H2H shapes**, **4 odds shapes** — collapsing to **~4 distinct feature/prediction profiles** for the 6 used templates (verified in DB).
2. **Zero real FT outcomes:** no provider-financed fixture in the repository carries a real completed score through the AnalyzeMatch path. All 12 real AnalyzeMatch History rows (6 v1 + 6 v2) use synthetic outcomes.
3. **Degenerate predictions on these templates:** 6/6 predicted winners = home (pHome 0.56–0.78), 6/6 predicted goal ranges = `range4Plus` (0.83–0.88), 12/12 confidence = `low`. This explains why P2K-G measured Exact Score **0/6** and Goal Range **0/6** and why Brier/ECE are nearly identical between A and C — the evaluation population cannot discriminate.
4. **A2 qualification is code-gated at ≥ 20 scored records** (`MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE = 20`); n = 6 is below it, so Brier/ECE are directional only (as recorded in P2K-G limitations).
5. **No additional usable real AnalyzeMatch rows exist** outside the current cohort. The 6 `match-example-*` rows are P2K-C eligible but **not** `offlineReplayExecutable` (no parameter provenance) and cannot enter a new cohort as-is; the earlier `p2k.g.validation.real.*` sealed cohort (same `match-example-*` membership) has fail-closed A/C runs (`MISSING_REQUIRED_REPLAY_ARTIFACT`).

**Recommendation:** expand the dataset in a **separate, explicitly authorized execution phase** by (a) adding diverse validation fixture templates (away-favored / weak-home / low-event / high-event / market-conflicting shapes), (b) re-running the real AnalyzeMatch v2 bootstrap on a **new matchId namespace** (`match-p2kg-expansion-v2-*`), (c) passing a coverage acceptance gate (rows, distinct prediction profiles, outcome mix, confidence-band spread, provenance completeness), then (d) P2K-E → P2K-F → P2K-G with **no auto-run** between steps. Target sizes grounded in code and data supply: **minimum viable 20 scored members** (A2 gate), **recommended 30–40**, **ideal 50+ with ≥ 4 confidence bands and ≥ 8–12 distinct prediction profiles**.

---

## 2. Current Validation Dataset Audit

### 2.1 Generation capability (each link verified in code, live `fas_validation`)

| Capability | Status | Evidence |
| --- | --- | --- |
| `FixtureProvider` | Works; **7 templates** only | `packages/provider-fixture/src/fixture-provider.ts` (7 `fixtureMatches`; 6 exposed by `listMatchSummaries`) |
| `MatchResult` (MATCH_RESULT Evidence) | Works only via **attached synthetic outcome**; no provider has a real finished score | `packages/provider-football/src/mapper/to-evidence-match.ts:411` emits `matchResult` only when `fixture.status === "FINISHED"`; all 4 recorded `football:*` bundles are SCHEDULED; FixtureProvider fixtures carry no result |
| `ImportMatch` | Works (real `ImportMatchUseCase` → `EvidenceImportPipeline` + `FixtureEvidenceNormalizer`) | `packages/report/src/validation/bootstrap-projection-v2-validation-history-sidecar.ts:359` |
| `AnalyzeMatch` | Works with `projectionPolicyPin = "v2"` (P2K-G-RECOVERY) or default (v1 bootstrap) | same file:370; `packages/analysis/src/use-case/analyze-match-use-case.ts:143` |
| History persistence | Works — only persists when evaluation is `scored` and `actualResult` present | `packages/report/src/use-case/generate-match-report-use-case.ts:132-184` |
| Projection Replay Sidecar | Works; schema `projection-replay-sidecar.p2k.b` | `buildProjectionReplayContext` (`packages/analysis/src/replay/analysis-projection-replay-port.ts:117`) |
| Projection v2 parameter provenance | Works when `projectionPolicyPin = "v2"` (Sidecar gets `parameterVersionLabel`/`parameterArtifactId`/`parameterArtifactChecksum`) | same file:156-162; registry `packages/analysis/src/projection-v2/projection-parameter-registry.ts` |
| Rule catalog validity | Works — 87/87 distinct ruleIds catalog-valid, PASS score == weight (verified live) | DB query on `match-p2kg-recovery-v2-*` sidecars; `auditRules` in bootstrap file |
| `offlineReplayExecutable` | Works — P2K-C complete ∧ provenance present ∧ registry-recognized ∧ RuleResult-rebuildable | `packages/analysis/src/replay/assess-offline-replay-executability.ts:127-131` |

### 2.2 Live `fas_validation` inventory (queried 2026-08-16; Postgres container `fas-p2k-validation`)

| Table | Count | Notes |
| --- | ---: | --- |
| `evaluation_history_items` | **135** | 123 `match-p2k-*` persistence-fixture rows + 6 `match-example-*` + 6 `match-p2kg-recovery-v2-*` |
| `projection_replay_sidecar_items` | **99** | 72 `match-p2k-*` (fake `v2.active`/`artifact-p2k`/`param-p2k`), 15 `match-p2k-e-pg-*` (fake `artifact-1`/`param-1`), 6 `match-example-*` (no provenance), **6 `match-p2kg-recovery-v2-*` (valid)** |
| `replay_cohort_items` / members | **17 / 33** | 14 persistence-test cohorts (1–2 members), `p2k.e.validation.bootstrap.analyzematch.v1` (6), `p2k.e.validation.recovery.v2.analyzematch.v1` (6), `p2k.g.validation.real.1786544763458` (6) |
| `replay_run_items` | **20** | 14 persistence runs (0 members), 2 v1 fail-closed (0/6), 2 recovery-v2 **6/6 + 6/6**, 2 `p2k.g.recovery.*` fail-closed (0/6) |
| `population_evaluation_items` | **13** | 11 persistence evals, 1 `p2k.g.recovery` (NOT_AVAILABLE population), **1 `eval.p2k.g.validation.recovery.v2.analyzematch.v1`** |
| `matches` / `evidence_items` | **51 / 69** | P.2 persistence layer only (`match-c2-*`, `match-bootstrap-example`) — **not** AnalyzeMatch rows (bootstrap uses in-memory Evidence) |

### 2.3 The 12 real AnalyzeMatch rows (the only real-pipeline rows that exist)

| matchId | template | winner (synthetic) | score | pHome / pDraw / pAway (v1 → v2) | confidence |
| --- | --- | --- | --- | --- | --- |
| match-example-1 / -p2kg-recovery-v2-1 | Liverpool v Chelsea | home | 2-1 | 0.7797/0.1485/0.0718 → 0.7824/0.1106/0.1070 | low |
| match-example-2 / -p2kg-recovery-v2-2 | Arsenal v Coventry | home | 3-0 | 0.7797/0.1485/0.0718 → 0.7824/0.1106/0.1070 | low |
| match-example-3 / -p2kg-recovery-v2-3 | Barcelona v Real Madrid | draw | 1-1 | 0.6627/0.2049/0.1324 → 0.7104/0.1331/0.1565 | low |
| match-example-4 / -p2kg-recovery-v2-4 | Bayern v Dortmund | away | 1-2 | 0.6636/0.2078/0.1286 → 0.7179/0.1317/0.1504 | low |
| match-example-5 / -p2kg-recovery-v2-5 | PSG v Marseille | home | 2-0 | 0.7797/0.1485/0.0718 → 0.7824/0.1106/0.1070 | low |
| match-example-6 / -p2kg-recovery-v2-6 | Inter v Juventus | draw | 0-0 | 0.4948/0.2626/0.2426 → 0.5631/0.1687/0.2682 | low |

- `match-example-*` = v1 bootstrap, **no parameter provenance** → not `offlineReplayExecutable`.
- `match-p2kg-recovery-v2-*` = v2 bootstrap, provenance `projection.v3.replay` / `projectionParams:v3.1:matchScript` / `d7b2f4fd` → `offlineReplayExecutable` (the current SEALED cohort).
- The two sets are **content-identical** (same templates, same synthetic outcomes); the v2 set only differs in matchId namespace and provenance pin.

---

## 3. Real vs Fixture vs Synthetic Data Classification

| Class | Definition | In live DB / repo |
| --- | --- | --- |
| **Real AnalyzeMatch** | Rows produced by the real production composition (`ImportMatch → AnalyzeMatch → Report → History/Sidecar`) with catalog-valid RuleResults | **12** History + Sidecar rows (`match-example-*`, `match-p2kg-recovery-v2-*`) |
| **Real FT outcome** | Actual result sourced from a provider (API-Football FINISHED, or mapped provider scoreline) | **0** — every actual outcome in the 12 rows is hand-assigned (`providerSource = validation-bootstrap`) |
| **Fixture persistence** | Persistence-test rows (P.2 layer + `match-p2k-*`/`match-p2k-e-pg-*` History/Sidecars with `rule-1`/`rule-p2k`, `feature.v2.test`, fake provenance) | 123 History rows, 87 Sidecars, 51 `matches`, 69 `evidence_items` — **never population evidence** |
| **Synthetic** | Hand-authored inputs (outcome assignment, template fixtures) or synthetic calibration cohorts | The 12 rows' outcomes; `r1b.synthetic.script_shapes.v1` calibration cohort; fixture form/stats/H2H/odds templates |
| **Recorded provider data (unused for validation)** | `RecordedFootballCatalog` `football:*` bundles (K League 1 ×3, Veikkausliiga ×1) with club/manager/player/xG/context intelligence | All **SCHEDULED**, no `completedScore` → cannot be scored without attached outcomes |
| **Odds-side recorded data** | The Odds API cassettes: 3 `match-example*`, 3 `upcoming-soccer-epl`, **10 completed `scores-soccer-epl` scorelines** | Scores are scorelines only; no `odds:*` or `football:*` History rows exist |

**Rule (carried from P2K reports, reaffirmed):** persistence-fixture rows and synthetic/shape cohorts are **never** treated as population evidence. Only AnalyzeMatch-generated History + offline-executable Sidecar rows may enter a P2K-E cohort.

---

## 4. Current Data Inventory

### 4.1 Provider / fixture supply (the ceiling for new real AnalyzeMatch rows)

| Source | Count | Finished? | Football evidence depth | Usable for validation now? |
| --- | ---: | --- | --- | --- |
| `FixtureProvider` templates | 7 (`match-example` + 1..6) | No (SCHEDULED) | Form/Stats/H2H/Odds only | Yes, only with attached outcomes (as today) |
| `RecordedFootballCatalog` bundles | 4 (`football:100001-3`, `football:244001`) | No (SCHEDULED) | Full: standings, managers, managerIntelligence, players, absences, lineups, expectedGoals, matchContext | Yes, only with attached outcomes; richer intelligence |
| The Odds API cassettes (match) | 3 | — | 1X2/AH/O-U market signals | Market layer only; not a Football evidence source |
| The Odds API scores cassette | 10 completed | Yes (scorelines) | Scorelines only (no form/stats/H2H football evidence) | Not via the Football AnalyzeMatch path today |
| Live API-Football | code-complete | Needs `API_FOOTBALL_KEY` + network | Full (real FINISHED results possible) | Not exercised in this environment; requires key/approval |

### 4.2 Distinct shapes actually in the validation dataset

| Dimension | Distinct values in current dataset |
| --- | --- |
| Form profiles | 2 (`strongHome+weakAway`, `balanced+balanced`) — plus a 3rd variation (`balancedHome+weakAway`) used by `match-example-4` |
| H2H shapes | 3 (`homeLean`, `balanced`, `awayLean`) |
| Odds shapes | 4 (`homeFavored`, `awayFavoredConflict`, `balanced`, `slightAway`) |
| Prediction profiles (pHome) | **~4** (0.7824 ×3, 0.7104, 0.7179, 0.5631) |
| Confidence bands | **1** (`low`, 12/12) |
| Predicted goal ranges | **1** (`range4Plus`, 6/6, 0.83–0.88) |
| Rule sets | 1 catalog set (87 distinct ids), identical across all 6 v2 rows (63 INAPPLICABLE / 15 PASS / 9 FAIL) |

---

## 5. Coverage Analysis (current n = 6 scored members)

| Dimension | Coverage | Assessment |
| --- | --- | --- |
| Match Result (winner) actual mix | Home **3** (2-1, 3-0, 2-0), Draw **2** (1-1, 0-0), Away **1** (1-2) | Draw/Away underrepresented; Away subgroup n = 1 |
| Match Result predicted mix | Home **6/6** | **Zero predicted Draw/Away** — no discrimination |
| Exact Score | 0/6 hits (A and C) | Degenerate prediction distribution; predicted top scorelines never match |
| Goal Range actual | `range01` ×1, `range23` ×5, `range4Plus` ×0 | No high-scoring actuals |
| Goal Range predicted | `range4Plus` 6/6 (0.83–0.88) | **Degenerate** — always range4Plus; Goal Range accuracy trivially 0 |
| BTTS | 3 yes / 3 no | Balanced by construction |
| O/U 2.5 | 3 over / 3 under | Balanced by construction |
| Confidence buckets | `low` 12/12; medium/high/very_high **0** | **Hard gap** — A2 bucket qualification impossible beyond `low`; confidence–winner correlation is computed on a single-band sample |
| Probability deciles | pHome 0.49–0.78, pDraw 0.11–0.27, pAway 0.07–0.27 | Only ~3 decile buckets touched (50-60/60-70/70-80%) for pHome |
| Team strength gap | 5 templates strong/balanced-home vs weak/balanced-away; **no away-favored football shape** | Strength gap covered on the home side only |
| Manager / Club / Player / Context / xG Intelligence | **Absent (honest absence)** in all 12 rows (FixtureProvider has no such evidence) | The O1 / V1A "Football Intelligence" dimensions cannot be exercised by the validation dataset |
| Match Script shapes | All 6 script shapes (home_control, away_control, counter_attack, open_match, low_event, balanced) exercised under both Baseline A and Candidate C | Script-shape coverage is fine; **discriminative power is not** |

Conclusion: the current dataset is **balanced by construction** (BTTS/O-U are 3/3 by design of the hand-assigned outcomes), but **degenerate in prediction space** (all home, all range4Plus, all low confidence) and **structurally missing** away-favored, high-scoring, and Intelligence-evidence shapes.

---

## 6. Current Bottleneck (evidence, not speculation)

**Primary bottleneck: data supply + prediction diversity, not machinery.**

1. **Only 7 fixture templates exist** (`FixtureProvider`), and only 6 are used; the 6 collapse to ~4 distinct prediction profiles because form/stats/H2H/odds templates are shared (`fixture-provider.ts:131-272`). Adding rows from the same templates adds **repeated observations of the same forecast**, not new evidence.
2. **No real FT outcomes anywhere in the AnalyzeMatch path.** `toEvidenceMatchShape` emits `matchResult` only for FINISHED fixtures (`to-evidence-match.ts:411`); the 4 recorded `football:*` bundles are SCHEDULED; live API-Football is not exercised (requires key + network). Every scored History row therefore depends on the hand-assigned `validation-bootstrap` outcome.
3. **Prediction degeneracy on the current templates** (verified in live rows): predicted winner = home 6/6; predicted goal range = `range4Plus` 6/6 (0.83–0.88); confidence = `low` 12/12 (score < 45, band threshold at `intelligence-confidence.ts:103-121`). This is why P2K-G measured Exact Score 0/6 and Goal Range 0/6 for **both** A and C, and why Brier (0.638058 vs 0.637567) and ECE (0.223079 vs 0.220846) deltas are ~1e-3 — the sample cannot discriminate.
4. **A2 sample gate:** `MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE = 20` (`packages/statistics/src/domain/prediction-calibration-report.ts:13`) — n = 6 is 3.3× below; P2K-G correctly records calibration as NOT QUALIFIED.
5. **No reserve data:** the 6 `match-example-*` rows are P2K-C eligible but not `offlineReplayExecutable` (no provenance) — excluded by the P2K-E recovery-v2 gate by design; re-generating them (v2 pin) would create new rows content-identical to the recovery set, adding zero diversity.

---

## 7. Recommended Cohort Size (grounded in code and data capability)

Distinguish **scored-row count** (what P2K-E/F/G consume) from **independent prediction profiles** (what gives evaluation discriminative power). Rows from the same template repeat the same forecast; they are valid calibration observations but add no winner-discrimination information.

| Size | Scored members | Basis | Requirements it satisfies |
| --- | ---: | --- | --- |
| **Minimum viable** | **20** | Hard code gate `MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE = 20` | Flips P2K-G `calibrationQualified` to true (report-level); still descriptive-only |
| **Recommended** | **30–40** | 20 + margin for replay failures / excluded metrics (P2K-G `excludedCount`), and enough to split into outcome subgroups (Home ~12–16 / Draw ~6–12 / Away ~6–12) | Meaningful descriptive subgroup tables; bucket-level starts to populate |
| **Ideal** | **50+** | All 4 confidence bands populated (≥5 each where the model produces them), ≥4–5 populated probability deciles, ≥3 competitions, ≥2 strength shapes per side, ≥8–12 distinct prediction profiles | First point where calibration curves and confidence-bucket accuracy are meaningful |

**Capacity check (evidence-based):** distinct prediction profiles ≤ distinct fixture templates. With the current 7 templates (~4 profiles), even 20 scored rows would be ~5 repeated forecasts — A2 flag would flip but discrimination would not improve. Therefore the size targets are **conditional on template expansion**: ≥8–12 distinct templates (each with 2–3 outcome assignments) are required to reach the recommended/ideal targets with genuine diversity. This is the honest, code/data-grounded estimate — no arbitrary inflation.

---

## 8. Expansion Strategy (design only — executed later under separate authorization)

### 8.1 Data sources for new templates (ranked by realism)

1. **Live API-Football FINISHED fixtures** (real results, real evidence) — the only path to genuinely real outcomes; requires `API_FOOTBALL_KEY`, network, and a new approved milestone. Highest value, highest friction.
2. **RecordedFootballCatalog bundles (`football:*`)** — real recorded pre-match evidence (club/manager/player/xG/context/standings), SCHEDULED; outcomes must be attached. Richer than FixtureProvider but requires a provider-adapter/bootstrap change and outcome attachment.
3. **New FixtureProvider-style templates** — deterministic, reviewable, follows the existing pattern; outcomes attached as today. Lowest friction; still synthetic outcomes.

### 8.2 Template diversity targets (new shapes, each with 2–3 outcome assignments)

- **Away-favored football** (weak home vs strong away form/stats/H2H) — currently missing.
- **Low-event shapes** (defensive both sides, low λ) — to move predicted goal range off `range4Plus`.
- **High-event shapes** (open, high λ) — to exercise `range4Plus` with actuals that can hit.
- **Market-conflicting vs market-aligned** odds pairs on the same football evidence — to exercise the market-conflict penalty and confidence spread.
- **Near-balanced shapes** with draw-leaning H2H — to move predicted winners off home-only.
- Optionally **intelligence-enriched** templates (via recorded bundles) so the Club/Manager/Player/Context/xG dimensions enter the validation population (O1/V1A contribution coverage).

### 8.3 Generation rules (hard requirements from the user + repo governance)

- New rows must be produced by **real AnalyzeMatch** with `projectionPolicyPin = "v2"` (reuse `bootstrapProjectionV2ValidationHistorySidecar` pattern with a new matchId namespace).
- Every Sidecar must carry `parameterVersionLabel` / `parameterArtifactId` / `parameterArtifactChecksum` from the **real registry** (`projection.v3.replay` / `projectionParams:v3.1:matchScript` / `d7b2f4fd`) — **never fabricated**.
- All RuleResults must be **catalog-valid** (`createRuleResult`), PASS score == weight.
- Must be `offlineReplayExecutable` (P2K-C complete ∧ provenance complete/registry-recognized ∧ RuleResult-rebuildable).
- **Never** treat persistence-fixture rows or synthetic cohorts as population evidence.
- **Never** mutate the current SEALED cohort, the old v1 cohort, or any existing History/Sidecar.
- Outcome attachment remains `MATCH_RESULT` Evidence only (never RuleResult/parameter fabrication).

### 8.4 Coverage acceptance gate (before any seal)

After bootstrap, require all of: ≥ 20 scored rows (min viable), ≥ 8 distinct prediction profiles, outcome mix within [Home 40–60% / Draw 20–35% / Away 15–40%], ≥ 2 confidence bands populated (target ≥ 3), predicted winners span ≥ 2 outcomes, goal-range predictions span ≥ 2 buckets, 100% catalog-valid, 100% provenance complete, 100% `offlineReplayExecutable`. If the gate fails, iterate templates (data work) — do not seal a degenerate cohort.

---

## 9. New Cohort Naming Strategy

Follow the established `p2k.e.validation.<slice>.analyzematch.v<N>` pattern (P2K-E recovery-v2 precedent):

| Artifact | Proposed id |
| --- | --- |
| matchId namespace | `match-p2kg-expansion-v2-1 … N` (prefix `match-p2kg-expansion-v2-`) |
| SEALED cohort | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| Baseline A replay run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` |
| Candidate C replay run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` |
| Population evaluation | `eval.p2k.g.validation.expansion.v2.analyzematch.v1` |

Namespaces keep the new data disjoint from `match-example-*` and `match-p2kg-recovery-v2-*`, so namespace-scoped seal selection (`createAndSealOfflineExecutableReplayCohort` with `matchIdPrefix`) cannot cross-contaminate. Old cohorts remain SEALED and untouched.

---

## 10. P2K-C / offlineReplayExecutable Gates (reused, unchanged)

New cohort selection must reuse, **without modification**:

1. `assessProjectionReplayEligibility` (P2K-C; `packages/statistics/src/replay/assess-projection-replay-eligibility.ts`) → `replayEligible === true`.
2. Sidecar schema pin (`PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION`).
3. `assessOfflineReplayExecutability` (`packages/analysis/src/replay/assess-offline-replay-executability.ts`) → `offlineReplayExecutable === true` (parameter provenance present ∧ registry-recognized ∧ RuleResult-rebuildable).
4. `createAndSealOfflineExecutableReplayCohort` (`packages/analysis/src/replay/create-and-seal-offline-executable-replay-cohort.ts`) with the new `matchIdPrefix`.

No P2K-C contract change; no provenance folded into `replayComplete`; fail-closed exclusions recorded (OUT_OF_NAMESPACE / MISSING_SIDECAR / NOT_P2K_C_REPLAY_ELIGIBLE / SIDECAR_SCHEMA_MISMATCH / NOT_OFFLINE_REPLAY_EXECUTABLE).

---

## 11. P2K-E / F / G Re-run Plan (each step a separate authorized execution, no auto-run)

```text
[P2K-G2-A] bootstrap new namespace (match-p2kg-expansion-v2-*) via real AnalyzeMatch v2
    → coverage acceptance gate (8.4)   [STOP — no seal]
[P2K-E]  createAndSealOfflineExecutableReplayCohort (new prefix)
    → SEALED cohort p2k.e.validation.expansion.v2.analyzematch.v1   [STOP]
[P2K-F]  executeSealedCohortOfflineReplayPair → run.…v1.a / run.…v1.c
    → A 6/6-style paired success + sameHistoricalContext   [STOP — no metrics]
[P2K-G]  computeSealedCohortPopulationEvaluation → eval.…v1
    → descriptive metrics only; no significance; no promotion decision
```

Reused scripts pattern: `p2k-e-validation-seal-recovery-v2-cohort.mjs` → `p2k-f-validation-recovery-v2-offline-replay-run.mjs` → `p2k-g-validation-recovery-v2-population-evaluation.mjs` (new slice-named copies for `expansion`). Governance invariants are re-checked at each step (Baseline A unchanged, C `productionPromoted=false`, old cohorts untouched).

---

## 12. A2 Qualification Prerequisites

| Item | Finding | Status |
| --- | --- | --- |
| Report-level threshold | `MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE = 20` (code constant, `packages/statistics/src/domain/prediction-calibration-report.ts:13`); report `qualified = sampleSize >= 20` | **KNOWN (code)** |
| Bucket-level threshold | `MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE = 5` (same file:16); buckets/rows below 5 flagged unqualified | **KNOWN (code)** |
| P2K-G calibration flag | `calibrationQualified = calibrationA.qualified && calibrationC.qualified` (`compute-sealed-cohort-population-evaluation.ts:833`) — requires ≥ 20 scored rows in each A/C replay prediction set (identical sample here) | **KNOWN (code)** |
| Doc 40 A2 semantics | "Governance rules for what may become 'qualified'" listed as an input; acceptance criteria are qualitative ("No automatic promotion from candidate → qualified without review step", doc 40 §A2). **No numeric threshold is stated in any doc.** | **UNKNOWN (docs) — numeric threshold exists only as a code constant** |
| Product-governed threshold beyond the code constant (e.g. required Brier/ECE bound, per-band requirements for a "calibrated" claim) | Not defined anywhere in docs or code | **UNKNOWN** |

**Consequences for the expansion:** reaching n ≥ 20 flips the P2K-G report-level flag, but (a) "qualified" is a **sample-size gate, not a quality gate** — a degenerate 20-row set would still qualify the report while being uninformative; (b) bucket-level qualification additionally requires ≥ 5 observations per band — with the current single `low` band this is impossible for medium/high/very_high, so the confidence-bucket dimension will remain unqualified regardless of n until predictions diversify; (c) `statisticalSignificanceSupported = false` is structural — no inferential claims are supported by the current infrastructure.

---

## 13. Governance / Non-goals

| Invariant | Status |
| --- | --- |
| Architecture Freeze v0.3 | **unchanged** |
| Production Match Script (`GOVERNED_MATCH_SCRIPT_PARAMETER_SET`) = Baseline A | **unchanged** |
| Candidate C `productionPromoted` | **false** (NON-DEFAULT) |
| P2K-H | **NOT AUTHORIZED** |
| Current SEALED cohort `p2k.e.validation.recovery.v2.analyzematch.v1` | **untouched** (membership/digest `3b707860…`) |
| Old v1 cohort `p2k.e.validation.bootstrap.analyzematch.v1` | **untouched** (digest `abdd11ec…`) |
| Prior fail-closed runs / `p2k.g.validation.real.*` cohort | **untouched** |
| P2K-C / P2K-D / Projection / Poisson / Match Script algorithms | **not changed** |
| Persistence fixtures as population evidence | **prohibited** (unchanged) |
| Fabricated RuleResult / parameter provenance | **prohibited** (unchanged) |
| This phase | **planning/audit only — no code, no DB mutation, no cohort, no E/F/G/H** |

---

## 14. Exact Next Execution Step (authorized separately, not executed here)

**P2K-G2-A — Validation Dataset Expansion Bootstrap (new namespace):**

1. Add diverse validation fixture templates + outcome map (per §8.1–8.2; new matchId namespace `match-p2kg-expansion-v2-*`, v2 pin).
2. Re-run the real AnalyzeMatch v2 bootstrap (`bootstrapProjectionV2ValidationHistorySidecar` pattern) against `fas_validation`; verify catalog validity, provenance completeness, `offlineReplayExecutable`.
3. Run the coverage acceptance gate (§8.4); record the inventory.
4. **STOP** — report rows/profiles/coverage; do **not** seal a cohort; do **not** run P2K-E/F/G/H.

Only after a human review of the P2K-G2-A report should the P2K-E → P2K-F → P2K-G sequence (§11) be authorized step by step. No step auto-triggers the next.
