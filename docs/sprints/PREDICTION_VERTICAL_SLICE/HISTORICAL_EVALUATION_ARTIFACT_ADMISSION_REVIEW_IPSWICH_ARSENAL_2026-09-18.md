# Historical Evaluation Artifact Admission Review — Ipswich Town vs Arsenal

| Field | Value |
|---|---|
| Review type | Real artifact admission (read-only; no ingest) |
| Date | 2026-09-18 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Named gate | `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW` |
| `matchId` | `lottery:csl:20260915:周二012` |
| Fixture | Ipswich Town vs Arsenal（伊普斯维奇 vs 阿森纳） |
| Actual | **2–4** (home–away), winner **away** |
| **Decision** | **A. PASS — REAL CLASS A ARTIFACT ADMITTED FOR FUTURE HISTORICAL EVALUATION INTAKE** |
| Eligibility established | **A** — artifact eligible for future Historical Evaluation Intake |
| Production intake authorized | **No** (not **B**) |
| Ingest executed | **No** (not **C**) |

This review does **not** set `production_historical_intake_authorized = true`, does **not** leave `historical_evaluation_intake` other than `C_BLOCKED`, and does **not** write Evaluation History.

---

## 1. Purpose of this gate

Repository sources: Final Gate §8.9 / §10; human §8 authorization (2026-09-17 clarification); implementation review next_action.

| Letter | Meaning | This review |
|---|---|---|
| **A** | Artifact eligible for *future* Historical Evaluation Intake | **May establish** |
| **B** | Production Historical Evaluation Intake authorized (`production_historical_intake_authorized = true`) | **Must not** establish |
| **C** | Execution of `ingestHistoricalEvaluation` / a real History row | **Must not** establish |

Final Gate §8.9: do not ingest any real match until a separate Artifact Admission review **finds a Class A seal + verified real-world Actual**.

Final Gate §10 / §8.10: do not advance `production_historical_intake_authorized` without **explicit human instruction**. No repository rule equates artifact admission with production authorization or ingest.

---

## 2. Real artifact identity (Postgres)

| Field | Persisted value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `sealIdentityHash` (id suffix) | `23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| Seal `schemaVersion` | `prematch-prediction-seal.v1` |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` (equal) |
| `kickoff` (identity string) | `2026-09-16T03:00:00+08:00` |
| Actual Evidence id | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |

No mutation. Reload used `findByOriginalSealId` + `authenticatePrematchPredictionSeal` and `evidenceRepository.findById`.

---

## 3. PRE_MATCH seal integrity

| Check | Result |
|---|---|
| Row present | **PASS** |
| `contentSha256` matches expected `ecd427e5…410e` | **PASS** |
| `authenticatePrematchPredictionSeal` | **PASS** |
| Stored `synthetic` | `false` |
| Stored `historicalAuthenticity` | `true` |
| Stored `provenanceClass` | `A` |
| Stored `allowedUsage` | `["historical_evaluation_intake"]` |
| Stored `reconstructed` / `generatedByCurrentAnalysisPipeline` | **absent** (not stored as true) |
| `recordJson` present | **PASS** |
| `predictionSnapshot` present | **PASS** |

---

## 4. Verified Actual integrity

| Check | Result |
|---|---|
| Durable reload | **PASS** |
| `type` | `MATCH_RESULT` |
| `homeGoals` / `awayGoals` | **2** / **4** |
| `matchStatus` | `FINISHED` |
| `winner` | `away` |
| `quality` | `verified` |
| `realWorldVerification` | `true` |
| `verificationClass` | `verified-real-world` (not `controlled-fixture-only`) |
| `observedAt` | `2026-09-17T03:01:13.950Z` |
| `source` | `itfc.co.uk` |
| `sourceId` | `carabao-cup-2026-09-15:ipswich-arsenal:ft:2-4` |
| `method` | `official-club-match-report` |
| `collector` | `governed-verified-actual-capture` |
| Conflicting verified MATCH_RESULT | **0** |

