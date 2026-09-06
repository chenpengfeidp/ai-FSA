# Historical Evaluation Intake — Implementation Planning / Final Gate

## 0. Status and authority

| Field | Value |
|---|---|
| Status | **FINAL GATE COMPLETE / PRODUCTION IMPLEMENTATION NOT AUTHORIZED** |
| Date | 2026-09-05 |
| Delivery type | Planning / Final Gate only; no production code |
| Track | `PREDICTION_VERTICAL_SLICE` |
| Roadmap references | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** (Prediction Evaluation) and **A2** (Calibration). This is not Sprint **C1** (Case Engine). Historical Match Center **C.1** is unrelated. |
| Architecture Freeze | v0.3, unchanged |
| Canonical Agent protocol | `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`, unchanged |
| Prior chain | Capability audit → Integrity planning → Readiness review **C. BLOCKED** → Artifact admission **C. ADMISSION BLOCKED** → Controlled fixture plan **A. READY** → Fixture implementation → Fixture review **PASS** |
| Implementation authorization | **None** |

This document freezes the minimum production implementation boundary for a
future Historical Evaluation Intake. Completing this gate does **not** start
that implementation, does **not** admit authentic historical matches, and does
**not** promote the Class B controlled fixture.

## 1. Verified repository state

Inspected against the live repository, not conversation memory.

```text
current_track                              = PREDICTION_VERTICAL_SLICE
current_stage                              = CONTROLLED_PREMATCH_CONFORMANCE_FIXTURE_REVIEW_COMPLETED
current_gate                               = HISTORICAL_INTAKE_PLANNING_FINAL_GATE
historical_evaluation_intake               = C_BLOCKED
authentic_prematch_seal                    = NOT_FOUND
authentic_seal_plus_verified_real_world_actual = NOT_FOUND
controlled_prematch_fixture                = IMPLEMENTED_AND_VALIDATED
controlled_fixture_classification          = B_CONTROLLED_SYNTHETIC
production_historical_intake_authorized    = false
current production sprint                  = none active
next_action (before this document)         = HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE
```

These states are **not** advanced to production-authorized by this document.

### 1.1 Document / code consistency

| Claim | Evidence | Result |
|---|---|---|
| Architecture Freeze / seven engines | `AGENTS.md`; no eighth engine proposed | Consistent |
| Product sequencing | Roadmap A1/A2 cited; no roadmap rewrite | Consistent |
| FIP PRE_MATCH cutoff | Protocol §6: `analysisTime < verified kickoff`; `analysisCutoff = analysisTime`; Agent procedure, not API gate | Consistent; intake will enforce this as a domain gate, not by editing FIP |
| A1.5 History exists | `evaluation-history.mvp.a15`; `buildEvaluationHistoryRecord`; memory + Prisma `recordJson` | Consistent |
| Class B fixture exists and is isolated | `packages/statistics/test/fixtures/controlled-prematch-conformance-v1/`; review PASS | Consistent |
| Class B is not authentic history | `synthetic=true`, `historicalAuthenticity=false`, `allowedUsage=conformance_test_only` | Consistent |
| Authentic Class A seal | Artifact admission + current search | **NOT FOUND** |
| Production MATCH_RESULT verification | Fixture normalizer emits `quality: unverified`; `mapActualMatchResultFromEvidence` ignores `quality` | Consistent with admission BLOCKED |
| Prisma revival | `reviveHistoryRecord` strips `schemaVersion` and forces a15; query silently omits decode failures | Consistent with **DOMAIN_EXTENSION_REQUIRED**, **no Prisma migration** |
| `PROJECT_INDEX.md` | Lists PVS through FIP-2 P0; later Historical Intake / fixture docs are not indexed | **Drift** (navigation only) |
| `PROJECT_STATE.md` Historical Delivery Context | Still contains a sentence that the only `NEXT_ACTION` is Controlled Fixture Implementation Review | **Drift** vs YAML header; YAML header is correct |

No architecture defect was found that would require a new numbered architecture
document, a new Engine, a Product Roadmap change, or a FIP protocol edit.

## 2. Data classification (binding)

