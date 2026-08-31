# Historical Evaluation Intake — Artifact Admission Review

## 1. Review Status

| Field | Result |
|---|---|
| Review type | Read-only artifact-admission review |
| Date | 2026-08-31 |
| Prior gate | Historical Evaluation Intake Integrity Review = **C. BLOCKED** |
| Review completed | **YES** |
| Production code changed | **NO** |
| Historical reconstruction performed | **NO** |
| Final Admission | **C. ADMISSION BLOCKED** |
| Final Gate | **BLOCKED** |

The repository contains reusable Evaluation, History and Replay code, but code
capability is not artifact provenance. No repository artifact proves that it is
an authentic original prediction created before kickoff. No controlled
repository-backed fixture carries the complete PRE_MATCH seal/time contract,
and no typed `quality: "verified"` MATCH_RESULT Evidence can be paired to such
a seal.

This review does not weaken or supersede
`HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW.md`.

## 2. Repository Search Scope

The review inspected:

- `packages/statistics/src/domain/` and `packages/statistics/src/evaluation/`
  for `SealedPredictionInput`, Actuals, Evaluation and History contracts;
- `packages/statistics/src/replay/` and `packages/analysis/src/replay/` for
  replay contexts, sidecars, cohort creation and replay eligibility;
- `packages/report/src/validation/` for validation bootstrap and expansion
  populations;
- `packages/analysis/test/`, `packages/statistics/test/`,
  `packages/database/test/` and `packages/report/test/` for inline test
  predictions, History and Sidecars;
- `packages/provider-fixture/`, `packages/provider-football/fixtures/` and
  `packages/provider-odds/fixtures/` for recorded fixture inputs;
- `packages/evidence/` and `packages/evidence-normalizer/` for MATCH_RESULT and
  typed Evidence quality;
- `apps/web/src/lib/analysis-history.ts` for browser persistence;
- PVS, P2K, replay-dataset and historical-readiness reports for documented
  artifact identities;
- repository JSON, snapshot, golden, JSONL and NDJSON locations for persisted
  prediction exports.

### 2.1 Search results by artifact form

| Form | Result |
|---|---|
| Committed full `AnalysisReport` instance | **NOT FOUND** |
| Committed full `AnalysisResult` instance | **NOT FOUND** |
| Committed authentic sealed Projection export | **NOT FOUND** |
| Committed History JSON record | **NOT FOUND** |
| Committed Replay Sidecar JSON record | **NOT FOUND** |
| Snapshot/golden prediction artifacts | **NOT FOUND** |
| JSONL/NDJSON prediction exports | **NOT FOUND** |
| Repository source constants containing demo sealed predictions | **FOUND** |
| Runtime/test builders that can generate seals | **FOUND** |
| Documented validation database History/Sidecar identities | **FOUND** |
| Outcome-only real-match Actual records | **FOUND: 4** |
| Typed `quality: "verified"` MATCH_RESULT Evidence | **NOT FOUND** |

The repository has no `__snapshots__` prediction directory and no committed
JSON file containing `projectionChecksum`, `predictionSnapshot`, `historyId`,
or `PRE_MATCH_PREDICTION`.

Git timestamps and filesystem mtimes were not used as admission evidence.

## 3. Candidate Artifact Inventory

Fields marked `MISSING` are absent from the artifact itself. Data mentioned
only in a completion report is identified as document metadata and is not
treated as part of the artifact.

### 3.1 Candidate C1 — A1 demo prediction population

| Field | Repository evidence |
|---|---|
| Path | `packages/statistics/src/evaluation/evaluation-population.ts` |
| Artifact type | Source-code demo population containing `SealedPredictionInput` and direct `ActualMatchResult` pairs |
| matchId | `eval-demo-001` through `eval-demo-005` |
| Home / away | `MISSING` |
| Competition | `Evaluation Demo League`; id `demo` on Actual only |
| Season | `MISSING` |
| Kickoff | `MISSING` |
| generatedAt | `MISSING` |
| analysisTime | `MISSING` |
| analysisCutoff | `MISSING` |
| observedAt | `2026-07-01T15:00:00.000Z` through `2026-07-05T15:00:00.000Z` |
| Schema/version | No artifact schema; Evaluation model is `evaluation.mvp.a1` when evaluated |
| Projection checksum | `proj:eval-demo-001` through `proj:eval-demo-005` |
| Checksum algorithm | The strings above are labels, not computed content digests |
| Checksum scope | `MISSING` |
| Model version | `projection.v2.i2b.market`; `feature.v2.i2b.market`; `rule.mvp.i2b.market` |
| Policy version | `MISSING` |
| Parameter artifact identity | `MISSING` |
| Immutable storage identity | Source constant `EVALUATION_POPULATION_DEMO_V1`; no independent artifact id |
| Evidence identity/source/quality | Not Evidence; direct Actual uses `football:demo`, `recorded-snapshot`; quality `MISSING` |
| Contains prediction | **YES**, demo `SealedPredictionInput` values |
| Proves existence before kickoff | **NO**; kickoff and generation time are absent |
| Proves non-reconstruction | **NO**; declared demo data only |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

