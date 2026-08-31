# Historical Match Evaluation / Case — Capability Audit & Planning

## 0. Status and governance

- Status: **AUDIT COMPLETE / PLANNING ONLY**
- Date: 2026-08-31
- Delivery type: read-only capability audit plus bounded next-step planning
- Roadmap reference: `docs/40_PRODUCT_ROADMAP.md` — existing A1 Prediction
  Evaluation, A2 Calibration and future C1 Case Engine sections
- Roadmap authority: unchanged; this audit does not open a new roadmap Sprint
- Architecture Freeze: v0.3, unchanged
- Canonical analysis protocol:
  `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`, unchanged
- Implementation decision: **Option B**

No production code, schema, Provider, Evaluation History, Case Engine,
Calibration, Projection, Match Script or Unified Matrix change is part of this
audit.

## 1. Executive Summary

The repository already has a substantial FT-only evaluation and replay
foundation:

```text
MATCH_RESULT Evidence
  + current AnalysisResult mapped to SealedPredictionInput
  → PredictionEvaluationRecord
  → scored EvaluationHistoryRecord
  → optional Projection Replay Sidecar
  → Calibration / Validation / Contribution / Replay / Diagnostics
```

Implemented capabilities include:

- canonical immutable `ActualMatchResult` for a FINISHED FT score;
- deterministic prediction-versus-actual scoring;
- append-only Evaluation History in memory or PostgreSQL;
- read APIs for History, Calibration, Validation, Projection Replay and
  Projection Diagnostics;
- durable replay sidecars, sealed cohorts, replay runs and population
  evaluation repositories;
- 1X2, top-scoreline, goal-total, goal-range and confidence evaluation;
- replay-level BTTS and O/U evaluation;
- replay-generated Match Script and Football State aggregate diagnostics.

The current infrastructure is not sufficient, without a bounded extension, to
safely ingest arbitrary historical analyses as authentic PRE_MATCH records:

1. `SealedPredictionInput` and `EvaluationHistoryRecord` do not contain an
   explicit analysis cutoff or enforce `prediction generatedAt < kickoff`.
2. No dedicated historical intake operation accepts an already-existing sealed
   PRE_MATCH artifact and rejects retrospective regeneration.
3. Evaluation History stores a compact prediction snapshot, not the complete
   original Football State, Match Script, Unified Matrix, both confidence
   contracts, recommendation or full report provenance.
4. `ActualMatchResult` is FT-only. HT, event timeline, cards, substitutions,
   goalscorers and actual-match-script observations have no canonical result
   representation.
5. Case Engine behavior, storage and APIs are documented, but no
   `@fas/case-engine` package, Prisma case models, runtime controller or tests
   exist.

Verdict: **Option B — existing Evaluation/Replay infrastructure is mostly
sufficient for FT-only historical scoring, but one small bounded historical
evaluation intake-integrity extension is required before repository-backed
historical predictions can be ingested safely.**

The minimum next boundary is not Case Engine activation and not an event schema.
It is a fail-closed intake path that consumes a genuine pre-existing PRE_MATCH
seal, verifies time/identity/checksum/provenance, pairs it with a verified FT
result, and reuses existing Evaluation History and replay-sidecar contracts.
This audit does not implement that path.

## 2. Current Evaluation Architecture

### 2.1 Actual as-built lifecycle

The implemented report-time flow is:

```text
Football Provider finished fixture
  → FootballCompletedScore (FT only)
  → matchResult normalize input
  → MATCH_RESULT Evidence
  → ActualMatchResult

AnalysisResult
  → buildSealedPredictionInput
  + ActualMatchResult
  → EvaluatePredictionUseCase / evaluatePrediction
  → AnalysisReport.actualResult + AnalysisReport.evaluation
  → buildEvaluationHistoryRecord (scored only)
  → EvaluationHistoryRepository.save
  → optional ProjectionReplaySidecarRepository.save
```

Population consumers then read Evaluation History:

```text
Evaluation History
  ├→ Prediction Calibration
  ├→ Football Intelligence Validation
  ├→ Football Intelligence Contribution
  ├→ Projection Replay
  └→ Projection Diagnostics
```

