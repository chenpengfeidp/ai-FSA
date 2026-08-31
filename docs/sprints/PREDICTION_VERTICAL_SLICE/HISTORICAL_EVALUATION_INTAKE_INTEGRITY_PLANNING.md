# Historical Evaluation Intake Integrity — Planning

## 0. Status and authority

| Field | Value |
|---|---|
| Status | **PLANNING ONLY / AWAITING HUMAN APPROVAL** |
| Date | 2026-08-31 |
| Delivery type | Bounded technical planning; no implementation |
| Source audit | `docs/sprints/PREDICTION_VERTICAL_SLICE/HISTORICAL_MATCH_EVALUATION_CASE_CAPABILITY_AUDIT.md` |
| Audit decision | **Option B** — FT Evaluation/Replay is reusable; safe historical intake needs a bounded integrity extension |
| Roadmap references | `docs/40_PRODUCT_ROADMAP.md` A1/A2; future C1 remains separate |
| Architecture Freeze | v0.3, unchanged |
| Canonical Agent protocol | `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`, unchanged |
| Implementation authorization | **None** |

This document plans only the smallest safe boundary between an authentic,
pre-existing PRE_MATCH prediction seal and the existing FT Evaluation History
pipeline.

It does not authorize code, schemas, APIs, data ingestion, runtime PRE_MATCH
enforcement, Case Engine activation, calibration, replay execution or model
changes.

## 1. Executive Summary

The repository can already score and store a sealed prediction against an FT
result:

```text
SealedPredictionInput
  + ActualMatchResult
  → evaluatePrediction
  → buildEvaluationHistoryRecord
  → EvaluationHistoryRepository.save
  → optional ProjectionReplaySidecarRepository.save
```

The missing capability is not another evaluator. It is a fail-closed intake
boundary proving that the prediction supplied to this flow is the original
artifact created before kickoff, rather than a prediction reconstructed after
the result became known.

The proposed minimum boundary is:

```text
pre-existing immutable prediction artifact
  + exact fixture identity
  + explicit PRE_MATCH timestamps
  + original seal/checksum/model provenance
  + verified MATCH_RESULT Evidence
  + optional original replay context
        ↓
Historical Evaluation Intake Integrity validation
        ↓
existing evaluatePrediction
        ↓
versioned EvaluationHistoryRecord with intake-integrity manifest
        ↓
existing EvaluationHistoryRepository.save
        ↓
optional authentic Projection Replay Sidecar
```

Core decisions:

1. The intake accepts data; it never calls Provider, Evidence acquisition,
   Feature extraction, Rule evaluation, Football State, Match Script,
   Projection or Unified Matrix generation.
2. `analysisTime`, `analysisCutoff`, `generatedAt` and kickoff are mandatory,
   timezone-aware instants. No timestamp may be inferred.
3. Fixture identity is exact. Team-name similarity is never sufficient.
4. A projection checksum and immutable original seal identity are mandatory.
   A report checksum is checked when the source artifact actually has one; the
   intake does not fabricate a report checksum.
5. `ActualMatchResult` is reused unchanged, but a structurally valid Actual is
   not automatically a verified Actual. The matching `MATCH_RESULT` Evidence
   or an equivalent governed verification reference must prove
   `quality=verified`.
6. Existing Evaluation logic and repository operations are reused.
7. New historical-intake History rows need a small versioned integrity
   manifest. Without it, the validation evidence would be discarded after
   intake.
8. No Prisma migration or HTTP endpoint is required for the first bounded
   implementation: `evaluation_history_items.record_json` already stores the
   domain record and `EvaluationHistoryRepository.save` already persists it.
9. Replay sidecar creation is optional and permitted only when the original
   Feature/Rule context was preserved before kickoff.

## 2. Existing Reusable Infrastructure

### 2.1 Reusable without redesign

| Capability | Owning implementation | Reuse decision |
|---|---|---|
| Compact prediction | `packages/statistics/src/domain/prediction-evaluation.ts` — `SealedPredictionInput` | Reuse as the FT evaluator input |
| Actual FT result | `packages/statistics/src/domain/actual-match-result.ts` — `ActualMatchResult` | Reuse unchanged |
| Result Evidence | `packages/evidence/src/domain/evidence.ts` — `MATCH_RESULT`, `quality`, provenance | Reuse for result verification |
| Prediction scoring | `packages/statistics/src/evaluation/evaluate-prediction.ts` — `evaluatePrediction` | Reuse; do not duplicate metrics |
| History construction | `packages/statistics/src/evaluation/build-evaluation-history-record.ts` | Reuse through a versioned historical-intake path |
| History repository | `packages/statistics/src/repository/evaluation-history-repository.ts` | Reuse `save` and existing reads |
| History persistence | `EvaluationHistoryItem.recordJson`; memory/Prisma adapters | Reuse; no new table required |
| Replay context | `SealedProjectionReplayContext` | Accept only if already preserved |
| Sidecar integrity | sidecar schema, canonical JSON, SHA-256 content hash | Reuse; do not define a second sidecar hash |
| Replay eligibility | `assessProjectionReplayEligibility` | Reuse after History and optional sidecar exist |
| Parameter identity | `ProjectionParameterArtifact` and registry | Reuse id/version/checksum vocabulary |
| Runtime policy pin | `AnalysisProvenanceMetadata.projectionPolicyPin` | Preserve in intake manifest |

