# Historical Evaluation Intake — Implementation Review

| Field | Value |
|---|---|
| Review type | Implementation review / verification (no real ingest; no production authorization) |
| Date | 2026-09-17 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Binding specification | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` |
| Human §8 authorization | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md` |
| Implementation evidence | `HISTORICAL_EVALUATION_INTAKE_BOUNDED_IMPLEMENTATION_COMPLETION_REPORT.md` |
| **Decision** | **A. PASS — HISTORICAL EVALUATION INTAKE IMPLEMENTATION REVIEW COMPLETE** |
| Production intake | **Not authorized** (`historical_evaluation_intake: C_BLOCKED`) |
| `production_historical_intake_authorized` | **false** |
| Real-match ingest during review | **None** |

PASS of this review is **not** production Historical Evaluation Intake authorization and is **not** Artifact Admission for Ipswich–Arsenal ingest.

---

## 1. Sources inspected

- `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/PROJECT_INDEX.md`
- Final Gate, human §8 authorization, 2026-09-17 readiness review, implementation authorization review, bounded implementation completion report
- Production source: `ingestHistoricalEvaluation`, seal/Actual/temporal validators, History builder, version-aware decoder, Prisma repository revive, Calibration / Validation / Contribution / replay population filters
- Tests: `historical-evaluation-intake.spec.ts`, `historical-intake-population-isolation.spec.ts`, `prisma-evaluation-history-historical-intake.spec.ts`
- Working-tree diff vs `HEAD` (`git diff --stat HEAD`)
- Local PostgreSQL `fas_local` constructed round-trip (non-admission)

---

## 2. Implementation diff inventory

Working-tree production TypeScript (authorized bounded intake scope):

| Path | Classification | Notes |
|---|---|---|
| `packages/statistics/src/domain/historical-evaluation-intake.ts` | **AUTHORIZED** | Command / result / failure codes |
| `packages/statistics/src/domain/historical-prediction-seal.ts` | **AUTHORIZED** | Intake-facing seal contract |
| `packages/statistics/src/domain/evaluation-history.ts` | **AUTHORIZED** | Union + `intakeIntegrity` + eligibility helpers |
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | **AUTHORIZED** | Library command |
| `packages/statistics/src/evaluation/validate-historical-prediction-seal.ts` | **AUTHORIZED** | Class A authentication |
| `packages/statistics/src/evaluation/validate-verified-real-world-actual.ts` | **AUTHORIZED** | Verified Actual + fixture binding |
| `packages/statistics/src/evaluation/assert-historical-intake-temporal-integrity.ts` | **AUTHORIZED** | Temporal + MATCH_RESULT leakage |
| `packages/statistics/src/evaluation/build-historical-intake-history-record.ts` | **AUTHORIZED** | `historical-intake.v1` builder |
| `packages/statistics/src/evaluation/decode-evaluation-history-record.ts` | **AUTHORIZED** | Version-aware fail-closed decoder |
| `packages/statistics/src/evaluation/canonical-json.ts` | **AUTHORIZED** | Production checksum canonicalization |
| `packages/statistics/src/index.ts` | **AUTHORIZED** | Exports |
| `packages/database/src/prisma-evaluation-history-repository.ts` | **AUTHORIZED** | Revive via decoder |
| `packages/statistics/src/reliability/compute-prediction-calibration-report.ts` | **AUTHORIZED** | Filter only (`isCalibrationPopulationEligible`) |
| `packages/statistics/src/validation/compute-validation-report.ts` | **AUTHORIZED** | Filter only |
| `packages/statistics/src/contribution/compute-contribution-report.ts` | **AUTHORIZED** | Filter only |
| `packages/statistics/src/replay/select-replay-cohort-members.ts` | **AUTHORIZED** | Filter only |

Tests added (authorized):

- `packages/statistics/test/historical-evaluation-intake.spec.ts`
- `packages/statistics/test/historical-intake-population-isolation.spec.ts`
- `packages/database/test/prisma-evaluation-history-historical-intake.spec.ts`

Same working tree also contains pair-verification docs/scripts from the prior authentic-pair work (`verified-actual-ips-ars-pair.spec.ts`, persist script, pair reviews). Those are **not** this intake implementation's production logic. They do **not** write Historical Evaluation History for Ipswich–Arsenal.

### Confirmed unchanged (no diff vs HEAD)