P2K adds a separate offline branch:

```text
Evaluation History + replay-complete Sidecar
  → sealed Replay Cohort
  → explicit offline Replay Run(s)
  → paired Population Evaluation
```

There is no implemented transition from Evaluation History or Replay into Case
Engine.

### 2.2 Transition evidence

| Transition | Implementation | Domain objects | Persistence | Tests |
|---|---|---|---|---|
| Provider FT score → `MATCH_RESULT` | `packages/provider-football/src/mapper/to-evidence-match.ts`; `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` | `FootballCompletedScore`, `Evidence` | Generic Evidence repository when configured | `packages/provider-football/test/match-result-mapper.spec.ts`; `packages/evidence-normalizer/test/match-result-evidence.spec.ts` |
| `MATCH_RESULT` → Actual | `packages/statistics/src/evaluation/map-actual-match-result.ts` | `ActualMatchResult` | Embedded in History JSON; may also exist as generic Evidence | `packages/statistics/test/evaluation.spec.ts` |
| Analysis → compact prediction seal | `packages/analysis/src/evaluation/build-sealed-prediction-input.ts` | `AnalysisResult`, `SealedPredictionInput` | Later embedded in History | analysis/report tests |
| Prediction + Actual → Evaluation | `packages/analysis/src/use-case/evaluate-prediction-use-case.ts`; `packages/statistics/src/evaluation/evaluate-prediction.ts` | `PredictionEvaluationRecord` | Embedded in History JSON | `packages/analysis/test/evaluate-prediction-use-case.spec.ts`; `packages/statistics/test/evaluation.spec.ts` |
| Scored evaluation → History | `packages/report/src/use-case/generate-match-report-use-case.ts`; `packages/statistics/src/evaluation/build-evaluation-history-record.ts` | `EvaluationHistoryRecord` | Memory or `evaluation_history_items` | `packages/statistics/test/evaluation-history.spec.ts`; database tests |
| History → Sidecar | `GenerateMatchReportUseCase.persistAndLoadHistory`; `buildProjectionReplayContext` | `ProjectionReplaySidecarRecord` | Memory or `projection_replay_sidecar_items` | statistics/report/database P2K tests |
| History → Calibration | `computePredictionCalibrationReport` | `PredictionCalibrationReport` | Computed, not persisted | `prediction-calibration-report.spec.ts` |
| History → Validation | `computeValidationReport` | `ValidationReport` | Computed, not persisted | `validation-report.spec.ts` |
| History + Sidecar → Replay | `ReplayRunner`, `AnalysisProjectionReplayPort`, `runProjectionReplayReport` | `ProjectionReplayReport` | Report computed; P2K run artifacts separately persist | projection replay tests |
| Replay → Diagnostics | `computeProjectionDiagnosticsReport` | `ProjectionDiagnosticsReport` | Computed, not persisted | `projection-diagnostics-report.spec.ts` |
| History/Replay → Case | None found | None implemented | None | None |

### 2.3 Temporal-integrity limitation

`GenerateMatchReportUseCase` builds and saves History when the generated report
contains a scored Evaluation. The prediction snapshot is built from the current
`AnalysisResult`; it is not loaded from a durable original AnalysisReport
repository.

The following fields are absent from both `SealedPredictionInput` and the
Evaluation History validation gate:

- explicit `analysisTime`;
- PRE_MATCH `analysisCutoff`;
- a rule requiring `generatedAt < matchDate/kickoff`;
- original analysis/report id and revision;
- full sealed-report checksum.

The replay sidecar has `generatedAt`, Evidence references and parameter
artifact fields, but sidecar eligibility does not establish that the original
analysis was generated before kickoff. Consequently, a historical intake
procedure must not call today's analysis runtime and label the result as the
old prediction.

## 3. Capability Matrix

Status vocabulary:

- **IMPLEMENTED** — executable implementation and tests exist.
- **PARTIAL** — useful implementation exists but does not satisfy the complete
  historical requirement.