### 2.2 Existing limitations that define this plan

- `SealedPredictionInput` has no analysis time, cutoff, fixture details, policy
  pin, parameter artifact or original seal id.
- `EvaluationHistoryRecord` has kickoff as `matchDate` and repository
  `recordedAt`, but no original prediction `generatedAt` or cutoff.
- `AnalysisReport` has `reportId`, `generatedAt`, Projection data and optional
  provenance, but no full-report checksum and no durable report repository.
- `AnalysisResult` contains transient Football State and Projection Framework
  metadata, but current History does not retain them.
- `ActualMatchResult` carries Provider provenance but no Evidence quality or
  verification status.
- current `MATCH_RESULT` normalization may produce `quality=unverified`; that
  is structurally valid Evidence but does not satisfy this historical intake
  gate.
- the current replay sidecar contains Feature/Rule values, Evidence refs,
  generation time and optional parameter artifact provenance, but not the
  original active Match Scripts or Football State snapshot.
- current History id/checksum derivation does not include an original
  prediction seal identity or cutoff.

## 3. Proposed Intake Contract

### 3.1 Boundary definition

An **authentic historical prediction artifact** is an immutable artifact that:

1. was created and durably recorded before the fixture kickoff;
2. identifies the exact fixture and home/away orientation;
3. contains the original sealed projection values and checksum;
4. carries explicit analysis/cutoff/generation timestamps;
5. identifies the policy/model versions used at creation;
6. can be traced to a repository-backed or otherwise governed immutable source;
7. was not regenerated, edited or reconstructed using post-kickoff data.

A **reconstructed prediction** is any projection produced, completed, altered
or inferred after kickoff, including:

- running today's analysis pipeline for an old fixture;
- running a historical Provider payload through current Feature/Rule logic;
- filling missing probabilities, scorelines, confidence or model versions;
- copying a remembered chat answer without an immutable pre-kickoff seal;
- deriving a predicted score from the known result;
- relabelling replay output as the original prediction;
- editing an old prediction to make its fields compatible with the current
  schema.

Reconstructed predictions are permanently ineligible for historical
Evaluation History intake under this boundary. They may be separately labelled
as retrospective experiments, but not as original PRE_MATCH predictions.

### 3.2 Proposed domain input

The future implementation should introduce one input-boundary domain object in
the existing Evaluation/Statistics ownership area. The shape below is a
planning contract, not code:

```text
HistoricalEvaluationIntakeCommand
  predictionSeal
    originalSealId
    originalSealKind
    originalSealSource
    originalSealChecksum
    checksumScope
    fixtureIdentity
    analysisTime
    analysisCutoff
    generatedAt
    sourceTimezone?
    projectionPolicyPin
    parameterArtifact?
    predictionSnapshot: SealedPredictionInput
    reportChecksum?
  actual
    result: ActualMatchResult
    resultEvidence: verified MATCH_RESULT Evidence or governed verification ref
  replayContext?: SealedProjectionReplayContext
  intakeRecordedAt
```

`originalSealKind` must state what is actually sealed, for example
`sealed_projection` or `sealed_analysis_report`. A projection checksum must not
be presented as a checksum of the full report.

`originalSealSource` identifies the immutable storage/export record that
existed before kickoff. A mutable browser local-storage entry or
conversation-only recollection does not qualify.

### 3.3 Proposed result contract

The result must be a discriminated union:

```text
blocked
  code
  safe message
  failed checks
  no History write
  no Sidecar write

evaluation_recorded
  historyId
  evaluation checksum
  replayStatus: not_requested | recorded | blocked
  replayReasons[]
```

The operation must never represent a blocked intake as empty success.

### 3.4 Artifact requirement classification

#### MUST EXIST