| Class | Meaning | May enter production Historical Evaluation / Calibration / Validation / Contribution / Replay cohorts? |
|---|---|---|
| **A** | Authentic original PRE_MATCH prediction seal, created and stored before kickoff | Only after this intake gate **and** a later admission of a specific artifact |
| **B** | Controlled synthetic conformance fixture | **Never** |
| **C** | Synthetic / demo / validation-generated prediction (A1 demo population, P2K test builders) | **Never** as authentic historical intake |
| **D** | Outcome-only Actual / retrospective reconstruction | Actuals may be used only as Class-D outcomes; they never become Class A seals |

The existing fixture is **Class B**. Its PASS review proves only the bounded
controlled fixture contract. It is not production Historical Evaluation Intake
readiness.

## 3. Exact implementation boundary

Owner: **`@fas/statistics`**. No new package. No new Engine.

Reuse after the intake gate passes:

```text
already-authenticated Class A seal
  + verified real-world Actual
  → evaluatePrediction                    (unchanged A1 function)
  → historical-intake History builder     (new; not a15 builder)
  → EvaluationHistoryRepository.save      (existing port)
  → optional authentic replay sidecar     (existing port; never fabricated)
  → assessProjectionReplayEligibility     (existing; missing sidecar remains ineligible)
```

Do **not** call `EvaluatePredictionUseCase` (it seals a current `AnalysisResult`).
Do **not** hook `GenerateMatchReportUseCase`.

### 3.1 File states

#### MODIFY (first authorized implementation only)

| File | Why |
|---|---|
| `packages/statistics/src/domain/evaluation-history.ts` | Discriminated History union: keep frozen a15; add historical-intake variant with `intakeIntegrity`. Absence of intake must never mean verified. |
| `packages/statistics/src/index.ts` | Export new command, errors, decoder, builder. Do not re-export test helpers. |
| `packages/database/src/prisma-evaluation-history-repository.ts` | Version-aware `reviveHistoryRecord`. Unsupported schema versions fail closed. Do not change Prisma schema. |

#### ADD

| File | Why |
|---|---|
| `packages/statistics/src/domain/historical-prediction-seal.ts` | Authentic PRE_MATCH seal contract (identity, times, checksum metadata, classification). |
| `packages/statistics/src/domain/historical-evaluation-intake.ts` | `HistoricalEvaluationIntakeCommand`, result union, failure codes. |
| `packages/statistics/src/evaluation/canonical-json.ts` | **Production** canonical JSON + SHA-256. Independent of `test/helpers/canonical-json.ts`. Must reject duplicate keys at the ingest parser boundary. |
| `packages/statistics/src/evaluation/validate-historical-prediction-seal.ts` | Production seal decoder/validator. |
| `packages/statistics/src/evaluation/validate-verified-real-world-actual.ts` | Production Actual + Evidence verification gate. Distinguishes controlled vs real-world verification. |
| `packages/statistics/src/evaluation/assert-historical-intake-temporal-integrity.ts` | Fail-closed timestamp ordering. |
| `packages/statistics/src/evaluation/build-historical-intake-history-record.ts` | New History builder; separate from `buildEvaluationHistoryRecord`. |
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | Library command: validate → `evaluatePrediction` → History save → optional sidecar bind. |
| `packages/statistics/src/evaluation/decode-evaluation-history-record.ts` | Shared version-aware decoder used by Prisma (and tests). a15 creator unchanged. |

#### TEST ONLY

| File | Why |
|---|---|
| `packages/statistics/test/historical-evaluation-intake.spec.ts` | Full fail-closed matrix in §10. |
| `packages/statistics/test/historical-intake-population-isolation.spec.ts` | Class B + a15 vs historical-intake Calibration/Validation isolation. |
| `packages/database/test/prisma-evaluation-history-historical-intake.spec.ts` | Prisma round-trip of both schema variants; unsupported version fail-closed. |
| Existing Class B fixture files | **Read as reject-input** for production intake tests. Do not rewrite them into Class A. |
| `packages/statistics/test/helpers/canonical-json.ts` | Remain test-only. Production must not import this path. |

Optional later, not first boundary: Prisma tests may use the existing database
test harness. No seed of the Class B fixture.

#### MUST NOT TOUCH