- **DOCUMENTED ONLY** — canonical/roadmap design exists without runtime.
- **NOT FOUND** — no matching repository capability was found.
- **BLOCKED** — the data cannot safely enter the downstream lifecycle because a
  required authentic upstream artifact is absent.

| Capability | Documentation | Runtime implementation | Persistence | API | Tests | Status | Reusable for historical matches? |
|---|---|---|---|---|---|---|---|
| `EvaluationHistoryRecord` | A1.5, P2K | Immutable scored record + append-only repository | Memory; PostgreSQL `evaluation_history_items` | `GET /api/evaluation-history`; by-match GET | Unit + Prisma | IMPLEMENTED | Yes, only with genuine sealed prediction + scored actual |
| Actual Result | A1; ADR-004 target | `ActualMatchResult`, `MATCH_RESULT` mapper | Generic Evidence and History JSON; four code fixtures | Evidence read only; no dedicated result command | Unit/normalizer/provider | PARTIAL | FT-only yes; no standalone versioned result aggregate |
| Prediction snapshot | A1/A1.5 | `buildSealedPredictionInput` | Embedded in History JSON | Returned through History/report | Unit/report | PARTIAL | Core probabilities/scorelines/rules/features yes; full original analysis no |
| Prediction Evaluation | A1 | `evaluatePrediction` / `EvaluatePredictionUseCase` | Embedded in History | Report overlay; no dedicated write endpoint | Unit/integration | IMPLEMENTED | Yes for FT-scored, completed predictions |
| 1X2 evaluation | A1/P2K | argmax versus actual winner | Evaluation metrics/Population Evaluation JSON | History/replay/diagnostics surfaces | Unit/population | IMPLEMENTED | Yes |
| Exact/top scoreline evaluation | A1/P2K | top scoreline and scenario hits | Evaluation metrics | History/replay surfaces | Unit/population | IMPLEMENTED | Yes |
| Goal-total evaluation | A1 | most-likely scenario total vs FT total | Evaluation metrics | History | Unit | IMPLEMENTED | Yes, exact total only |
| Goal-range evaluation | A1/P2K | modal range vs actual FT bucket | Evaluation metrics | History/replay | Unit/population | IMPLEMENTED | Yes |
| BTTS evaluation | P2H/P2K | derived from most-likely score versus FT | Replay/population evaluation artifacts | Replay/diagnostics read APIs | Replay/population tests | PARTIAL | Yes in replay path; not an A1 `EvaluationMetrics` field |
| O/U 2.5 evaluation | P2H/P2K | predicted from goal-range mass ≥ 0.5 versus FT total ≥ 3 | Replay/population evaluation artifacts | Replay/diagnostics read APIs | Replay/population tests | PARTIAL | Yes in replay path; threshold is reconstructed, not an original explicit market seal |
| Confidence evaluation | A1/A2/P2I | high-confidence correctness, buckets, ECE, Brier, diagnostics | History confidence snapshot; reports computed | Calibration/validation/diagnostics GET | Unit/API/report | IMPLEMENTED | Yes for the single stored prediction-confidence contract |
| Error classification | P2I | miss categories and observational diagnostics | Computed report only | `GET /api/projection-diagnostics` | Unit/API | PARTIAL | Outcome miss classes yes; no causal/exogenous-event attribution |
| Projection Replay Sidecar | P2K-B/C | compact sealed Features/Rules/Evidence refs/artifact provenance | Memory; PostgreSQL sidecar table | No direct sidecar API; used by replay endpoint | Unit + Prisma | IMPLEMENTED | Yes when sidecar-complete |
| Replay cohorts/runs/population evaluation | P2K-E/F/G | sealed membership, explicit offline runs, paired metrics | PostgreSQL models + memory repositories | No cohort/run command API found | Unit + Prisma + scripts | IMPLEMENTED | Yes for governed offline populations |
| Projection Replay report | P2H | V1/V2 replay plus aggregate contributions | Computed overlay | `GET /api/projection-replay` | Unit/API/report | IMPLEMENTED | Yes |
| Validation | V1A | observational Feature-profile partition metrics | Computed, not materialized | `GET /api/validation` | Unit/API/report/UI | IMPLEMENTED | Yes; descriptive only |
| Calibration measurement | A2 | calibration/ECE/Brier over History | Computed, not materialized | `GET /api/calibration` | Unit/API/report/UI | IMPLEMENTED | Yes; never auto-adjusts predictions |
| Original Football State snapshot | PVS/P2H docs | Present transiently on `AnalysisResult`; replay can regenerate metadata | Not in History or current Sidecar | Report only at analysis time | Projection/report/replay tests | PARTIAL | Not guaranteed for an original historical seal |
| Original predicted Match Script snapshot | PVS/R1/P2H docs | Active scripts exist transiently; replay generates script metadata | Not in History/current Sidecar | Report only; aggregate replay output | Projection/replay tests | PARTIAL | Cannot prove exact original active scripts from History alone |
| Actual Match Script | Replay completion report annotations only | No canonical domain object/intake | None | None | None | NOT FOUND | No |
| Script-shape mismatch | None as a contract | Aggregate predicted-script accuracy only | Computed aggregate only | Diagnostics/replay aggregates | Replay tests | NOT FOUND | No predicted-versus-actual script comparison |
| Unified Matrix snapshot | V2 docs | Used by Projection V2 at runtime | Full matrix not in History or Sidecar | Current report output only | Projection tests | PARTIAL | Marginal outputs retained; original complete matrix not retained |
| Case Engine | `docs/08_CASE_ENGINE.md`; doc 40 C1; target DB/API docs | No package/runtime implementation found | No Prisma case models | No Case controller/routes | None | DOCUMENTED ONLY | No operational Case creation or retrieval |
| Historical match ingestion | Completion reports/bootstrap scripts | Automatic report-time persistence and test/bootstrap utilities | Existing History/Sidecar stores | No dedicated safe historical intake API | Bootstrap tests | PARTIAL | Not safe for arbitrary historical analyses without authentic seal gate |
| HT/FT split | Replay report prose only | FT domain only | None beyond prose | None | None | NOT FOUND | No |
| Match event/result timeline | Provider pre-match/stat enrichments exist, but no actual-event result model | No canonical post-match event mapper/store | None in Actual/History | None | None | NOT FOUND | No |
| Provenance/source tracking | A1/A1.5/P2K | Actual provider ids/method/time; model versions/checksums; sidecar Evidence refs/artifact ids | History/Sidecar JSON | History/replay/report | Unit/Prisma | PARTIAL | Strong core lineage, but no cutoff/full report/source-record manifest |