| Field | Reason |
|---|---|
| Original seal id, kind, source and checksum scope | Proves which immutable artifact is being evaluated |
| Original seal checksum | Detects changed artifact bytes/content within the source artifact's existing checksum contract |
| `matchId` | Primary exact identity join |
| Canonical home and away names in original orientation | Human-reviewable orientation |
| Competition identity | Prevents cross-competition fixture collision |
| Kickoff instant | Temporal gate and fixture match |
| `analysisTime` | Establishes when the PRE_MATCH request/context was evaluated |
| `analysisCutoff` | Establishes the latest admissible information time |
| `generatedAt` | Establishes when the sealed artifact completed |
| Projection policy pin | Distinguishes V1/V2 policy path |
| Projection status | Must be `completed_nonempty` |
| Projection checksum | Existing sealed projection identity |
| Projection model version | Evaluation lineage |
| 1X2 probabilities | Existing evaluator input |
| Top scorelines | Existing score evaluation input |
| Goal-range distribution | Existing goal-range evaluation input |
| Prediction confidence and band | Existing confidence evaluation input |
| Sealed scenarios | Existing scenario/goal evaluation input |
| Feature names and compact Rule snapshots | Required by current `SealedPredictionInput` and coverage metrics |
| Feature and Rule model/version identifiers | Historical lineage; no fallback to current versions |
| Verified FT Actual and its verification reference | Required for scored evaluation |
| Intake recording timestamp | Separates original generation from later repository intake |

For a V2 artifact, the parameter version label must exist. For a policy where a
parameter artifact was genuinely not applicable, the manifest must say
`not_applicable` under that policy; absence must not be silently converted to
`not_applicable`.

#### SHOULD EXIST

| Field | Reason / behavior when absent |
|---|---|
| Stable home and away team ids | Stronger participant matching; exact matchId/fixture identity remains mandatory |
| Competition id plus human name | Prefer stable id; name is review display |
| Provider fixture id and schedule source | Stronger traceability |
| Parameter artifact id and checksum | Required for replay; FT Evaluation may proceed with an explicit version label and `replay=blocked` |
| Full original report id/revision | Stronger source traversal |
| Full report checksum | Validate when the original report contract supplied it; never invent one |
| Evidence manifest with observed/retrieved times | Stronger cutoff audit |
| Feature values/ids/Evidence refs and full Rule ids/weights/scores | Required for sidecar; not required for A1 FT scoring |
| Original Football State snapshot | Historical explanation; not needed by current FT evaluator |
| Original active Match Script snapshot | Historical explanation; not needed by current FT evaluator |
| Original Unified Matrix and checksum | Exact BTTS/O/U and matrix audit; not needed by current A1 metrics |
| Explicit BTTS/O/U sealed outputs | Avoids replay proxy reconstruction |
| Recommendation and its policy version | Historical presentation; not scored by A1 |
| Intelligence-confidence detail | Richer report preservation; current History stores prediction confidence only |

If a SHOULD field is required by a requested capability, that capability is
blocked rather than fabricated. In particular, missing full Feature/Rule
context blocks sidecar creation but not FT Evaluation.

#### NOT REQUIRED FOR FT EVALUATION

- HT score or second-half score;
- event timeline;
- cards, penalties, substitutions or goalscorers;
- actual Match Script;
- script-shape mismatch;
- post-match xG/shots/possession;
- narrative prose;
- Case Engine record;
- current Provider refresh;
- current Feature/Rule/Projection recomputation;
- model tuning or calibration promotion.

## 4. Temporal Integrity

### 4.1 Canonical time semantics

For the current canonical FIP protocol:

```text
analysisCutoff = analysisTime
analysisTime < kickoff
analysisCutoff <= generatedAt < kickoff
```

The equality is intentional: FIP v1 says “Set `analysisCutoff =
analysisTime`.” A historical artifact must not loosen this after the fact.

If a pre-FIP artifact has a separately governed owning contract that
distinguishes request time from cutoff, it may use:

```text
analysisTime <= analysisCutoff <= generatedAt < kickoff
```

The intake must record the owning contract/version that permits this. Without
that evidence, non-equal `analysisTime` and cutoff are blocked.

All comparisons are comparisons of instants after parsing timezone-aware
ISO-8601/RFC 3339 values. UTC normalization may change representation only; it
must not change or infer the instant.

### 4.2 Timezone rules

- `Z` or an explicit numeric offset is mandatory on every timestamp.
- The original IANA timezone and source timezone are SHOULD fields for audit
  display.
- A local timestamp without `Z`/offset is invalid.
- An abbreviation such as `CST`, `BST` or `IST` is insufficient because it is
  ambiguous.
- Daylight-saving overlap/gap resolution must come from the source timestamp;
  the intake must not guess which offset applied.
- kickoff, analysis time, cutoff, generated time, Actual observation time and
  intake time are normalized to UTC for comparisons.
- original strings may be retained in the integrity manifest for audit, but
  canonical comparisons use UTC instants.

### 4.3 Fail-closed time behavior