The five row outcomes are respectively 1-0, 1-1, 2-0, 2-1 and an unscored
blocked-projection row. The explicit “demo population” declaration prevents
classification as authentic history.

### 3.2 Candidate C2 — inline Evaluation/History test records

| Field | Repository evidence |
|---|---|
| Paths | `packages/statistics/test/evaluation.spec.ts`; `packages/statistics/test/evaluation-history.spec.ts`; `packages/statistics/test/sealed-cohort-population-evaluation-p2k-g.spec.ts` |
| Artifact type | Test builders and inline `SealedPredictionInput`, Actual and History values |
| matchId | Test-specific ids, including `match-1`-style and P2K test namespaces |
| Home / away | Test literals where supplied; otherwise `MISSING` |
| Competition / season | Test literals where supplied; otherwise `MISSING` |
| Kickoff | Test `matchDate` where supplied; no original-seal kickoff field |
| generatedAt | Test literals where supplied; absent from `SealedPredictionInput` |
| analysisTime / cutoff | `MISSING` |
| observedAt | Test literals on direct Actuals |
| Schema/version | `evaluation-history.mvp.a15` when History is built |
| Checksum | Synthetic projection/evaluation/History checksums |
| Checksum algorithm | Evaluation and History use local 32-bit FNV-style functions; arbitrary test projection checksums may be literals |
| Checksum scope | Defined by builders, not a full original artifact |
| Model/policy/parameter | Test-dependent; policy and parameter identity commonly `MISSING` |
| Immutable storage identity | `MISSING`; objects are generated during test execution |
| Evidence id/source/quality | Usually direct Actual, not a verified Evidence artifact |
| Contains prediction | **YES**, generated/inline test prediction |
| Proves existence before kickoff | **NO** |
| Proves non-regeneration | **NO**; regeneration is the test mechanism |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

These are useful unit fixtures but are not a controlled PRE_MATCH seal fixture
under this admission contract.

### 3.3 Candidate C3 — database/replay test records

| Field | Repository evidence |
|---|---|
| Paths | `packages/database/test/prisma-p2k-e-sealed-replay-cohort.spec.ts`; `packages/database/test/prisma-p2k-history-sidecar.spec.ts`; `packages/analysis/test/helpers/seed-sealed-cohort-for-p2k-g.ts`; `packages/analysis/test/offline-*.spec.ts`; `packages/analysis/test/sealed-*.spec.ts` |
| Artifact type | Inline/generator-created History, Sidecars and replay cohorts |
| matchId / fixture | Test-dependent |
| Kickoff / generatedAt | Test literals where present |
| analysisTime / analysisCutoff | `MISSING` |
| Schema/version | History `evaluation-history.mvp.a15`; Sidecar `projection-replay-sidecar.p2k.b`; cohort versions depend on test |
| Checksums | Generated History checksum and Sidecar `contentSha256`; some test literals |
| Checksum algorithms | History 32-bit FNV-style; Sidecar SHA-256 over `JSON.stringify(context)` in Prisma-compatible paths |
| Checksum scope | History selected fields or sidecar context only; not a full original seal |
| Model/policy/parameter | Test-dependent; legacy sidecars may intentionally omit parameter version |
| Immutable storage identity | Test database row or in-memory object recreated by each run |
| Evidence id/source/quality | Test-dependent; no admitted matching verified Actual |
| Contains prediction | History test rows contain a prediction snapshot; sidecars do not contain the final prediction |
| Proves existence before kickoff | **NO** |
| Proves non-reconstruction | **NO**; builders execute in tests |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