## 4. Actual Result Representation

### 4.1 Implemented fields

`packages/statistics/src/domain/actual-match-result.ts` supports:

- `matchId`;
- `homeGoals`;
- `awayGoals`;
- derived/validated `winner`;
- validated `totalGoals`;
- optional competition id/name;
- status fixed to `FINISHED`;
- provider id;
- provider source id;
- provider method;
- observation time.

The object validates non-negative integer scores, winner/score consistency,
total-goal consistency and ISO time. It is immutable.

### 4.2 Provider and Evidence path

`FootballCompletedScore` contains only home and away FT goals. A finished
provider fixture maps this to optional `matchResult`, and the normalizer creates
`MATCH_RESULT` Evidence. Honest absence is used when the score is unavailable
or the fixture is unfinished.

The generic Evidence schema can persist a `MATCH_RESULT` payload when
PostgreSQL Evidence mode is active. Evaluation History also embeds the mapped
Actual result in `recordJson`.

### 4.3 ADR-004 gap

Accepted ADR-004 requires a stable `MatchResult` root and append-only immutable
`MatchResultVersion` records. The current Prisma schema has no
`MatchResult`/`MatchResultVersion` models. The as-built A1 representation is
therefore narrower than the accepted target:

- corrections are not represented as a standalone version lineage;
- there is no dedicated result command/API;
- exact result-version foreign keys are not present on History/Replay;
- provider outcome provenance is embedded rather than linked to a governed
  result version.

This is an implementation gap, not permission for this audit to add a schema.

### 4.4 Unsupported actual dimensions

The canonical Actual object cannot store:

- half-time score;
- second-half score;
- red/yellow cards;
- substitutions;
- goalscorers or goal times;
- confirmed post-match lineup snapshot;
- injuries/suspensions as an outcome;
- post-match xG;
- shots/shots on target;
- possession;
- actual Match Script;
- exogenous-event classification.

Some lineup/statistics/card-related facts may exist as other Evidence kinds for
supported provider bundles. They are not fields on `ActualMatchResult`, are not
an actual-event timeline, and are not linked as the measured outcome context in
Evaluation History.

## 5. Prediction Snapshot Representation

### 5.1 Preserved today

`SealedPredictionInput` preserves:

- match id;
- projection checksum and status;
- 1X2 probabilities;
- top scorelines;
- goal-range distribution;
- prediction confidence and band;
- three scenario scorelines/probabilities;
- compact Rule name/status/channel snapshots;
- Feature names;
- projection, Feature and Rule model versions.

`EvaluationHistoryRecord` adds:

- home/away teams;
- competition and season;
- match date;
- the complete compact prediction snapshot;
- actual result and scored evaluation;
- confidence snapshot;
- model-version lineage;
- recorded time and checksum.

The Projection Replay Sidecar adds:

- Feature names and values;
- Feature bundle status/checksum/model version;
- Rule ids, names, status, channel, weight and score;
- Evidence references;
- required Evidence count;
- generated time;
- optional parameter artifact id/version/checksum.

### 5.2 Not preserved as the original seal

Neither History nor the current sidecar guarantees storage of:

- original analysis id/report id/revision;
- explicit PRE_MATCH cutoff;
- explicit production policy pin;
- full original Evidence manifest with source timestamps;
- original Football State dimensions/checksum;
- original active Match Script set/checksum;
- original full Unified Probability Matrix/checksum;
- explicit BTTS and O/U output values/bases;
- report intelligence-confidence contract;
- recommendation;
- original narrative/report sections;
- complete AnalysisReport checksum.

Replay can regenerate Football State and Match Script metadata from sealed
Feature/Rule context under a pinned artifact. Regeneration is not proof that
the regenerated metadata equals an original snapshot that was never stored.

## 6. Prediction vs Actual Evaluation

### 6.1 A1 metrics

`evaluatePrediction` is pure and requires matching `matchId`. Completed,
non-empty projections are scored for:

- winner hit;
- top score hit;
- most-likely goal-total hit;
- modal goal-range hit;
- scenario score/winner hits;
- high-confidence correctness;
- Rule coverage/agreement;
- Feature coverage;
- flat paper unit return.

Blocked or failed projections are returned as `excluded` with a reason.
`EvaluationHistoryRecord` accepts only `scored` evaluations, so excluded rows
do not enter History, Calibration or Validation.

### 6.2 Replay-only additions

`computeProjectionReplayMetrics` adds:

- draw hit;
- BTTS hit;
- O/U 2.5 hit;
- numeric winner hit for correlation.

BTTS is inferred from the most-likely scenario scoreline. O/U is inferred from
`range23 + range4Plus >= 0.5`. These are deterministic replay definitions, but
they do not prove that an original report explicitly sealed the same BTTS/O/U
presentation values.

### 6.3 Error classification

P2I diagnostics classify:

- `winner_miss`;
- `draw_miss`;
- `score_miss`;
- `goal_range_miss`;
- `btts_miss`;
- `over_under_miss`.

They also aggregate script, Football State, Rule and confidence diagnostics.
These are observational error categories. There is no canonical classification
for:

- red-card-driven state transition;
- penalty/event shock;
- lineup-information timing error;
- Provider/freshness error;
- actual Match Script mismatch;
- causal or counterfactual attribution.

## 7. Case / Replay / Validation Linkage

### 7.1 Replay

Replay is operational, with important boundaries:

- History is readable without a sidecar but is not V2 replay-complete.
- Replay completeness requires a supported, hash-valid sidecar with matching
  identity and non-empty Features/Rules.
- Missing historical sidecars are not auto-backfilled.
- Re-running current Providers to fabricate a historical sidecar is explicitly
  forbidden.