| Condition | Result |
|---|---|
| Missing analysis time | BLOCKED — `HISTORICAL_ANALYSIS_TIME_MISSING` |
| Missing cutoff | BLOCKED — `HISTORICAL_CUTOFF_MISSING` |
| Missing generated time | BLOCKED — `HISTORICAL_GENERATED_AT_MISSING` |
| Missing kickoff | BLOCKED — `FIXTURE_KICKOFF_MISSING` |
| Malformed timestamp | BLOCKED — `HISTORICAL_TIMESTAMP_INVALID` |
| Timestamp lacks UTC offset | BLOCKED — `HISTORICAL_TIMEZONE_UNKNOWN` |
| Unknown/ambiguous timezone | BLOCKED — `HISTORICAL_TIMEZONE_UNKNOWN` |
| FIP artifact where cutoff differs from analysis time | BLOCKED — `HISTORICAL_CUTOFF_POLICY_MISMATCH` |
| Analysis time after cutoff | BLOCKED — `HISTORICAL_TEMPORAL_ORDER_INVALID` |
| Cutoff after generated time | BLOCKED — `HISTORICAL_TEMPORAL_ORDER_INVALID` |
| Analysis time at/after kickoff | BLOCKED — `HISTORICAL_NOT_PRE_MATCH` |
| Cutoff at/after kickoff | BLOCKED — `HISTORICAL_NOT_PRE_MATCH` |
| Generated time at/after kickoff | BLOCKED — `HISTORICAL_NOT_PRE_MATCH` |
| Actual observation time before kickoff | BLOCKED — `ACTUAL_RESULT_TIME_INVALID` |
| All explicit times parse and satisfy policy | Temporal check PASS |

Strict `< kickoff` is used. Equality with kickoff is not PRE_MATCH.

## 5. Fixture Identity Integrity

### 5.1 Identity inputs

The intake compares three independent views:

1. fixture identity in the original prediction seal;
2. fixture identity associated with the verified Actual result;
3. fixture identity supplied to the History record.

They must resolve to one exact fixture.

### 5.2 Exact matching rules

| Dimension | Requirement |
|---|---|
| Domain `matchId` | Exact string equality across seal, Actual and replay context |
| Home/away orientation | Exact side equality; swapping teams to obtain a match is forbidden |
| Stable team ids | Exact equality when present in either governed fixture identity |
| Canonical team names | Exact canonical values after already-governed alias resolution; intake performs no fuzzy matching |
| Competition | Stable id exact when present; otherwise exact governed competition identity, never free-text similarity |
| Kickoff | Same UTC instant |
| Provider fixture id | Exact when present |

Team-name similarity, edit distance, abbreviation matching or “same clubs near
the same date” is not an identity mechanism.

### 5.3 Identity outcomes

- **EXACT_MATCH** — all mandatory fields agree; optional stable ids agree when
  present.
- **MISMATCH** — any mandatory field disagrees, including reversed
  orientation.
- **AMBIGUOUS_IDENTITY** — more than one fixture could satisfy incomplete
  identity, or names resolve to multiple canonical teams.
- **MISSING_IDENTITY** — a mandatory fixture field is absent.

Only `EXACT_MATCH` may proceed.

### 5.4 Schedule corrections

If the original kickoff differs from the final result's kickoff because of a
reschedule, intake is blocked unless an existing immutable schedule-version
lineage proves both values belong to the same fixture. The current historical
intake has no such implemented lineage and must not infer one.

## 6. Seal / Checksum Integrity

### 6.1 Existing contracts to reuse

| Integrity value | Owner |
|---|---|
| `projection.checksum` / `SealedPredictionInput.projectionChecksum` | Analysis Projection / Statistics evaluation contract |
| Projection parameter checksum | `projection-parameter-artifact.ts` |
| Feature bundle checksum | existing Feature bundle and replay context |
| Sidecar `contentSha256` | Projection Replay Sidecar contract |
| Evaluation checksum | `evaluatePrediction` |
| History checksum/idempotent id | `buildEvaluationHistoryRecord` |

No new hash algorithm is needed for Projection, parameter artifacts, Sidecar,
Evaluation or History.

### 6.2 Validation rules

1. The intake receives the original seal; it does not build it from a current
   `AnalysisResult`.
2. `predictionSnapshot.projectionChecksum` must exactly equal the projection
   checksum recorded by the source seal.
3. Projection/model/version fields must be non-empty and internally
   consistent with the source seal.
4. `projectionStatus` must be `completed_nonempty`; blocked and failed
   projections do not become scored History.
5. 1X2/scoreline/goal-range/confidence/scenario values must be the original
   sealed values. The intake may validate shape and invariants but may not
   normalize or improve them.
6. `projectionPolicyPin` must be explicit and recognized by the artifact's
   owning historical contract.
7. When parameter id/version/checksum are present, all must refer to the same
   artifact. For a replay request, all three are mandatory and must agree with
   the replay context.
8. A report checksum is validated only when the original report had one. The
   current `AnalysisReport` has no checksum, so absence must be recorded as
   `report_checksum_not_available`; a projection checksum must not be relabelled
   as a report checksum.
9. The original seal source checksum is validated using that source artifact's
   existing checksum contract. Intake must not create a new checksum now and
   claim it existed before kickoff.
10. Any checksum mismatch blocks all writes.

### 6.3 Authenticity limit