### 3.4 Candidate C4 — scheduled FixtureProvider inputs

| Field | Repository evidence |
|---|---|
| Path | `packages/provider-fixture/src/fixture-provider.ts` |
| Artifact type | Recorded/synthetic fixture Evidence inputs, not prediction seals |
| matchId | `match-example`, `match-example-1` through `match-example-6` |
| Home / away | Liverpool/Chelsea; Arsenal/Coventry City; Barcelona/Real Madrid; Bayern Munich/Borussia Dortmund; PSG/Marseille; Inter Milan/Juventus |
| Competition / season | `MISSING` in this fixture shape |
| Kickoff | `2026-08-01T19:30:00Z`, `2026-08-21T19:00:00Z`, `2026-08-01T20:30:00Z`, `2026-08-01T18:30:00Z`, `2026-08-01T21:00:00Z`, `2026-08-01T19:45:00Z` as applicable |
| generatedAt / analysisTime / cutoff | `MISSING` |
| observedAt | Odds default `2026-07-18T12:00:00Z`; not Actual observation |
| Schema/version/checksum | `MISSING` |
| Model/policy/parameter | `MISSING` |
| Immutable storage identity | Source-code fixture catalog only |
| Evidence id/source/quality | Normalized provider fixture inputs; no MATCH_RESULT in base catalog |
| Contains prediction | **NO** |
| Proves existence before kickoff | Not applicable to a prediction |
| Proves non-reconstruction | Not applicable |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

Recorded football and odds JSON under `packages/provider-football/fixtures/`
and `packages/provider-odds/fixtures/` are also inputs, not sealed predictions.

### 3.5 Candidate C5 — P2K validation bootstrap population

| Field | Repository evidence |
|---|---|
| Path | `packages/report/src/validation/bootstrap-validation-history-sidecar.ts` |
| Artifact type | Validation code that executes current Import → Analysis → Report → History/Sidecar |
| matchId | `match-example-1` through `match-example-6` |
| Home / away / kickoff | Inherited from Candidate C4 |
| Competition / season | Not a sealed source field; History derives/persists values at runtime |
| generatedAt | Current `AnalysisResult.generatedAt` at bootstrap runtime; no committed value |
| analysisTime / analysisCutoff | `MISSING` |
| observedAt | Set to fixture kickoff by validation overlay |
| Schema/version | History `evaluation-history.mvp.a15`; Sidecar `projection-replay-sidecar.p2k.b` |
| History ids documented | `eval-history:match-example-1:48efeee9:8bd904bf` through documented ids for `match-example-6` |
| Checksum algorithms/scopes | Projection/History 32-bit checksum contracts; Sidecar SHA-256 over context JSON |
| Model version | Documented feature model `feature.v2.m1b.manager`; other runtime pins depend on bootstrap version |
| Policy version | Current validation runtime policy; not an original historical seal field |
| Parameter artifact identity | Version-dependent; original bootstrap legacy sidecars may lack the required pin |
| Immutable storage identity | Runtime rows in validation PostgreSQL when script runs; no committed record JSON |
| Evidence | FT overlay source/method `validation-bootstrap`; normalized quality is `unverified` |
| Contains prediction | Generated History does; source fixture/code does not contain a preserved original prediction |
| Proves existence before kickoff | **NO** |
| Proves non-reconstruction | **NO**; code explicitly runs current Analysis |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

The validation path is legitimate for model testing but is disqualified as
historical original-seal evidence.

### 3.6 Candidate C6 — P2K recovery V2 population

| Field | Repository evidence |
|---|---|
| Path | `packages/report/src/validation/bootstrap-projection-v2-validation-history-sidecar.ts` |
| Artifact type | Validation-generated History/Sidecar population |
| matchId | `match-p2kg-recovery-v2-1` through `-6` |
| Home / away / kickoff | Mapped from `match-example-*` templates |
| generatedAt | Runtime-generated; committed value `MISSING` |
| analysisTime / cutoff | `MISSING` |
| observedAt | Validation overlay value |
| Schema/version | History a15; Sidecar P2K-B |
| Example History id | `eval-history:match-p2kg-recovery-v2-1:1d7c579c:ffb31e47` |
| Model/policy | Projection policy `v2` |
| Parameter artifact | `projectionParams:v3.1:matchScript`; label `projection.v3.replay`; documented checksum `d7b2f4fd` |
| Immutable storage identity | Runtime validation database row; committed payload `MISSING` |
| Evidence quality | Validation MATCH_RESULT normalizes as `unverified` |
| Contains prediction | Runtime History does; no committed original seal |
| Pre-kickoff/non-reconstruction proof | **NO / NO** |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