- P2K-D replays the same sealed context under explicit offline Match Script
  parameter labels.
- P2K-E/F/G persist sealed cohort membership, replay runs and paired population
  evaluations.
- actual outcomes are used at evaluation time, never for cohort selection.

### 7.2 Validation and Calibration

Calibration and Validation consume immutable History read-only:

- A2 computes confidence buckets, reliability, ECE, Brier, outcome and
  goal-range calibration with qualification thresholds.
- V1A partitions already-sealed History by observed Feature family and reuses
  Evaluation/Calibration metrics.
- Neither regenerates predictions or writes back to History.

### 7.3 Case Engine

The Case Engine is not implemented.

Repository evidence:

- `docs/08_CASE_ENGINE.md` specifies immutable reviewed Case versions,
  eligibility and retrieval.
- `docs/12_DATABASE.md` documents target case tables.
- `docs/13_API.md` documents target Case endpoints.
- doc 40 C1 lists Case Engine as future work.
- no `@fas/case-engine` package exists;
- no Case Prisma models exist;
- no Case controller exists;
- no Case implementation tests exist.

Therefore the actual lifecycle stops before Case:

```text
Prediction → Actual → Evaluation → Evaluation History
  → Calibration / Validation / Replay / Diagnostics

Evaluation History → Case
  NOT IMPLEMENTED
```

An `EvaluationHistoryRecord` is not a Case. A replay cohort member is not a
Case. A document heading labelled “Case” is not a Case Engine record.

## 8. Half-Time / Match Script Capability

### 8.1 Celta vs Osasuna shape

The desired record:

```text
genuine PRE_MATCH seal
  → predicted Match Script
  → HT 1-0
  → second half 0-2
  → FT 1-2
  → actual script / mismatch classification
```

cannot be represented end to end today.

### 8.2 Supported pieces

- FT 1-2 can be represented by `ActualMatchResult`.
- Actual away winner, total goals, goal range, BTTS and O/U can be derived from
  FT.
- A genuine compact pre-match prediction can be stored in History.
- Replay can generate predicted Match Script metadata from sidecar Features and
  Rules.
- aggregate script activation/accuracy diagnostics can be computed over replay
  outcomes.

### 8.3 Unsupported pieces

- HT 1-0 is not in `ActualMatchResult`.
- second-half 0-2 is not stored.
- red-card timing/state transition has no canonical result/event record.
- the exact original predicted Match Script is not preserved in History or the
  current sidecar.
- no canonical actual Match Script exists.
- no `predicted_script vs actual_script` metric or script-shape mismatch type
  exists.

The existing completion report preserves Celta's event progression as prose
only. It must not be promoted to a runtime Case, Evaluation field or Match
Script result without a separately governed extension.

## 9. Historical Sample Audit

The search used repository text, implementation fixtures, History/bootstrap
assets and completion reports. Similar team-name occurrences were not treated
as the requested fixture unless the pair and result matched.

| # | Requested sample | Repository-backed result | Stored PRE_MATCH prediction | Evaluation History | Case | Replay/evaluation linkage | Audit result |
|---|---|---|---|---|---|---|---|
| 1 | Anderlecht vs Almaty, 3-0 | Yes: immutable outcome-only `ActualMatchResult` fixture for Anderlecht vs Kairat Almaty | No | No | No | No | **Outcome only / BLOCKED downstream** |
| 2 | Celta vs Osasuna, 1-2; HT 1-0 | Yes: immutable FT-only outcome fixture; HT/event detail in completion report only | No | No | No | No | **Outcome only / HT unsupported** |
| 3 | Barcelona, 2-0; opponent unspecified | A Barcelona vs Athletic Club 2-0 outcome-only fixture exists, but this audit input does not establish that it is the same match | No verified linkage | No | No | No | **AMBIGUOUS — do not guess opponent** |
| 4 | Omonia vs Sint-Truiden, 4-2 | Yes: immutable outcome-only `ActualMatchResult` fixture | No | No | No | No | **Outcome only / BLOCKED downstream** |
| 5 | Napoli vs Como, 1-2 | No exact repository-backed record found | No | No | No | No | **NOT FOUND** |
| 6 | Deportivo La Coruña vs Valencia, 3-1 | No exact repository-backed record found | No | No | No | No | **NOT FOUND** |
| 7 | Celta vs Athletic Bilbao, 0-2 | No exact repository-backed record found | No | No | No | No | **NOT FOUND** |
| 8 | Manchester United vs Ipswich Town, 5-2 | No exact repository-backed record found | No | No | No | No | **NOT FOUND** |
| 9 | Yokohama F. Marinos vs Kashima Antlers, 3-4 | Qualitative R1A audit row exists; a P2K validation report explicitly found zero Evaluation History rows for the pair | No repository-backed seal found | No | No | No | **DOCUMENTED qualitative example only** |
| 10 | Other prior analyses | Synthetic/demo A1 rows and P2K validation/bootstrap History/Sidecar populations exist under explicit demo/test ids | Fixture-dependent; these are controlled validation assets | Yes for governed bootstrap populations | No | Yes for eligible P2K populations | **Repository-backed validation assets, not reconstructed real-match Cases** |