`mapActualMatchResultFromEvidence` **PASS**. Note: resolved `providerId` is `internal:unknown` because `itfc.co.uk` is not a registered provider catalog key; `source` / `sourceId` / `method` remain concrete and durable. Intake validator requires non-empty `providerId` / `sourceId` / `method` — **PASS**.

Not reconstructed from the prediction snapshot. Not sourced from a ChatGPT conversation (`sourceReference` cites Arsenal official report corroboration).

---

## 5. Exact pair binding

| Dimension | Seal | Actual | Match |
|---|---|---|---|
| `matchId` | `lottery:csl:20260915:周二012` | same | **YES** |
| home / away | 伊普斯维奇 / 阿森纳 | same | **YES** (not reversed) |
| `competitionId` | `eng:efl-cup` | same | **YES** |
| `competitionName` | `EFL Cup / 英联赛杯` | same | **YES** |
| `season` | `2025/26` | `2025/26` | **YES** (exact string) |
| `kickoff` | `2026-09-16T03:00:00+08:00` | same | **YES** |

No fuzzy matching.

---

## 6. PRE_MATCH authenticity

| Rule | Result |
|---|---|
| `analysisTime < kickoff` | **PASS** |
| `analysisCutoff === analysisTime` | **PASS** |
| `sealedAt < kickoff` | **PASS** |
| Governed PRE_MATCH Evidence `collectedAt` ≤ cutoff | **PASS** (9 PRE_MATCH rows; all `2026-09-15T14:22:18.766Z`) |
| MATCH_RESULT in PRE_MATCH analysis / on seal | **PASS** — seal has no `observations`; current MATCH_RESULT is post-kickoff Actual only |
| Retrospective reconstruction | **PASS** — flags absent / not true |
| Class A path | **PASS** |

PRE_MATCH Evidence inventory now: MATCH_INFO 1, TEAM_FORM 2, STATISTICS 2, ODDS 4, plus post-match MATCH_RESULT 1.

---

## 7. Runtime admission compatibility (no ingest)

Mapped via `historicalPredictionSealFromPrematch` + persisted Actual. Validators invoked **without** `ingestHistoricalEvaluation` and **without** History `save`.

| Gate | Classification |
|---|---|
| `validateHistoricalPredictionSeal` | **PASS** |
| Invalid checksum | **PASS** (authenticated `contentSha256` is checksum) |
| Class A / `allowedUsage` includes `historical_evaluation_intake` | **PASS** |
| `validateVerifiedRealWorldActual` | **PASS** |
| `quality=verified` | **PASS** |
| `realWorldVerification=true` | **PASS** |
| Fixture / orientation binding | **PASS** |
| `assertHistoricalIntakeTemporalIntegrity` | **PASS** |
| Sidecar | **NOT_APPLICABLE** (outcome History allowed without sidecar; Final Gate T24) |
| Persistence of History | **NOT_VERIFIABLE_WITHOUT_INGEST** (intentionally not executed) |

---

## 8. `intakeIntegrity` source-field readiness (dry)

If later authorized, this pair can supply:

| Field | Source |
|---|---|
| `originalSealId` | persisted seal |
| `originalSealChecksum` | `contentSha256` |
| checksum algorithm / canonicalization / scope | mapped Class A contract |
| `resultEvidenceId` | Actual Evidence id |
| `resultVerifiedAt` | `observedAt` |
| fixture identity | exact bind |
| feature / rule / projection versions | seal identity |
| `predictionGeneratedAt` | `sealedAt` |
| eligibility defaults | implementation forces `false` |

No History object was persisted.

---

## 9. Sealed A1 evaluation input (seal snapshot only)