A checksum detects content mismatch; it does not by itself prove when content
was created. Temporal authenticity also requires an immutable source record
whose recorded time predates kickoff. A copied JSON object containing a valid
projection checksum but first observed after kickoff is not an authentic
historical seal.

### 6.4 Original Feature/Rule context

For FT Evaluation, reuse the compact Feature names and Rule snapshots already
required by `SealedPredictionInput`.

For replay, require the original:

- Feature names and values;
- Feature model version and bundle checksum/status;
- Evidence references;
- Rule ids/names/status/channel/weight/score;
- required Evidence count;
- generation timestamp;
- parameter artifact provenance.

No Feature or Rule may be generated, re-evaluated or repaired during intake.

## 7. Actual FT Result Integrity

### 7.1 Reused domain

`ActualMatchResult` remains unchanged:

- exact `matchId`;
- non-negative integer home/away goals;
- winner consistent with score;
- total goals consistent with score;
- `matchStatus=FINISHED`;
- Provider id/source id/method;
- observation time;
- optional competition id/name.

HT/events are outside this boundary.

### 7.2 Verification requirement

`ActualMatchResult` validates structure, not source verification. Historical
intake must also receive either:

1. the owning `MATCH_RESULT` Evidence with `quality=verified`; or
2. an equivalent immutable governed result-verification reference that points
   to the exact Actual payload and source.

Minimum verified result checks:

| Check | Requirement |
|---|---|
| Evidence type | `MATCH_RESULT` |
| Evidence quality | exactly `verified` |
| Match identity | exact matchId and orientation |
| Status | `FINISHED` |
| Score | FT home/away non-negative integers |
| Derived fields | winner and total agree with FT score |
| Provider/source | non-empty provider id, source id and method |
| Observation | explicit timezone-aware timestamp after kickoff |
| Payload equality | Evidence score/status/competition equals `ActualMatchResult` |

A Provider method string containing “official” or “verified” does not replace
`quality=verified`.

Current outcome-only fixtures remain blocked because they have no prediction
seal; this plan does not change them. If a future intake also lacks a governed
verification status for an Actual, it remains blocked even when the score is
plausible.

### 7.3 Result corrections

ADR-004 specifies append-only Match Result versions, but that persistence is
not implemented. This intake plan must not create a parallel result-version
system.

Until ADR-004 is implemented, intake may consume only an immutable verified
result reference whose exact content is preserved in the History integrity
manifest. A later corrected score must produce a separately governed new
evaluation; it must never rewrite an existing History row.

## 8. Evaluation Reuse

### 8.1 Required operation order

The future intake operation should perform:

```text
1. Parse command as unknown at boundary
2. Validate required seal fields
3. Validate timestamps and PRE_MATCH ordering
4. Validate exact fixture identity
5. Validate seal/checksum/policy/model lineage
6. Validate Actual structure and verification reference
7. Call existing evaluatePrediction
8. Require evaluation.status=scored
9. Call versioned buildEvaluationHistoryRecord path
10. Call existing EvaluationHistoryRepository.save
11. Optionally validate and save authentic replay sidecar
12. Return explicit evaluation + replay statuses
```

No Provider, Feature, Rule or Projection operation appears in this sequence.

### 8.2 Existing logic that must not be duplicated

- predicted winner selection;
- scoreline matching;
- goal-total and goal-range evaluation;
- confidence correctness;
- Feature/Rule coverage;
- paper metric;
- evaluation checksum;
- repository idempotency/query behavior.

These remain owned by `evaluatePrediction`,
`buildEvaluationHistoryRecord` and `EvaluationHistoryRepository`.

### 8.3 Does EvaluationHistoryRecord require extension?

**Yes — a minimal versioned domain extension is required.**

Without an extension, History would preserve the prediction values and Actual
but discard the evidence that intake verified:

- original seal identity/source/scope;
- analysis time and cutoff;
- prediction generation time;
- exact kickoff used by the temporal gate;
- projection policy pin;
- parameter provenance availability;
- verified result Evidence identity;
- intake contract version.

The minimum new field is one immutable `intakeIntegrity` manifest on
historical-intake-created records:

```text
intakeIntegrity
  contractVersion
  originalSealId
  originalSealKind
  originalSealSource
  originalSealChecksum
  checksumScope
  analysisTime
  analysisCutoff
  predictionGeneratedAt
  kickoff
  projectionPolicyPin
  parameterArtifactId?
  parameterVersionLabel?
  parameterArtifactChecksum?
  resultEvidenceId
  resultEvidenceChecksumOrSourceRef
  resultVerifiedAt
```

This must be a new History schema variant/version. Existing
`evaluation-history.mvp.a15` rows remain immutable legacy records and must not
be reinterpreted as having passed the historical intake gate.

The new record's checksum and deterministic identity must include the original
seal id/checksum and integrity manifest using the existing History checksum/id
mechanism. This prevents two distinct source seals with coincidentally equal
prediction values from collapsing silently.