### 3.7 Candidate C7 — P2K expansion V2 population

| Field | Repository evidence |
|---|---|
| Path | `packages/report/src/validation/expansion-validation-templates.ts` and related bootstrap |
| Artifact type | Thirty synthetic validation fixture templates and assigned FT outcomes |
| matchId | `match-p2kg-expansion-v2-1` through `-30` |
| Home / away | Template-specific; e.g. `-1` Manchester City / Sheffield United |
| Competition / season | Template/runtime-specific; no original-seal identity |
| Kickoff | Shared template instant `2026-08-16T19:30:00Z` |
| generatedAt | Runtime-generated; committed value `MISSING` |
| analysisTime / cutoff | `MISSING` |
| observedAt | General template Evidence uses `2026-08-16T10:00:00Z`; the synthetic FT overlay sets Actual `observedAt` to kickoff. Neither is typed verified Actual admission evidence |
| Schema/version | Runtime History a15; Sidecar P2K-B |
| Example History id | `eval-history:match-p2kg-expansion-v2-1:e6ca0b7b:38478169` documented after bootstrap |
| Model/policy/parameter | V2 validation runtime; parameter provenance varies by generated sidecar |
| Immutable storage identity | Runtime validation database; cohort digest is membership identity, not prediction identity |
| Evidence quality | Validation outcome overlay, normalized `unverified` |
| Contains prediction | Only generated runtime History, not the committed template |
| Pre-kickoff/non-reconstruction proof | **NO / NO** |
| Classification | **C — Synthetic/demo/validation-generated artifact** |

### 3.8 Candidate C8 — replay sidecar records and cohort identities

| Field | Repository evidence |
|---|---|
| Paths | `packages/statistics/src/replay/projection-replay-sidecar-record.ts`; P2K reports |
| Artifact type | Compact upstream replay context or cohort membership |
| matchId | Runtime/context-specific |
| Home / away / competition / season / kickoff | `MISSING` from sidecar contract |
| generatedAt | Present in sidecar context |
| analysisTime / cutoff | `MISSING` |
| Schema/version | `projection-replay-sidecar.p2k.b`; cohort `replay-cohort.p2k.e` |
| Checksum | `contentSha256` for context; cohort membership digest where applicable |
| Checksum algorithm/scope | SHA-256 over canonical `JSON.stringify(context)`; cohort digest covers membership, not prediction |
| Model/policy | Feature/rule context and optional parameter pin; no final projection payload |
| Immutable storage identity | Optional Prisma sidecar row tied to `historyId`; documented cohort ids |
| Evidence | `evidenceRefs[]`, not full verified Actual Evidence |
| Contains prediction | **NO**; contains replay inputs, not final 1X2/scoreline seal |
| Proves existence before kickoff | **NO**; eligibility has no kickoff comparison |
| Proves non-reconstruction | **NO** without an independently admitted original seal |
| Classification | **C — Synthetic/demo/validation-generated artifact** for current repository instances |

Sidecars may support future replay, but cannot serve as an original prediction
seal.

### 3.9 Candidate D1-D4 — confirmed real-match outcomes

**Path:** `packages/statistics/src/evaluation/confirmed-match-replay-results.ts`
**Dataset version:** `confirmed-match-replay-results.v1`
**Common fields:** analysisTime `MISSING`; analysisCutoff `MISSING`;
generatedAt `MISSING`; prediction `NO`; checksum/algorithm/scope `MISSING`;
model/policy/parameter artifact `MISSING`; Evidence quality `MISSING` because
these are direct `ActualMatchResult` objects, not Evidence.