- `packages/analysis/**` including `evaluate-prediction-use-case.ts` and all replay *execution* ports
- `packages/feature/**`, `packages/rule/**`, `packages/match/**`
- Projection / Match Script / Unified Matrix / Football State
- `packages/provider-*`, `packages/evidence-import/**`, `packages/evidence-normalizer/**`
- `packages/evidence/src/domain/**` except *reading* existing Evidence types from intake
- `apps/api/**` (Evaluation History remains GET-only; no intake HTTP)
- `apps/web/**`
- `apps/worker/**`
- `packages/report/**` first boundary (report may later *display* additive JSON; do not change now)
- `packages/database/prisma/schema.prisma` and migrations
- `packages/statistics/src/evaluation/evaluate-prediction.ts` checksum formula
- `packages/statistics/src/evaluation/build-evaluation-history-record.ts` a15 semantics
- `packages/statistics/src/evaluation/evaluation-population.ts` demo rows
- Class B fixture JSON contents (except if a separate fixture-defect review is opened)
- `docs/40_PRODUCT_ROADMAP.md`
- `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`
- Numbered architecture documents / ADRs
- Case Engine documents or any Case runtime

`packages/statistics/src/evaluation/map-actual-match-result.ts` stays the A1
live mapper. Historical intake must **not** treat that mapper as the
verification gate, because it ignores Evidence `quality`.

## 4. Domain decisions

### 4.1 Historical Prediction Seal (Class A)

An authentic original PRE_MATCH seal is an immutable artifact that already
existed before kickoff. The intake **authenticates**; it never generates.

Required fields:

| Field | Production contract |
|---|---|
| Seal identity | `originalSealId` (non-empty, immutable). Distinct from `matchId` and from A1.5 `historyId`. |
| Seal kind | `originalSealKind`: `sealed_projection` (required). A projection checksum must not be labelled as a full-report checksum. `reportChecksum` is optional and only when the source artifact actually has one. |
| Match identity | Exact `matchId`. No team-name fuzzy match. |
| Home/away orientation | Exact `homeTeam`, `awayTeam` strings bound to that `matchId`. Reversed orientation is fail-closed. |
| Competition / season | `competitionId`, `competitionName`, `season` required on the seal fixture identity. |
| Kickoff | Explicit ISO-8601 instant on the seal (`kickoff`). History `matchDate` is set from this kickoff; it is not a date-only field. |
| `generatedAt` | Original seal creation instant. Required. Must not be inferred from Git, filesystem mtime, or current clock. |
| `analysisTime` | Instant the analysis claims to have been performed. Required. |
| `analysisCutoff` | Must equal `analysisTime` (FIP §6). Any other value is `INVALID_ANALYSIS_CUTOFF`. |
| Projection checksum | Non-empty digest of the declared projection payload. |
| Checksum algorithm | Production admits **`sha256` only** for seal/integrity digests. A1 FNV-style checksums remain evaluation/history-row mechanics and are a different layer. |
| Canonicalization | Production admits **`fas-json-canonical.v1` only** for seal integrity. Unsupported canonicalization fails closed. |
| Checksum scope | Explicit JSON pointer / documented payload path. Scope must cover the sealed projection values used by `SealedPredictionInput`. Lineage/parameter checksums are separate scoped digests. |
| Model versions | `featureModelVersion`, `ruleSetVersion`, `projectionModelVersion` required. |
| Parameter artifact | If present: `artifactId`, `versionLabel`, `checksum`, algorithm, canonicalization, scope. If absent: outcome evaluation may proceed; replay remains ineligible (`PARAMETER_ARTIFACT_UNPINNED` informational at P2K-C; intake still must not fabricate a pin). |
| Provenance | `originalSealSource` identifies governed immutable storage (export record, WORM object, or repository-backed production seal store). Browser localStorage, chat recollection, and “we ran analysis today for an old match” are ineligible. |
| Historical authenticity | `historicalAuthenticity=true`, `synthetic=false`, `provenanceClass=A`, `allowedUsage` includes historical evaluation intake. Class B/C/D labels fail production intake. |

Nested prediction snapshot remains existing `SealedPredictionInput`. The wrapper
supplies identity/time/checksum metadata that the snapshot lacks.

**Retrospective reconstruction is never a Class A seal**, including: rerunning
today’s pipeline, filling missing probabilities, back-deriving a score from
the Actual, relabelling replay output, or editing an old seal to fit the
schema.

### 4.2 Verified Actual

Two verification classes must stay distinct:

| Class | Meaning | Production Historical Intake |
|---|---|---|
| Controlled verification | Fixture/review verification (`verificationClass=controlled-fixture-only`, `realWorldVerification=false`) | **Reject** (`ACTUAL_NOT_REAL_WORLD_VERIFIED`) |
| Verified real-world Actual | Independent MATCH_RESULT Evidence with `quality=verified`, `realWorldVerification=true`, bound to the same fixture | Required |

Production Actual boundary:

- `ActualMatchResult.matchStatus` must be `FINISHED` (existing domain already
  requires this).
- `observedAt` required ISO-8601; must be **strictly after** kickoff.
- Exact `matchId` / home / away / competition / season binding to the seal.
- Evidence: type `MATCH_RESULT`; `evidence.id` required; provenance
  `providerId` / `sourceId` / `method` required; `quality=verified`.
- `mapActualMatchResultFromEvidence` is **insufficient** as the intake gate
  because it does not inspect `quality`.
- Current production MATCH_RESULT normalization emitting `unverified` is **not**
  a verified real-world Actual. That path must not be silently upgraded.

Outcome-only Class D samples (confirmed match replay dataset) remain Actuals
without a seal and are ineligible for this intake.

### 4.3 Temporal integrity (fail-closed)

All timestamps are supplied; none are inferred.

Required ordering (all comparisons on UTC instants):

```text
analysisCutoff === analysisTime
analysisTime   <  kickoff
generatedAt    <  kickoff
generatedAt    >= analysisTime
observedAt     >  kickoff
```

Equalities that fail:

- `generatedAt >= kickoff` → `GENERATED_AT_NOT_PRE_MATCH`
- `analysisTime >= kickoff` → `ANALYSIS_TIME_NOT_PRE_MATCH`
- `analysisCutoff !== analysisTime` or cutoff ≥ kickoff → `INVALID_ANALYSIS_CUTOFF`
- Any observation / Evidence `collectedAt` / payload field dated at or after
  kickoff on the **prediction** seal → `POST_MATCH_LEAKAGE`
- `observedAt <= kickoff` → `ACTUAL_OBSERVED_NOT_AFTER_KICKOFF`

No POST_MATCH leakage may be accepted on the seal. The Actual is allowed to be
post-kickoff; that is the point of an Actual.

`intakeRecordedAt` / wall-clock now are **not** used for temporal authenticity
and are **not** written into A1 `evaluatedAt` (see §4.6).

### 4.4 Evaluation History schema strategy

Current frozen version: `evaluation-history.mvp.a15`.

Minimum additive variant:

```text
schemaVersion = "evaluation-history.mvp.historical-intake.v1"
```

| Variant | Meaning |
|---|---|
| `evaluation-history.mvp.a15` | Legacy A1.5. No `intakeIntegrity`. **Never** implies verified historical intake. Live report-generated History stays on this path. |
| `evaluation-history.mvp.historical-intake.v1` | Created only by the historical intake command. **Requires** `intakeIntegrity`. |

`createEvaluationHistoryRecord` remains a15-only. A new creator builds the
intake variant. Unknown fields on a15 continue to be dropped by the a15
creator — that is why a separate version is required.

`intakeIntegrity` (immutable; planning contract):

```text
contractVersion
originalSealId
originalSealKind
originalSealSource
originalSealChecksum
checksumAlgorithm          // sha256
checksumCanonicalization   // fas-json-canonical.v1
checksumScope
analysisTime
analysisCutoff
predictionGeneratedAt
kickoff
projectionPolicyPin?
parameterArtifactId?
parameterVersionLabel?
parameterArtifactChecksum?
resultEvidenceId
resultEvidenceSourceRef
resultVerifiedAt
historicalAuthenticity     // must be true
provenanceClass            // must be A
realWorldActualVerified    // must be true
replayComplete
replayEligible
replayReasons
```

Default population policy for this variant until a later admission gate:

```text
calibrationEligible = false
validationEligible = false
contributionEligible = false
replayCohortEligible = false   // unless replayComplete && replayEligible after authentic sidecar
```

Absence of `intakeIntegrity` = **not** intake-verified.

### 4.5 Prisma persistence

| Question | Decision |
|---|---|
| Prisma migration required? | **No.** `evaluation_history_items.record_json` is unconstrained JSONB. Indexes remain top-level `historyId` / match / competition / season / date. |
| Version-aware decoder required? | **Yes.** Current revival discards `schemaVersion` and reconstructs a15, dropping `intakeIntegrity`. |
| Unsupported schema versions | **Fail closed.** Do not silently coerce to a15. |