### 9.1 Four outcome-only records

The implemented dataset is:

`packages/statistics/src/evaluation/confirmed-match-replay-results.ts`

It contains:

- `replay:2026-08-27:anderlecht:kairat-almaty`;
- `replay:2026-08-27:celta-vigo:osasuna`;
- `replay:2026-08-27:barcelona:athletic-club`;
- `replay:2026-08-27:omonia:sint-truiden`.

The source file explicitly prohibits inserting these outcomes into History or a
replay cohort until a genuine sealed PRE_MATCH prediction exists.

### 9.2 Additional repository-backed populations

The repository also contains:

- `EVALUATION_POPULATION_DEMO_V1`: five synthetic/demo prediction-result rows,
  one excluded;
- P2K recovery and expansion validation namespaces with generated controlled
  fixture Evidence, History and Sidecars;
- a sealed Expansion V2 population of 30 rows used for paired replay
  evaluation.

These are legitimate repository-backed test/validation artifacts. They must not
be relabelled as the user's historical real-match analyses unless their exact
fixture identity and authentic pre-match provenance independently match.

## 10. Identified Gaps

### 10.1 Blocking for safe historical ingestion

1. No dedicated intake use case for an existing immutable PRE_MATCH seal.
2. No explicit cutoff/time-integrity check at History creation.
3. No required original report/snapshot identity and checksum.
4. No fail-closed check preventing retrospective analysis from being labelled
   original.
5. No result-version identity implementing ADR-004.

### 10.2 Limits on prediction preservation

1. Compact History omits original Football State.
2. Compact History omits original Match Script.
3. Full Unified Matrix is not retained.
4. Explicit BTTS/O/U outputs and bases are not retained.
5. The second confidence contract and recommendation are not retained.
6. Full Evidence source/timestamp manifest is not retained in History.

### 10.3 Limits on actual match context

1. FT only; no HT/second-half split.
2. No canonical event timeline.
3. No cards, penalties, substitutions or goalscorers.
4. No post-match advanced-stat/xG outcome snapshot linked to Evaluation.
5. No actual Match Script or exogenous-event taxonomy.
6. No script-shape mismatch evaluation.

### 10.4 Case and operational gaps

1. Case Engine remains documented only.
2. No Evaluation-to-Case proposal or link.
3. No Case persistence/API/runtime tests.
4. Replay cohort/run persistence has no production command API.
5. Browser Analysis Library is local UI history, not durable server-side
   AnalysisReport history.

## 11. Recommended Next Step

### Decision: Option B

**Existing infrastructure is mostly sufficient but a small bounded extension
is required.**

Recommended single next boundary:

> Historical Evaluation Intake Integrity — accept and verify an existing sealed
> PRE_MATCH artifact plus a verified FT Actual Result, then reuse the existing
> `evaluatePrediction` → `EvaluationHistoryRecord` → Projection Replay Sidecar
> path.

Minimum acceptance behavior for that future separately authorized task:

1. Input must reference a genuine pre-existing sealed Analysis/Prediction
   artifact; it must never run current Projection to reconstruct history.
2. Verify exact match identity and home/away orientation.
3. Verify analysis generation/cutoff is earlier than kickoff.
4. Verify projection/report checksum, policy pin, parameter artifact and model
   versions from the original seal.
5. Verify Actual result status/provenance and exact match-id equality.
6. Reuse `ActualMatchResult`, `evaluatePrediction`,
   `buildEvaluationHistoryRecord` and existing repositories.
7. Create a replay sidecar only from authentic preserved Feature/Rule context.
8. Fail closed when any required pre-match artifact is absent or ambiguous.
9. Keep outcome-only samples outside History.
10. Do not create Cases, tune models or promote candidates.

Why this is the smallest safe boundary:

- Option A is insufficient because no safe historical intake operation or
  cutoff integrity gate exists.
- Option C is unnecessary because the implemented FT Evaluation/History/Replay
  foundation is reusable and the canonical Case design already exists; the
  immediate gap does not require architecture redesign.
- HT/events/actual-script support is valuable but is not the first safe
  dependency. It should remain a separately reviewed requirement after
  authentic pre-match pairing works.
- Case Engine activation remains roadmap C1 and must not be smuggled into the
  intake task.

This recommendation is planning only. Its roadmap placement, schema impact and
implementation authorization require human review before work starts.

## 12. Explicit Non-Changes

This audit did not:

- modify production code;
- create or modify schemas;
- write or modify Evaluation History;
- write Actual Results;
- create Cases;
- run or modify replay cohorts/runs;
- modify Calibration or Validation;
- modify Projection V2;
- modify Match Script;
- modify Unified Probability Matrix;
- modify Feature/Rule mathematics;
- add or modify Providers;
- add API contracts;
- add Agent skills or conformance tests;
- modify the canonical FIP protocol;
- modify `docs/40_PRODUCT_ROADMAP.md`;
- tune parameters or promote any candidate;
- start PVS-3.4;
- start FIP-2 P1/P2/P3/P4.

## 13. Governance / Architecture Impact

- Architecture impact: **none**.
- Runtime impact: **none**.
- Data impact: **none**.
- Provider/credential impact: **none**.
- Model/calibration impact: **none**.
- Canonical protocol impact: **none**.
- Roadmap impact: **none**.

The audit exposes two pre-existing documentation-versus-implementation gaps:

1. ADR-004's append-only Match Result root/version design is not implemented in
   the current Prisma schema.
2. Case Engine database/API/package contracts are documented targets, while C1
   remains unimplemented.

These findings do not authorize remediation.

FIP-2 P1/P2/P3/P4 remain **NOT AUTHORIZED / NOT STARTED**. PVS-3.4 remains
**NOT STARTED**.

## 14. Acceptance / Audit Result

| # | Acceptance criterion | Result |
|---|---|---|
| 1 | Existing Evaluation History implementation inspected | PASS |
| 2 | Existing Actual Result representation inspected | PASS |
| 3 | Existing Case implementation inspected | PASS — documented only; runtime not found |
| 4 | Existing Replay implementation inspected | PASS |
| 5 | Existing Validation implementation inspected | PASS |
| 6 | Existing Calibration implementation inspected | PASS |
| 7 | Historical match representation assessed | PASS |
| 8 | Half-time result capability assessed | PASS — not supported |
| 9 | Ten sample entries checked without guessing | PASS |
| 10 | Smallest safe next boundary identified | PASS — Option B |
| 11 | No production/runtime/model/provider/calibration changes | PASS |
| 12 | FIP-2 P1/P2/P3/P4 remain unauthorized/unstarted | PASS |
| 13 | PVS-3.4 remains unstarted | PASS |
| 14 | `docs/40_PRODUCT_ROADMAP.md` unchanged | PASS |
| 15 | Final git diff inspected | PASS |

Final audit verdict:

**PASS — capability audit complete. Option B recommended. No implementation
authorized or performed.**

Stop after this report and required project-index/state bookkeeping. Do not
ingest samples or implement the recommendation.