### 8.4 Persistence consequence

The Prisma model already stores the complete History domain record in
`record_json`. The proposed manifest does not require a new column for the
minimum intake use case because:

- exact reads use existing `historyId`;
- existing match/competition/season/date indexes remain sufficient;
- the plan does not require querying by cutoff or seal id.

The Prisma adapter would need to understand the new domain schema variant, but
the physical Prisma schema and migration remain unchanged.

## 9. Replay Sidecar Eligibility

### 9.1 Sidecar eligible

An optional replay context is eligible for persistence only when:

1. it was part of, or independently bound to, the original pre-kickoff seal;
2. context `matchId` exactly equals History/seal/Actual matchId;
3. context `generatedAt` equals or is explicitly bound to the original
   pre-kickoff generation event;
4. Feature and Rule arrays are non-empty original snapshots;
5. Feature bundle/model/checksum/status are present;
6. Evidence refs and required Evidence count are present;
7. Rule ids/names/status/channel/weight/score are present;
8. parameter version/id/checksum are complete and match the seal manifest;
9. existing canonical sidecar serialization and SHA-256 validation pass;
10. current `assessProjectionReplayEligibility` returns replay-complete after
    History save.

### 9.2 Sidecar incomplete

The following allow FT Evaluation but block replay:

- no full Feature values;
- no full Rule ids/weights/scores;
- missing Evidence refs;
- missing Feature bundle checksum;
- missing complete parameter artifact provenance;
- source preserved only compact `SealedPredictionInput`;
- context cannot be cryptographically bound to the original seal.

Result:

```text
evaluation_recorded
replayStatus=blocked
replayReasons=[explicit reasons]
```

No empty, synthesized or placeholder sidecar is written.

### 9.3 Sidecar blocked

Checksum failure, match-id mismatch, post-kickoff generation or evidence of
reconstruction blocks the sidecar. If the core prediction seal and Actual
remain independently valid, FT Evaluation may still be recorded with replay
blocked. A sidecar defect must never alter the original prediction or Actual.

### 9.4 No backfill from current runtime

The intake must not call:

- current Providers;
- Evidence import for historical prediction context;
- Feature extraction;
- Rule evaluation;
- Football State or Match Script generation;
- Projection V2;
- replay to reconstruct “what the original model would have said.”

Existing P2K-C policy already treats missing historical sidecars as not safe
for automatic backfill. This plan preserves that rule.

## 10. Fail-Closed Matrix

| Condition | Evaluation result | Replay result | Write behavior |
|---|---|---|---|
| No historical seal | BLOCKED | BLOCKED | No writes |
| Seal exists only in conversation memory | BLOCKED | BLOCKED | No writes |
| Seal first recorded after kickoff | BLOCKED | BLOCKED | No writes |
| Prediction generated at/after kickoff | BLOCKED | BLOCKED | No writes |
| Missing analysis time | BLOCKED | BLOCKED | No writes |
| Missing cutoff | BLOCKED | BLOCKED | No writes |
| Missing generated time | BLOCKED | BLOCKED | No writes |
| Missing/unknown timezone | BLOCKED | BLOCKED | No writes |
| Analysis/cutoff temporal order invalid | BLOCKED | BLOCKED | No writes |
| Cutoff at/after kickoff | BLOCKED | BLOCKED | No writes |
| Match identity mismatch | BLOCKED | BLOCKED | No writes |
| Home/away reversed | BLOCKED | BLOCKED | No writes |
| Ambiguous fixture | BLOCKED | BLOCKED | No writes |
| Missing mandatory fixture identity | BLOCKED | BLOCKED | No writes |
| Projection status blocked/failed | BLOCKED | BLOCKED | No writes |
| Projection/original seal checksum mismatch | BLOCKED | BLOCKED | No writes |
| Policy pin missing | BLOCKED | BLOCKED | No writes |
| Required model version missing | BLOCKED | BLOCKED | No writes |
| Missing actual FT result | BLOCKED | BLOCKED | No writes |
| Actual result not FINISHED | BLOCKED | BLOCKED | No writes |
| Actual result structurally invalid | BLOCKED | BLOCKED | No writes |
| Actual result unverified | BLOCKED | BLOCKED | No writes |
| Actual result identity mismatch | BLOCKED | BLOCKED | No writes |
| Valid prediction + valid verified FT result | ELIGIBLE | NOT REQUESTED or separately assessed | Save History |
| Valid prediction but no replay context | ELIGIBLE | BLOCKED: missing sidecar | Save History only |
| Valid prediction but incomplete authentic replay context | ELIGIBLE | BLOCKED: incomplete | Save History only |
| Valid prediction + complete authentic replay context | ELIGIBLE | ELIGIBLE | Save History, then Sidecar |
| Sidecar checksum mismatch | ELIGIBLE if independent core checks pass | BLOCKED | Save History only; explicit replay failure |
| Duplicate identical intake | IDEMPOTENT EXISTING RESULT | Existing status | No duplicate |
| Same deterministic id, different content | BLOCKED CONFLICT | BLOCKED | No overwrite |