Projection, Feature computation, Rule engine, `evaluate-prediction.ts`, PRE_MATCH seal capture, Actual-capture semantics, Calibration/Validation/Contribution **algorithms** (filters only), HTTP API, web UI, Prisma schema / migrations / seed, `apps/*`, Report semantics, season values.

**Authorized scope respected. No out-of-scope production change. Review not blocked on inventory.**

---

## 3. Ingest entrypoint (source, not tests)

`ingestHistoricalEvaluation` fail-closed order:

1. `validateHistoricalPredictionSeal` — checksum, Class A / synthetic isolation, model versions
2. `validateVerifiedRealWorldActual` — `FINISHED`, `quality=verified`, `realWorldVerification=true`, exact fixture binding, home/away orientation
3. `assertHistoricalIntakeTemporalIntegrity` — PRE_MATCH times, `observedAt > kickoff`, no post-kickoff / `MATCH_RESULT` observations
4. `evaluatePrediction({ evaluatedAt: seal.generatedAt })` — existing A1
5. `buildHistoricalIntakeHistoryRecord` — `evaluation-history.mvp.historical-intake.v1` + `intakeIntegrity`
6. `historyRepository.save` — append-only / same-checksum retry
7. Optional sidecar persist; invalid sidecar does not rewrite History
8. No mutation of seal or Actual objects; no source artifact writes

Rejected Class A / Actual failures return `{ status: "rejected", code }` and do not persist.

---

## 4. Class A / Actual admission

Constructed doubles only (`sourceAuthority=unit_test_constructed`). Mandatory fail-closed:

| Case | Result |
|---|---|
| Unauthenticated / invalid seal checksum | `INVALID_SEAL_CHECKSUM` (T02 + extra) |
| Unsupported checksum algorithm | `UNSUPPORTED_CHECKSUM_ALGORITHM` (T03) |
| Unsupported canonicalization | `UNSUPPORTED_CANONICALIZATION` (T04) |
| Non-Class-A / synthetic / Class B files | `SYNTHETIC_FIXTURE_REJECTED` (T15) |
| Retrospective reconstruction | `RETROSPECTIVE_RECONSTRUCTION` (T16) |
| `quality != verified` | `ACTUAL_NOT_REAL_WORLD_VERIFIED` (source + extra) |
| `realWorldVerification != true` | `ACTUAL_NOT_REAL_WORLD_VERIFIED` (T12) |
| Fixture `matchId` mismatch | `FIXTURE_IDENTITY_MISMATCH` (T05) |
| Home/away reversal | `HOME_AWAY_ORIENTATION_MISMATCH` (T06) |
| Competition / season / kickoff mismatch | `ACTUAL_FIXTURE_MISMATCH` (T13 + extras) |
| Actual observed at/before kickoff | `ACTUAL_OBSERVED_NOT_AFTER_KICKOFF` (T14) |
| MATCH_RESULT on PRE_MATCH observations | `POST_MATCH_LEAKAGE` (T10 + extra) |
| Unsupported History schema | `UNSUPPORTED_HISTORY_SCHEMA_VERSION` (T22 + live) |

---

## 5. History schema / `intakeIntegrity`

`schemaVersion = evaluation-history.mvp.historical-intake.v1`.

Governed `intakeIntegrity` fields implemented: `contractVersion`, `originalSealId`, `originalSealKind`, `originalSealSource`, `originalSealChecksum`, checksum algorithm/canonicalization/scope, `analysisTime`, `analysisCutoff`, `predictionGeneratedAt`, `kickoff`, optional parameter/policy pins, `resultEvidenceId`, `resultEvidenceSourceRef`, `resultVerifiedAt`, authenticity/provenance/real-world flags, replay completeness flags, default-false population flags, optional `intakeRecordedAt`.

Creator **rejects** any intake row whose eligibility flags are not `false`. No optional metric expansion in this sprint.

---

## 6. Evaluation semantics

Intake calls existing `evaluatePrediction`. `evaluate-prediction.ts` is **unchanged**.

- `winnerHit` — 1X2 argmax vs Actual winner
- `scoreHit` — exact match against `topScorelines[0]` only (T01 / extra scoreHit test: second scoreline matching Actual still `scoreHit=false`)
- `goalHit` — mostLikely scenario total vs Actual total goals

No top-K coverage, per-goal MAE, Brier, or log-loss added.

`evaluatedAt = predictionGeneratedAt` (`seal.generatedAt`) for A1 checksum compatibility.

Chronology reconstructable from stored provenance:

| Instant | Field |
|---|---|
| Prediction generation | `intakeIntegrity.predictionGeneratedAt` and `evaluation.evaluatedAt` (same by pin) |
| Analysis cutoff | `intakeIntegrity.analysisTime` / `analysisCutoff` |
| Kickoff | `intakeIntegrity.kickoff` / History `matchDate` |
| Actual observation | `intakeIntegrity.resultVerifiedAt` (`actual.observedAt`) |
| Intake persistence | `intakeIntegrity.intakeRecordedAt` and History `recordedAt` |

Audit can distinguish `evaluatedAt` from post-match observation time.

---

## 7. Idempotency / conflict / append-only

Identity: `historyId = eval-history-hi:{originalSealId}:{originalSealChecksum}`.

| Event | Behavior |
|---|---|
| Identical retry | Same `historyId`, same checksum, one row; `save` returns existing (`T17`; live Postgres after rebuild) |
| Same identity, incompatible Actual | `CONFLICTING_ACTUAL` / `DuplicateEvaluationHistoryError`; existing row not overwritten (`T19`; live Postgres `conflictRowCount=1`) |
| Same match, different seal | Two rows (`T18`) |

Prisma `save` is create-only when absent; matching checksum returns prior; checksum mismatch throws. In-memory repository matches. Intake does not update PRE_MATCH seals or MATCH_RESULT Evidence.

---

## 8. Prisma decoder

| Case | Required | Verified |
|---|---|---|
| A. legacy `evaluation-history.mvp.a15` | supported; corrupt a15 omitted | **PASS** in-memory T20; corrupt a15 `undefined` |
| B. `historical-intake.v1` with `intakeIntegrity` | supported | **PASS** in-memory T21; **PASS** live Postgres reload |
| C. intake.v1 missing / corrupt `intakeIntegrity` | fail closed | **PASS** `EvaluationHistoryValidationError` |
| D. unknown `schemaVersion` | fail closed `UNSUPPORTED_HISTORY_SCHEMA_VERSION` | **PASS** in-memory T22; **PASS** live find + query |

Unknown versions are **not** coerced to a15.

### Dist rebuild note

The first live runner imported a **stale** `@fas/database` `dist` that still revived every JSON row as a15 (pre-decoder). That run is **not** treated as production behavior. After `pnpm build` of `@fas/database` from the authorized source, revive uses `decodeEvaluationHistoryRecord` and the round-trip below passed. `dist/` is gitignored; consumers must build from current TypeScript.

---

## 9. Real PostgreSQL round-trip

| Item | Result |
|---|---|
| Availability | Local `127.0.0.1:5432` reachable; DSN `fas_local` ping **OK** |
| Official vitest `prisma-evaluation-history-historical-intake.spec.ts` | **3 skipped** — `vitest.config.ts` database project pins `fas_validation`, which does not connect |
| Constructed live round-trip (`fas_local`, `unit-test:constructed:review:*`) | **PASS** after database rebuild |

Live constructed results (non-admission):

```text
ping=OK
ingest=accepted
schemaVersion=evaluation-history.mvp.historical-intake.v1
evaluatedAt=predictionGeneratedAt
reloadSchema=evaluation-history.mvp.historical-intake.v1
reloadChecksumMatch=true
reloadHasIntegrity=true
retryStatus=accepted retrySameId=true retryRowCount=1
conflictStatus=rejected conflictCode=CONFLICTING_ACTUAL conflictRowCount=1
unknownFind=UNSUPPORTED_HISTORY_SCHEMA_VERSION
unknownQuery=UNSUPPORTED_HISTORY_SCHEMA_VERSION
missingIntakeIntegrity=EvaluationHistoryValidationError
realFixtureHistoryCountBefore=0
realFixtureHistoryCountAfter=0
lotteryIntakeHistoryCount=0
reviewRowsLeft=0
```

Skipped vitest is **not** recorded as PASS. Durable persistence is verified by the constructed `fas_local` runner, not by fabricating the skipped file.

---

## 10. Population firewall

Defaults on every intake row: `calibrationEligible=validationEligible=contributionEligible=replayCohortEligible=false` (creator-enforced).

T26 (`historical-intake-population-isolation.spec.ts`) feeds mixed `[a15, intake]` into **production** functions:

- `computePredictionCalibrationReport` → `filter(isCalibrationPopulationEligible)` → sampleSize 1, a15 only
- `computeValidationReport` → same pattern
- `computeContributionReport` → same pattern
- `selectReplayCohortMembers` → intake historyId in `rejectedHistoryIds`