Decoder policy (must be approved before coding because it changes today’s
silent-omit query behavior for **unknown versions**):

- `evaluation-history.mvp.a15` → existing `createEvaluationHistoryRecord`.
- `evaluation-history.mvp.historical-intake.v1` → intake creator; missing
  `intakeIntegrity` fails.
- Any other `schemaVersion` → throw `UNSUPPORTED_HISTORY_SCHEMA_VERSION` on
  `findByHistoryId` and on `query` (do not omit). This is stricter than today’s
  silent omit of corrupt a15 JSON.
- a15 payload that fails the a15 creator: keep **query omit** (legacy
  resilience for corrupt a15 rows). `findByHistoryId` returns `undefined`.

No new table, no seed, no Class B persistence.

### 4.6 Idempotency

Do **not** change A1 `evaluatePrediction` checksum semantics (they include
`evaluatedAt`).

Historical intake pins:

```text
evaluatedAt = predictionGeneratedAt
```

Wall-clock `intakeRecordedAt` may be stored only inside `intakeIntegrity` or
as History `recordedAt` and **must not** enter the A1 evaluation checksum
identity used for retries.

Deterministic History id for the intake variant:

```text
historyId = "eval-history-hi:" + originalSealId + ":" + originalSealChecksum
```

A1.5 id `eval-history:{matchId}:{projectionChecksum}:{evaluation.checksum}`
stays on the a15 builder only.

| Event | Behavior |
|---|---|
| Exact same authenticated seal + Actual retry | Same `historyId`, same record checksum → `save` returns existing (existing duplicate-same-checksum semantics). |
| Same seal, conflicting Actual | Same `historyId`, different checksum → `DuplicateEvaluationHistoryError` / `CONFLICTING_ACTUAL` (fail closed; never overwrite). |
| Same match, different seal | Different `historyId`. Both rows may exist. `findByMatch` already returns an array. |
| Same projection values, different `originalSealId` | Different `historyId` (must not collapse). |

### 4.7 Replay

When a valid Class A seal and valid real-world Actual exist but the replay
sidecar is missing:

```text
outcome evaluation         = allowed (evaluatePrediction scored)
History write              = allowed (intake variant)
sidecar write              = not performed
replayComplete             = false
replayEligible             = false
replayReasons              includes MISSING_SIDECAR
```

The system must not fabricate a replay context, backfill from current Feature /
Rule / Projection runtime, or treat compact `SealedPredictionInput` as a
sidecar.

Invalid replay provenance (match mismatch, hash failure, post-kickoff
`generatedAt`, reconstruction) blocks sidecar persistence. If the seal+Actual
remain valid, outcome History may still be written with replay ineligible.

Intake must **not** promote `PARAMETER_ARTIFACT_UNPINNED` into a completeness
pass. P2K-C already treats it as informational; intake still forbids fabricating
a pin.

### 4.8 Synthetic isolation (hard controls)

1. Production intake rejects `provenanceClass=B` (`SYNTHETIC_FIXTURE_REJECTED`).
2. Production intake rejects `historicalAuthenticity=false`.
3. Production intake rejects `allowedUsage=conformance_test_only`.
4. Production intake rejects `verificationClass=controlled-fixture-only` and
   `realWorldVerification=false`.
5. Class B fixture paths live only under `packages/statistics/test/`.
6. No Prisma seed, no in-memory production repository registration, no replay
   cohort membership, no Calibration/Validation/Contribution population
   inclusion.
7. Tests that exercise the Class B bundle against the production command must
   assert **rejection**, not History save.
8. Happy-path unit tests, if any are written before a Class A artifact exists,
   must use explicitly constructed **test doubles** labelled
   `sourceAuthority=unit_test_constructed` and must never persist to the live
   Prisma database. Those doubles are **not** Class A admission evidence.

### 4.9 Trust-boundary validation

The production implementation must **not** export or import
`packages/statistics/test/helpers/canonical-json.ts` or the fixture spec
validator.

Production validation boundary:

```text
unknown JSON / command object
  → duplicate-key-rejecting parse (file ingest) or typed command
  → validate-historical-prediction-seal
  → validate-verified-real-world-actual
  → assert-historical-intake-temporal-integrity
  → synthetic/class isolation
  → map to SealedPredictionInput + ActualMatchResult
  → evaluatePrediction
  → build-historical-intake-history-record
  → repository.save
```