| Candidate | matchId | Home / away | Competition | Season | Kickoff | Score / winner | observedAt | Source | Class |
|---|---|---|---|---|---|---|---|---|---|
| D1 | `replay:2026-08-27:anderlecht:kairat-almaty` | Anderlecht / Kairat Almaty | UEFA Europa League Qualifying — Play-off Round | 2026/27 from competition id/name | `2026-08-27T18:30:00Z` in report, not object | 3-0 / home | `2026-08-28T02:47:00.000Z` | `evaluation:curated-result`; RSCA URL; method `authoritative-web-verification` | **D** |
| D2 | `replay:2026-08-27:celta-vigo:osasuna` | Celta Vigo / Osasuna | LaLiga EA Sports 2026/27 | 2026/27 | Completion-report metadata; object `MISSING` | 1-2 / away | Same | `evaluation:curated-result`; LaLiga URL; method `authoritative-web-verification` | **D** |
| D3 | `replay:2026-08-27:barcelona:athletic-club` | Barcelona / Athletic Club | LaLiga EA Sports 2026/27 | 2026/27 | Completion-report metadata; object `MISSING` | 2-0 / home | Same | `evaluation:curated-result`; LaLiga URL; method `authoritative-web-verification` | **D** |
| D4 | `replay:2026-08-27:omonia:sint-truiden` | Omonia / Sint-Truiden | UEFA Europa League Qualifying — Play-off Round | 2026/27 | Completion-report metadata; object `MISSING` | 4-2 / home | Same | `evaluation:curated-result`; ESPN URL; method `curated-result-verification` | **D** |

The source file explicitly states that these records contain no
`PRE_MATCH_PREDICTION` and must not enter History or a replay cohort until a
genuine sealed prediction exists. Provider/method text does not supply typed
Evidence quality.

### 3.10 Candidate E1 — offline cohort sealing and retrospective builders

| Field | Repository evidence |
|---|---|
| Paths | `packages/analysis/src/replay/create-and-seal-offline-rebuildable-replay-cohort.ts`; `packages/analysis/src/replay/create-and-seal-offline-executable-replay-cohort.ts`; validation bootstrap code |
| Artifact type | Post-History cohort assembly or current-runtime generation |
| Fixture/prediction fields | Inputs vary; no independent original artifact |
| Schema/checksum | Cohort schema and membership digest; not original prediction checksum |
| Contains original prediction | **NO**; references derivative History/Sidecars |
| Proves existence before kickoff | **NO** |
| Proves non-reconstruction | **NO**; operation occurs after validation data exists |
| Classification | **E — Retrospective/reconstructed artifact** |

### 3.11 Candidate F1-F3 — insufficient-provenance references

| Candidate | Path | Available identity | Missing admission evidence | Classification |
|---|---|---|---|---|
| F1 Yokohama narrative/example | `docs/sprints/R1A/R1A_MATCH_SCRIPT_CALIBRATION_AUDIT.md` and later audits | Team/result discussion | Immutable prediction payload, matchId-bound seal, timestamps, checksum scope | **F** |
| F2 PVS-3.2 live prediction | `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-3.2_LIVE_FIXTURE_SMOKE_COMPLETION_REPORT.md` | Blocked validation record | Successful report/seal does not exist | **F** |
| F3 Browser analysis history | `apps/web/src/lib/analysis-history.ts` | matchId, teams, kickoff, analyzedAt, reportId and counts | Prediction payload, projection/report checksum, immutable storage, cutoff | **F** |

Browser `localStorage` is mutable and stores only a presentation history index.
It is not an original prediction seal.

## 4. Candidate Classification

| Classification | Admitted candidates | Rejected/identified candidates |
|---|---:|---|
| A — Authentic original PRE_MATCH seal | **0** | None found |
| B — Controlled repository-backed PRE_MATCH test fixture | **0** | No fixture satisfies the complete contract |
| C — Synthetic/demo/validation-generated | Multiple families | C1-C8 |
| D — Outcome-only Actual | 4 | D1-D4 |
| E — Retrospective/reconstructed | Multiple code paths | E1 and current-runtime validation/cohort operations |
| F — Unknown/insufficient provenance | Multiple references | F1-F3 |

Every candidate has exactly one classification in this review. Inline test
predictions are classified C, not B, because they do not carry a complete
PRE_MATCH time/fixture seal contract and are regenerated during tests.

## 5. Seven-Part Authenticity Test

No candidate is classified A or B. The nearest prediction-bearing candidates
were nevertheless tested to show why admission fails.