| Field | Postgres seal |
|---|---|
| `pHome` / `pDraw` / `pAway` | 0.25972808893 / 0.163995407588 / **0.576276503482** |
| `topScorelines[0]` | **3–3** (p≈0.05107) |
| 2–4 in `topScorelines` | **yes** (not `[0]`) |
| `scenarios.mostLikely` | draw **3–3** |
| `goalRange.range4Plus` | **0.918380357622** |
| `projectionStatus` | `completed_nonempty` |
| `predictionConfidence` / band | 24.1 / `low` |

Dry `evaluatePrediction` (in-memory, no History write): `status=scored`, `evaluatedAt=sealedAt`, **`winnerHit=true`**, **`scoreHit=false`**, **`goalHit=true`**, `goalRangeHit=true`, `predictedWinner=away`.

2–4 appearing in `topScorelines` is **not** `scoreHit`.

No top-K / MAE / Brier / log-loss added.

---

## 10. Multi-market provenance

PRE_MATCH ODDS rows (4): lottery 1X2; lottery three-way handicap-result +1; independent AH +1.5; independent O/U 2.5.

Sealed `featureNames` include `marketImpliedHome/Draw/Away` and `marketLean` only among market features — lottery 1X2 consumption as previously documented. No AH / O-U / handicap-result feature names on the snapshot.

Intake stores the sealed `predictionSnapshot` and model versions; it does not claim unused markets influenced the projection. This is provenance, not a prediction defect.

---

## 11. Season semantic debt

`season = 2025/26` exact bind.

Readiness review 2026-09-17 §7: **AGGREGATION_BLOCKER_ONLY**. Governance has **not** changed: this does **not** block single-artifact admission. Do not mutate Seal or Actual.

---

## 12. Population firewall (implementation, not ingest)

Reviewed production builder/creator defaults:

`calibrationEligible = validationEligible = contributionEligible = replayCohortEligible = false`

Production report/cohort filters exclude default-ineligible intake rows (implementation review T26). If later ingested, this artifact would be excluded from those populations until a later population gate.

---

## 13. Existing Historical Evaluation History

Postgres query for `matchId` `lottery:csl:20260915:周二012`, `historyId` containing `周二012` or the admitted `originalSealId`, or lottery intake prefix: **0 rows**.

No prior real History. No duplicate.

---

## 14. §8.9 prior-review equivalence

**UNDEFINED — GOVERNANCE DOES NOT SPECIFY EQUIVALENCE**

- Final Gate §8.9 requires a separate Artifact Admission review that **finds** Class A + verified Actual; it does not name the Ipswich pair reviews as that review.
- Human §8.9 clarification deferred whether those pair reviews satisfy later real-match admission.
- The 2026-08-31 `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW.md` remains **C. ADMISSION BLOCKED** (no artifacts then) and is not this fixture’s admission.
- This document **is** the named post-implementation Artifact Admission review. It independently reloads Postgres and maps implemented validators.

Prior reviews remain necessary evidence. They are **not** declared equivalent by repository rule. This review supplies the §8.9 finding for this fixture.

---

## 15. Artifact admission result

**ADMITTED_FOR_FUTURE_HISTORICAL_EVALUATION_INTAKE**

Eligibility only. **Not** automatic ingest. **Not** production authorization.

---

## 16. Production authorization (unchanged)

```yaml
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

`ingestHistoricalEvaluation` was **not** called. No real History row was created. Production TypeScript was **not** modified.

---

## 17. Next governance gate (not executed)

No existing numbered document names the post-admission production-authorization step. Final Gate §10 forbids advancing `production_historical_intake_authorized` without **explicit human instruction**.

**Next action:** `PRODUCTION_HISTORICAL_EVALUATION_INTAKE_AUTHORIZATION_REVIEW`

That gate (if opened) is human authorization of the production flag. It is **not** ingest.

---

## 18. Review outcome

**A. PASS — REAL CLASS A ARTIFACT ADMITTED FOR FUTURE HISTORICAL EVALUATION INTAKE**