The test helper’s `JSON.parse` limitation (duplicate keys) is a known
non-blocking fixture review finding. Production file ingest must reject
duplicate keys explicitly.

### 4.10 Compatibility impact

| Consumer | Risk | First-boundary mitigation |
|---|---|---|
| In-memory History repository | Stores typed objects; union must compile | Discriminated `schemaVersion` |
| Prisma History repository | a15 revival drops new fields; silent omit | Version-aware decoder; no migration |
| Calibration (`computeFrequencyRatioCalibrationArtifact` / report use case) | Queries History without intake flags; new rows could enter A2 populations | Default `calibrationEligible=false` on intake variant; first boundary must not change A2 compute to ingest intake rows |
| Validation / Contribution report | Same: consume History arrays | Do not include intake variant in those populations in the first boundary |
| Replay eligibility / cohorts | Missing sidecar already ineligible | Unchanged; do not auto-enrol intake rows |
| `GET /api/evaluation-history` | Returns domain records directly | Additive JSON is serializable; **no POST intake**. Clients that assume a15-only `schemaVersion` literal may type-narrow incorrectly |
| Report `evaluationHistory` | Typed as `EvaluationHistoryRecord[]` | Union must remain structurally readable for existing fields |
| Web Evaluation History section | Subset display; ignores checksum/manifest | Should keep rendering shared fields; will not show intake integrity until a later UI gate |
| a15 `EVALUATION_HISTORY_SCHEMA_VERSION` export | Currently a single string constant | Keep export for a15; add a supported-versions list. Do not redefine the a15 constant |

## 5. Acceptance test matrix

Existing tests to preserve, not replace: `evaluation.spec.ts`,
`evaluation-history.spec.ts`, Prisma History tests, projection-replay
eligibility tests, calibration/validation/contribution report tests, Class B
fixture spec.

Future implementation tests (library-only; in-memory unless noted). Every
production-mode case that uses the Class B files must **reject**.