`computeFrequencyRatioCalibrationArtifact` consumes `CalibrationPopulationRow[]`, not Evaluation History — it cannot ingest intake rows.

Replay cohort creation (`createAndSealReplayCohort`) selects via `selectReplayCohortMembers`, which applies the firewall.

**If flags existed but production queries ignored them: this review would BLOCK.** They are not ignored.

---

## 11. No real fixture ingested

Live `evaluation_history_items` query:

- `matchId = lottery:csl:20260915:周二012` count **0** before and after
- `historyId` prefix `eval-history-hi:prematch-seal:lottery:` count **0**
- constructed review rows deleted (`reviewRowsLeft=0`)

Ipswich–Arsenal seal + Actual artifacts were **not** passed to `ingestHistoricalEvaluation`.

---

## 12. Multi-market provenance (review only; no ingest)

Known Ipswich fact: four PRE_MATCH ODDS rows persisted; sealed `featureNames` / market-implied features consumed lottery 1X2 only.

Intake stores `predictionSnapshot` from the authenticated seal (including `featureNames`) and authenticates `checksumScope` / `originalSealChecksum`. It does not claim unused AH / O-U / lottery handicap-result influenced Projection. No Projection changes.

---

## 13. Test suites

| Suite | Result |
|---|---|
| `@fas/statistics` | **194 passed** / 19 files / **0 failed** |
| `@fas/statistics` typecheck | **PASS** |
| `@fas/database` typecheck (after `prisma generate`) | **PASS** |
| Prisma historical-intake vitest (`fas_validation`) | **1 file / 3 tests skipped** |
| Constructed `fas_local` History round-trip | **PASS** (after rebuild) |
| Extra fail-closed node cases | quality / kickoff / competition / MATCH_RESULT / checksum **rejected** |

Do not describe the skipped vitest file as PASS.

### Final Gate T01–T26

| ID | Result |
|---|---|
| T01–T19, T24–T25 | **PASS** (in-memory production command) |
| T20 | **PASS** (in-memory a15 decode) |
| T21 | **PASS** (memory + live Postgres intake restore) |
| T22 | **PASS** (memory + live Postgres) |
| T23 | **PASS** (live Postgres constructed fixture) |
| T26 | **PASS** (production report/cohort filters) |

---

## 14. Implementation acceptance matrix

| Requirement | Classification |
|---|---|
| Class A seal authentication | **PASS** |
| Verified Actual gate | **PASS** |
| Fixture binding | **PASS** |
| Temporal gate | **PASS** |
| historical-intake.v1 schema | **PASS** |
| intakeIntegrity | **PASS** |
| A1 metric preservation | **PASS** |
| historyId stability | **PASS** |
| Idempotency | **PASS** |
| Conflict rejection | **PASS** |
| Append-only behavior | **PASS** |
| Prisma a15 decode | **PASS** (in-memory; live a15 Prisma spec skipped) |
| Prisma historical-intake decode | **PASS** |
| Unknown schema fail-closed | **PASS** |
| Durable Postgres round-trip | **PASS** (`fas_local` constructed) |
| Durable reload | **PASS** |
| Calibration firewall | **PASS** |
| Validation firewall | **PASS** |
| Contribution firewall | **PASS** |
| Replay firewall | **PASS** |
| No real-match ingest | **PASS** |
| Source artifact immutability | **PASS** |

No **FAIL**. Vitest-on-`fas_validation` is a harness skip, not a substituted PASS.

---

## 15. Remaining limitations

- Official database vitest project still pins `fas_validation`; local verification used `fas_local`.
- `@fas/database` `dist` must be rebuilt from current TypeScript before runtime consumers see the decoder.
- `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW.md` (2026-08-31) remains **C. ADMISSION BLOCKED** and does **not** automatically admit Ipswich–Arsenal for production ingest.
- No HTTP / UI / seed / production-intake flag change.
- Constructed doubles are **not** artifact admission.

---

## 16. Governance

```yaml
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

**Next governance action (do not execute in this review):**

```text
HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW
```

Existing named gate. It is a review / admission / production-intake **authorization** gate, **not** automatic real ingest. Human §8.9 clarification still applies: existing Ipswich pair reviews do not by themselves authorize production ingest.

Production TypeScript was **not** modified during this review. Only gitignored `dist` was rebuilt so the live Prisma path matched source.

---

## 17. Review outcome

**A. PASS — HISTORICAL EVALUATION INTAKE IMPLEMENTATION REVIEW COMPLETE**