| Candidate | 1. Existed before kickoff | 2. Exact fixture/orientation | 3. Original prediction payload | 4. Artifact/checksum identity and scope | 5. Generation time | 6. Non-regeneration in test | 7. Non-retrospective origin | Result |
|---|---|---|---|---|---|---|---|---|
| C1 A1 demo population | **FAIL** | **FAIL** — teams/kickoff absent | **PASS** — demo prediction values exist | **FAIL** — checksum strings have no content scope | **FAIL** | **PASS** as a source constant, but insufficient | **FAIL** — explicitly demo | Not A/B |
| C2 inline History tests | **UNKNOWN** | **PARTIAL/FAIL** | **PASS** for inline prediction | **PARTIAL** — test checksum only | **PARTIAL/FAIL** | **FAIL** — generated during test | **FAIL** | Not A/B |
| C3 database/replay tests | **UNKNOWN** | **PARTIAL** | **PASS** only in generated History | **PARTIAL** | **PARTIAL** | **FAIL** | **FAIL** | Not A/B |
| C5 P2K bootstrap | **FAIL** — no independent proof | **PASS** for template matchId/orientation | **PASS** only in runtime-generated History | **PARTIAL** — derivative checksums | **UNKNOWN** in committed repository | **FAIL** — bootstrap regenerates | **FAIL** — current Analysis path | Not A/B |
| C6 recovery V2 | **FAIL** | **PASS** for template fixture | **PASS** only after runtime generation | **PARTIAL** | **UNKNOWN** | **FAIL** | **FAIL** | Not A/B |
| C7 expansion V2 | **FAIL** | **PASS** for synthetic templates | **PASS** only after runtime generation | **PARTIAL** | **UNKNOWN** | **FAIL** | **FAIL** | Not A/B |
| C8 replay sidecar | **UNKNOWN** | **FAIL** — fixture tuple incomplete | **FAIL** — no final prediction | **PASS** for sidecar context only | **PASS** for context `generatedAt` | **UNKNOWN** | **UNKNOWN/FAIL** | Not A/B |

`PARTIAL` in the explanatory table is not an admission status; each of the
seven required criteria must be PASS. None qualifies.

History checksums, projection checksums, cohort membership digests and sidecar
hashes were not treated as full original-artifact checksums.

## 6. Verified Actual Review

### 6.1 Typed Evidence search

Repository search found typed `quality: "verified"` values for test Evidence,
example MATCH_INFO and some non-result Evidence types. It found no object where
`type: "MATCH_RESULT"` and `quality: "verified"` form the same durable
candidate.

The normalizer path in
`packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts`
creates MATCH_RESULT Evidence with:

```text
type = MATCH_RESULT
quality = unverified
```

`packages/statistics/src/evaluation/map-actual-match-result.ts` maps result
payloads but does not accept or validate the Evidence `quality` field.

### 6.2 Admission matrix

| Candidate family | MATCH_RESULT | Typed `quality === "verified"` | Durable Evidence id | Source/ref | Score/winner | FINISHED | observedAt | Matching admitted seal | Result |
|---|---|---|---|---|---|---|---|---|---|
| Four confirmed replay results | Direct Actual, not Evidence | **NO / MISSING** | **NO** | **YES** | **YES** | **YES** | **YES** | **NO** | Rejected |
| Validation bootstrap outcomes | Normalized MATCH_RESULT | **NO — unverified** | Runtime-generated | Validation source | **YES** | **YES** | **YES** | **NO** | Rejected |
| Demo population Actuals | Direct Actual, not Evidence | **MISSING** | **NO** | Demo source | **YES** | **YES** | **YES** | **NO** | Rejected |
| Unit-test verified Evidence | Not a qualifying matching MATCH_RESULT | Not applicable | Test-only | Test source | Varies | Varies | Varies | **NO** | Rejected |

Text such as `authoritative-web-verification`,
`curated-result-verification`, or `recorded-snapshot` is a provider/method
string. It is not typed Evidence quality and was not promoted.

**Verified MATCH_RESULT found: NO.**

## 7. Fixture Pairing

No A or B PRE_MATCH seal was admitted, so no valid pairing could begin.

| Pairing requirement | Result |
|---|---|
| Admitted original seal matchId | **MISSING** |
| Matching verified Actual matchId | **MISSING** |
| Exact home/away orientation match | **NOT TESTABLE** |
| Competition match | **NOT TESTABLE** |
| Season match | **NOT TESTABLE** |
| Kickoff match | **NOT TESTABLE** |
| Provider/source identity match | **NOT TESTABLE** |