No blocked core intake may enter Evaluation History as a scored historical
prediction.

## 11. Historical Sample Classification

These examples are reused only from the completed audit. No record is created
and no prediction is reconstructed.

| Sample | Classification | Historical intake decision |
|---|---|---|
| Anderlecht vs Kairat Almaty 3-0 | Outcome-only FT `ActualMatchResult`; no PRE_MATCH seal | BLOCKED |
| Celta vs Osasuna 1-2, HT 1-0 | Outcome-only FT; HT/report annotation outside Actual schema; no seal | BLOCKED |
| Barcelona 2-0, opponent unspecified in request | Ambiguous input; repository has a Barcelona vs Athletic Club outcome-only row but identity cannot be assumed | BLOCKED — ambiguous |
| Omonia vs Sint-Truiden 4-2 | Outcome-only FT; no PRE_MATCH seal | BLOCKED |
| Napoli vs Como 1-2 | Unsupported/not found in repository audit | BLOCKED |
| Deportivo La Coruña vs Valencia 3-1 | Unsupported/not found | BLOCKED |
| Celta vs Athletic Bilbao 0-2 | Unsupported/not found | BLOCKED |
| Manchester United vs Ipswich Town 5-2 | Unsupported/not found | BLOCKED |
| Yokohama F. Marinos vs Kashima Antlers 3-4 | Qualitative document example only; zero History rows; no seal | BLOCKED |

None of the listed examples is currently classified as a genuine historical
prediction.

An outcome-only result never becomes a prediction. Finding a result later does
not authorize running Projection now.

## 12. Schema / API Impact

### 12.1 Impact decision matrix

| Proposed surface | Needed? | Minimum reason |
|---|---|---|
| New governed Engine | **No** | Existing Statistics/Evaluation capability owns the boundary |
| New package | **No** | Place domain policy/use case in an existing Evaluation-owning package |
| New intake domain object | **Yes** | Trust boundary needs explicit seal, fixture, time, result verification and optional replay inputs |
| New intake result union/error codes | **Yes** | Fail-closed behavior cannot be represented as empty success |
| Extend `SealedPredictionInput` | **No** | Keep current evaluator contract stable; wrap it in the intake seal |
| Versioned `EvaluationHistoryRecord` extension | **Yes** | Persist proof of cutoff/seal/result verification |
| Change evaluation metrics | **No** | Reuse `evaluatePrediction` |
| New repository operation | **No** | Existing `save`/read operations are sufficient |
| New History query/index | **No** | First boundary does not query by seal/cutoff |
| New replay sidecar schema | **No** | Existing sidecar context/hash is sufficient when authentic context exists |
| Prisma schema change/migration | **No** | Versioned History JSON fits existing `record_json` |
| New API endpoint | **No for first boundary** | Private operator/library invocation is the smallest surface; HTTP would expand trust/security scope |
| Provider change | **No** | Intake consumes preserved artifacts only |
| ActualMatchResult extension | **No** | FT-only scope is sufficient |
| Case persistence/API | **No** | Future roadmap C1 |

### 12.2 Proposed ownership

The domain contract and pure integrity checks should live with the existing
Evaluation/History capability, currently in `@fas/statistics`. Repository
adapters remain in `@fas/database`. A composition root may inject the existing
History and Sidecar repositories.

No new Engine name or package is justified.

### 12.3 Why no initial HTTP endpoint

An HTTP intake endpoint would add:

- an untrusted external artifact upload boundary;
- authorization and operator-identity concerns;
- payload-size and replay-context validation;
- idempotency headers and error mapping;
- public API contract and OpenAPI maintenance.

None is required to prove the core integrity policy in the private trusted
environment. A future API is a separate gate after the domain use case is
validated.

### 12.4 Why no Prisma migration

The existing table stores:

- indexed History metadata;
- a full versioned domain record as JSON;
- a content SHA-256 at the adapter level.

The proposed integrity manifest can be included in the versioned `record_json`.
If future product requirements need queries by seal id/cutoff or a standalone
intake audit ledger, that measured requirement may justify schema work later;
it is not part of the minimum boundary.

## 13. Implementation Boundary

If separately authorized, the smallest implementation task would include only:

1. a versioned historical intake command/result contract;
2. pure temporal, fixture, seal and result-verification checks;
3. a versioned History integrity manifest/schema variant;
4. orchestration that calls existing `evaluatePrediction`,
   `buildEvaluationHistoryRecord` behavior and
   `EvaluationHistoryRepository.save`;
5. optional sidecar validation/save using existing sidecar contracts;
6. focused unit and repository compatibility tests;
7. no HTTP endpoint and no Prisma migration.

Permitted future code areas would need to be explicitly approved, but should
remain bounded to:

- `packages/statistics` domain/evaluation contracts and tests;
- minimal database JSON decoder compatibility if required;
- one existing composition root or private operator harness;
- a completion report and required status/index bookkeeping.

Stop boundaries for that future task:

- do not ingest the nine listed samples;
- do not run current analysis for historical fixtures;
- do not change Projection/Feature/Rule/Match Script/Matrix;
- do not create a result-version schema;
- do not create Case Engine;
- do not add HT/events;
- do not tune or promote anything;
- do not expose a new HTTP endpoint without separate approval.

## 14. Acceptance Criteria

A future implementation is acceptable only if:

1. No intake path calls Provider, Feature, Rule, Football State, Match Script,
   Projection or Unified Matrix computation.
2. Missing original pre-kickoff seal fails closed.
3. All mandatory timestamps are explicit, timezone-aware and strictly
   pre-kickoff where required.
4. FIP v1 artifacts enforce `analysisCutoff=analysisTime`.
5. Fixture matchId, orientation, competition and kickoff match exactly.
6. Ambiguous/missing/mismatched identity fails closed.
7. Existing projection/parameter/checksum contracts are reused.
8. A projection checksum is not misrepresented as a full report checksum.
9. Result Evidence is `MATCH_RESULT`, `FINISHED`, exact-match and verified.
10. `ActualMatchResult` remains FT-only and unchanged.
11. Evaluation uses existing `evaluatePrediction` without duplicated metric
    logic.
12. History construction/repository behavior is reused.
13. New History rows durably retain the intake-integrity manifest.
14. Legacy A1.5 History remains readable and is not retroactively marked as
    intake-verified.
15. History writes are append-only and idempotent; conflicts never overwrite.
16. Missing/incomplete replay context permits valid FT Evaluation but blocks
    replay explicitly.
17. Sidecars contain only authentic original Feature/Rule context.
18. No placeholder or reconstructed sidecar is created.
19. No Prisma migration or public API is added in the minimum slice.
20. No historical sample is ingested as part of the implementation proof.
21. No model/calibration/candidate behavior changes.
22. All blocked cases prove no History write occurred.

These are planning acceptance criteria only; no tests are added by this
document.

## 15. Explicit Non-Changes

This planning task does not:

- modify production code;
- modify Prisma or create migrations;
- modify API contracts;
- modify Providers;
- modify Projection V2;
- modify Match Script;
- modify Unified Matrix;
- modify Feature/Rule mathematics;
- modify Calibration;
- modify Evaluation History runtime or stored rows;
- create Cases or implement Case Engine;
- implement HT, events or Actual Match Script;
- implement PRE_MATCH runtime enforcement;
- implement freshness/conflict services;
- add Agent skills;
- add conformance tests;
- ingest historical samples;
- manufacture or reconstruct prediction seals;
- run replay;
- tune parameters;
- promote any candidate;
- modify the canonical FIP protocol;
- modify `docs/40_PRODUCT_ROADMAP.md`;
- start PVS-3.4;
- start FIP-2 P1/P2/P3/P4.

## 16. Governance / Authorization Boundary

- FIP-1 remains **PLANNING COMPLETE / REVIEWED**.
- FIP-2 P0 remains **COMPLETE / SIGNED OFF**.
- FIP-2 P1/P2/P3/P4 remain **NOT AUTHORIZED / NOT STARTED**.
- The Historical Match Evaluation / Case audit remains **AUDIT COMPLETE /
  PLANNING ONLY**.
- This Historical Evaluation Intake Integrity document is **PLANNING ONLY /
  AWAITING HUMAN APPROVAL**.
- Case Engine remains future roadmap Sprint C1.
- HT/events/Actual Match Script remain separate future boundaries.
- ADR-004 result-version implementation remains separate and unauthorized.
- PVS-3.4 remains **NOT STARTED**.
- `docs/40_PRODUCT_ROADMAP.md` remains unchanged.

Human approval of this document would still need to specify:

1. the implementation task's roadmap/governance placement;
2. the exact allowed files/packages;
3. approval for the versioned History domain extension;
4. whether the first invocation is library-only or includes a private operator
   harness;
5. confirmation that no HTTP endpoint or Prisma migration is authorized;
6. the source artifact class that qualifies as an immutable original seal.

Approval must not be interpreted as permission to ingest the example matches.

## 17. Recommended Next Step

Request focused human review of one decision:

> Approve or reject the minimum implementation boundary consisting of a
> versioned historical-intake command, fail-closed integrity validation and a
> versioned `EvaluationHistoryRecord.intakeIntegrity` manifest, with no HTTP
> endpoint and no Prisma migration.

If approved, the implementation gate must identify at least one controlled,
repository-backed pre-kickoff seal fixture for tests. It must not use any of the
outcome-only historical samples as if they had predictions.

Do not start implementation automatically. Stop after this planning document.