| ID | Case | INPUT | EXPECTED | FAILURE CODE / CLASS | WHY |
|---|---|---|---|---|---|
| T01 | Valid authentic PRE_MATCH seal + verified real-world Actual | Constructed Class A command (test double or later admitted artifact); FINISHED Actual; times ordered; sha256+canonical match; no sidecar | `accepted`; scored History `historical-intake.v1`; `replayComplete=false` | — | Happy path for outcome evaluation |
| T02 | Invalid seal checksum | Digest ≠ canonical sha256 of declared scope | Reject; no History | `INVALID_SEAL_CHECKSUM` / integrity | Forgery / bit-flip |
| T03 | Unsupported checksum algorithm | `md5` / `fnv` / omitted as seal algorithm | Reject | `UNSUPPORTED_CHECKSUM_ALGORITHM` | Only sha256 for seal integrity |
| T04 | Unsupported canonicalization | Not `fas-json-canonical.v1` | Reject | `UNSUPPORTED_CANONICALIZATION` | Canonical form is part of the digest |
| T05 | Fixture identity mismatch | Seal `matchId` ≠ Actual `matchId` | Reject | `FIXTURE_IDENTITY_MISMATCH` | Exact binding |
| T06 | Home/away orientation mismatch | Swapped team names, same matchId | Reject | `HOME_AWAY_ORIENTATION_MISMATCH` | Orientation is identity |
| T07 | `generatedAt >= kickoff` | generatedAt at/after kickoff | Reject | `GENERATED_AT_NOT_PRE_MATCH` | Not PRE_MATCH |
| T08 | `analysisTime >= kickoff` | analysisTime at/after kickoff | Reject | `ANALYSIS_TIME_NOT_PRE_MATCH` | FIP cutoff |
| T09 | Invalid `analysisCutoff` | cutoff ≠ analysisTime or cutoff ≥ kickoff | Reject | `INVALID_ANALYSIS_CUTOFF` | FIP `cutoff = analysisTime` |
| T10 | Post-match leakage | Seal observation dated ≥ kickoff | Reject | `POST_MATCH_LEAKAGE` | POST_MATCH data in PRE_MATCH seal |
| T11 | Actual not FINISHED | Non-FINISHED status | Reject | `ACTUAL_NOT_FINISHED` | A1 History only stores scored FT |
| T12 | Actual not real-world verified | `quality=unverified` or `realWorldVerification=false` | Reject | `ACTUAL_NOT_REAL_WORLD_VERIFIED` | Controlled ≠ real-world |
| T13 | Actual fixture mismatch | Competition/season/teams disagree | Reject | `ACTUAL_FIXTURE_MISMATCH` | Binding |
| T14 | `observedAt <= kickoff` | Observed at/before kickoff | Reject | `ACTUAL_OBSERVED_NOT_AFTER_KICKOFF` | Impossible FT observation |
| T15 | Class B fixture submitted to production intake | `controlled-prematch-conformance-v1` files as command | Reject; zero History writes | `SYNTHETIC_FIXTURE_REJECTED` | Isolation |
| T16 | Retrospective reconstruction | Command flagged reconstructed / generated by current analysis pipeline | Reject | `RETROSPECTIVE_RECONSTRUCTION` | Class D/C |
| T17 | Duplicate exact intake | Retry identical seal+Actual | Second save returns same `historyId`/checksum; row count 1 | — | Idempotency |
| T18 | Same match, different seal | Two Class A seals, same matchId, different `originalSealId` | Two History rows | — | Must not collapse seals |
| T19 | Same seal, conflicting Actual | Same seal, different FT score | Reject second write | `CONFLICTING_ACTUAL` | Append-only |
| T20 | Legacy a15 read | Existing a15 JSON / memory record | Round-trip unchanged; `intakeIntegrity` absent ≠ verified | — | Compatibility |
| T21 | New historical-intake write/read | Valid T01 record | Prisma + memory restore `intakeIntegrity` and schema version | — | Decoder |
| T22 | Unsupported History schema version | `schemaVersion=evaluation-history.future.x` in `recordJson` | Fail closed; not coerced to a15 | `UNSUPPORTED_HISTORY_SCHEMA_VERSION` | No silent upgrade |
| T23 | Prisma round trip | Save intake variant; `findByHistoryId` | Full JSON including nested intake | — | Persistence without migration |
| T24 | Missing replay sidecar | T01 without sidecar | History saved; `replayComplete=false`; `replayEligible=false`; reason `MISSING_SIDECAR` | — | No fabrication |
| T25 | Invalid replay provenance | Sidecar hash mismatch or matchId mismatch | History may save; sidecar not saved; replay ineligible | `INVALID_REPLAY_PROVENANCE` | Sidecar defect ≠ rewrite Actual |
| T26 | Calibration/Validation isolation | After rejected Class B and after saved intake variant | A2/V1A populations do not include Class B or default-ineligible intake rows; a15 demo/live path unchanged | `POPULATION_ISOLATION` | Contamination |

Additional required tests:

- Pin `evaluatedAt` so retries do not mint a new A1 evaluation checksum.
- Do not call `buildEvaluationHistoryRecord` (a15) from the intake command.
- Production modules must not import `packages/statistics/test/**`.

## 6. Remaining risks

| Severity | Risk |
|---|---|
| Blocking | No Class A seal exists in the repository. Production happy-path cannot be proven against authentic artifacts. |
| Blocking | No verified real-world Actual pair exists. Production MATCH_RESULT remains `unverified` and the A1 mapper ignores quality. |
| High | Changing Prisma query from silent-omit (unknown/corrupt) to fail-closed for unknown versions is a live GET behavior change. |
| High | Discriminated History union will type-break any consumer that uses `schemaVersion` as the a15 string literal only. |
| Medium | Happy-path tests using constructed “authentic” doubles can be misread as Class A admission. They are not. |
| Medium | Duplicate-key JSON parsing is not solved by the test helper. |
| Medium | Replay parameter pin remains informational in P2K-C; intake must not treat that as a pass. |
| Low | `PROJECT_INDEX.md` and one stale `PROJECT_STATE` narrative sentence already drift; they are not implementation authorization. |

## 7. Final Gate recommendation

# B. BLOCKED

The Controlled PRE_MATCH Conformance Fixture PASS and the existence of A1.5
Evaluation History are **not** sufficient authorization to implement
production Historical Evaluation Intake.

Unresolved evidence / decisions preventing implementation:

1. Authentic original PRE_MATCH seal = **NOT FOUND**.
2. Authentic seal + verified real-world Actual = **NOT FOUND**.
3. Production MATCH_RESULT verification authority is not present (`quality`
   ignored by the A1 mapper; live normalization remains `unverified`).