The four real outcomes cannot be paired to demo/P2K predictions by team names.
Their `replay:*` matchIds do not identify any admitted prediction seal.

**Authentic seal + verified Actual pair found: NO.**

## 8. Reconstruction Detection

| Candidate/path | Detection | Classification consequence |
|---|---|---|
| `bootstrap-validation-history-sidecar.ts` | Explicitly runs current Import, AnalyzeMatch, ReportBuilder and GenerateMatchReportUseCase | C; not historical original |
| Projection V2 recovery/expansion bootstrap | Runs current V2 analysis over synthetic templates and attached validation outcomes | C; not historical original |
| Inline test helpers | Build prediction/History/Sidecar during test execution | C; not controlled immutable PRE_MATCH fixture |
| Offline cohort creation | Selects/seals derivative History and Sidecar membership after data exists | E |
| Any proposed rerun of D1-D4 | Would use known outcomes and current Analysis/Projection; no such rerun was performed | Must be E if created |
| Browser history / narrative reports | Insufficient payload/provenance to distinguish an authentic seal | F |

Ambiguity was resolved against authenticity. No current Analysis, Feature,
Rule, Match Script or Projection was run during this review.

## 9. Controlled Fixture Review

### 9.1 Authentic historical artifact

**NOT AVAILABLE**

No repository artifact passes the seven-part admission test.

### 9.2 Controlled conformance fixture

**NOT AVAILABLE**

A controlled fixture may be synthetic, but it must truthfully and durably
preserve:

- explicit synthetic/test provenance;
- exact fixture id and orientation;
- kickoff;
- `analysisTime` and `analysisCutoff`;
- `generatedAt`;
- complete original prediction payload;
- artifact identity plus checksum algorithm/scope;
- model/policy/parameter pins;
- evidence that the committed payload is the fixture under test rather than an
  object regenerated during the test.

Existing inline test builders and demo populations omit mandatory PRE_MATCH
time/fixture fields or regenerate objects during execution. They remain class
C rather than class B.

### 9.3 Synthetic/demo artifact

**AVAILABLE**

The A1 demo population, P2K validation populations and inline test records are
useful synthetic assets. They cannot establish historical authenticity or
satisfy the implementation admission gate.

**Controlled PRE_MATCH fixture found: NO.**

## 10. Idempotency Read-Only Findings

### 10.1 Evaluation checksum

`packages/statistics/src/evaluation/evaluate-prediction.ts` uses a local
32-bit FNV-style checksum.

For a scored evaluation the checksum includes, in order:

1. `prediction.matchId`;
2. `prediction.projectionChecksum`;
3. Actual home goals;
4. Actual away goals;
5. Actual winner;
6. a metrics serialization containing winner/score/goal/goal-range hits,
   predicted winner, scenario hits, confidence correctness, Rule/Feature
   coverage ratios and paper return;
7. caller-supplied **`evaluatedAt`**.

For excluded projections it uses matchId, projection checksum, projection
status and `"excluded"`; `evaluatedAt` is not included in that branch.

### 10.2 History id and checksum

`packages/statistics/src/evaluation/build-evaluation-history-record.ts`
creates:

```text
historyId =
  eval-history:{matchId}:{projectionChecksum}:{evaluation.checksum}
```

The History checksum includes:

1. `historyId`;
2. projection checksum;
3. evaluation checksum;
4. Actual home and away goals;
5. feature model version;
6. Rule set version;
7. projection model version.

`recordedAt` is stored but participates in neither History id nor History
checksum. `evaluatedAt` participates indirectly through the scored evaluation
checksum.

### 10.3 Stable historical intake verdict

**Not generally stable without an additional historical-intake idempotency
decision.**

- Changing only `recordedAt` does not change current identity.
- Re-evaluating the same seal/Actual with a new wall-clock `evaluatedAt` changes
  the evaluation checksum and therefore History id.
- Stable retries are possible with current evaluator semantics only if the
  command supplies the same truthful, governed `evaluatedAt` on every retry.
- No admitted artifact currently supplies that value or an existing historical
  evaluation identity.

Changing `evaluatePrediction` semantics is not required or authorized by this
review. A future implementation would need an approved stable command value or
a historical History id contract independent of execution time.

## 11. Replay Parameter Provenance Read-Only Findings

### 11.1 Current behavior

In
`packages/statistics/src/replay/assess-projection-replay-eligibility.ts`,
approximately lines 129-149:

- missing/blank `parameterVersionLabel` adds
  `PARAMETER_ARTIFACT_UNPINNED`;
- the `completenessBlockers` set does **not** contain that reason;
- therefore a row may have `replayComplete: true` and
  `replayEligible: true` while also reporting
  `PARAMETER_ARTIFACT_UNPINNED`.

This is current intentional P2K-C behavior as exercised by
`packages/statistics/test/projection-replay-eligibility.spec.ts`.
Downstream offline-executability code applies stricter parameter provenance
checks.

### 11.2 Historical intake boundary

A future historical intake capability could impose an independent stricter
gate requiring:

- `parameterVersionLabel`;
- parameter artifact id;
- parameter artifact checksum;
- checksum verification;
- sidecar generation before kickoff;
- binding to the admitted original seal.

It could then record a valid FT Evaluation while marking Replay blocked,
without changing the shared helper.

### 11.3 Shared-helper scope

Changing the shared `completenessBlockers` set would expand scope. It would
alter P2K-C cohort selection and existing Analysis/Replay tests and reports.
Such a change requires a separate governed review and is not necessary for this
artifact-admission review.

No replay helper was modified.

## 12. Admission Decision

### C. ADMISSION BLOCKED

Admission remains blocked because repository-grounded provenance does not
satisfy:

```text
authentic original PRE_MATCH seal
  + exact fixture identity
  + verified MATCH_RESULT Evidence
  + immutable provenance pair
```

Reusable code primitives, demo predictions, generated validation History,
sidecar hashes, provider URLs and outcome-only results do not satisfy that
equation.

## 13. Missing Evidence

The minimum evidence needed to reconsider admission is:

1. one immutable original PRE_MATCH prediction payload;
2. explicit exact matchId, home/away orientation, competition, season and
   kickoff belonging to that payload;
3. explicit timezone-aware `analysisTime`, `analysisCutoff` and `generatedAt`;
4. repository-supported proof that the payload existed before kickoff,
   independent of Git author time and filesystem mtime;
5. canonical artifact schema/version;
6. artifact checksum, checksum algorithm and canonical checksum scope;
7. projection/model/policy and parameter artifact provenance;
8. durable immutable storage identity;
9. evidence that the payload was not generated in a test and not reconstructed
   after kickoff;
10. matching durable Evidence with `type: "MATCH_RESULT"` and typed
    `quality: "verified"`;
11. Evidence id, source/reference, score, winner, FINISHED status and
    `observedAt`;
12. exact fixture-identity agreement between seal and Actual;
13. a truthful controlled conformance fixture carrying the same required
    PRE_MATCH fields, clearly labeled synthetic/test if it is not historical;
14. an approved stable `evaluatedAt`/History idempotency contract.

No item may be inferred from a provider method string, team-name similarity,
current runtime time, Git author time or filesystem mtime.

## 14. Explicit Non-Actions

This review:

- did not modify production code, tests, Prisma schema or migrations;
- did not create History, Sidecars, Cases, predictions or fixtures;
- did not import or promote historical data;
- did not run Analysis, Feature, Rule, Football State, Match Script,
  Projection, Unified Matrix or Replay;
- did not convert outcome-only data into predictions;
- did not change Evidence quality;
- did not modify Providers, architecture boundaries, roadmap or FIP protocol;
- did not start FIP-2 P1/P2/P3/P4 or Case Engine work;
- did not purchase, configure or use credentials.

## 15. Final Gate

| Required final statement | Result |
|---|---|
| Review completed | **YES** |
| Production code changed | **NO** |
| Only review document changed by this task | **YES** |
| Authentic PRE_MATCH seal found | **NO** |
| Controlled PRE_MATCH fixture found | **NO** |
| Verified MATCH_RESULT found | **NO** |
| Authentic seal + verified Actual pair found | **NO** |
| Historical reconstruction performed | **NO** |
| Final Admission | **C. ADMISSION BLOCKED** |
| Final Gate | **BLOCKED** |

The existing Historical Evaluation Intake Integrity gate remains
**C. BLOCKED**.