4. Human has not set `production_historical_intake_authorized = true`.
5. Prisma unknown-version fail-closed vs legacy silent-omit is a compatibility
   decision that must be explicitly approved before coding.
6. No approved Class A source/storage authority exists in production (no
   durable original-seal store separate from live analysis reconstruction).

This document **does** freeze the technical contracts above so a later
implementation sprint can start without re-planning, **after** the human
approvals in §8.

## 8. Human decisions required before any production implementation

Even after this document, coding must not start until the human explicitly
approves:

1. Start a bounded `@fas/statistics` library-only implementation sprint citing
   roadmap **A1** (not C1, not a new Engine).
2. Schema id `evaluation-history.mvp.historical-intake.v1`.
3. Prisma: **no migration**; version-aware decoder; unknown versions fail
   closed as specified in §4.5.
4. Idempotency: intake `historyId` from `originalSealId` + `originalSealChecksum`;
   pin `evaluatedAt = predictionGeneratedAt`; do not change A1 checksum formula.
5. Actual gate: controlled fixture verification is never real-world
   verification; Evidence `quality=verified` **and** `realWorldVerification=true`.
6. Default: historical-intake rows are **ineligible** for Calibration,
   Validation, Contribution, and replay cohorts until a later population gate.
7. No HTTP, no web UI, no Prisma seed, no Class B persistence.
8. Happy-path tests may use constructed doubles but those doubles are **not**
   artifact admission.
9. Do not ingest any real match until a separate Artifact Admission review
   finds a Class A seal + verified real-world Actual.
10. Proposed `PROJECT_STATE` synchronization in §9 — apply only if the human
    accepts it. Do not set production authorized.

## 9. Proposed PROJECT_STATE synchronization (not applied)

This Final Gate is complete. Repository convention would allow a **handoff**
update to `docs/PROJECT_STATE.md`. It is **not** applied in this task so the
human can accept the wording. Proposed machine-readable state:

```yaml
project: AI-FSA
current_track: PREDICTION_VERTICAL_SLICE
current_stage: HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE_COMPLETED
current_gate: HISTORICAL_INTAKE_PRODUCTION_IMPLEMENTATION_BLOCKED
historical_evaluation_intake: C_BLOCKED
authentic_prematch_seal: NOT_FOUND
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
controlled_prematch_fixture: IMPLEMENTED_AND_VALIDATED
controlled_fixture_classification: B_CONTROLLED_SYNTHETIC
production_historical_intake_authorized: false
next_action: HUMAN_REVIEW_OF_HISTORICAL_INTAKE_FINAL_GATE
next_production_capability: HISTORICAL_EVALUATION_INTAKE
```

Also correct the stale “only NEXT_ACTION is Controlled Fixture Implementation
Review” sentence in Historical Delivery Context, and add this document to the
Evidence Index. Do **not** set production authorized. Do **not** open an
implementation sprint from that sync alone.

## 10. Production implementation MUST NOT

- Implement or start the next sprint without human authorization of §8.
- Treat Class B fixture PASS as production readiness or population evidence.
- Treat A1.5 History existence as Historical Intake.
- Reconstruct, regenerate, or back-fill a PRE_MATCH prediction.
- Run Analysis / Feature / Rule / Match Script / Projection to create a claimed
  original historical seal.
- Derive a prediction from an Actual.
- Promote outcome-only Class D results into seals.
- Submit Class B/C artifacts to production intake as accepted History.
- Reuse the test-only fixture validator as the production decoder.
- Import `packages/statistics/test/**` from production `src`.
- Change `evaluatePrediction` checksum semantics or a15 `historyId`.
- Add a Prisma migration unless new evidence shows JSONB is insufficient.
- Add HTTP intake, UI, authentication, public deployment, or wagering advice.
- Create a new package or Engine.
- Modify Product Roadmap or canonical FIP unless a real defect is found.
- Write Prisma seeds, replay cohorts, or Calibration/Validation membership for
  the fixture or for default intake rows.
- Fabricate replay sidecars.
- Reinterpret a15 rows as intake-verified.
- Advance `production_historical_intake_authorized` without explicit human
  instruction.

## 11. Stop

Planning / Final Gate is complete. No production code. No next sprint. No
Historical Intake implementation.
