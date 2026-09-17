# Historical Evaluation Intake — Readiness Review (Authentic Pair)

| Field | Value |
|---|---|
| Review type | Read-only governance / readiness (no intake execution) |
| Date | 2026-09-17 |
| Primary artifact | Class A seal + verified Actual — `lottery:csl:20260915:周二012` |
| Prior pair reviews | PRE_MATCH admission PASS; pair verification PASS; pair artifact review PASS |
| Recommendation | **A. PASS — HISTORICAL EVALUATION INTAKE READINESS REVIEW COMPLETE** |
| Intake authorized | **No** (`historical_evaluation_intake: C_BLOCKED`) |

Supersedes the **artifact-finding** portions of `HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW.md` (2026-08-31) where that document assumed **no** authentic seal/Actual. Planning/Final Gate contracts remain authoritative.

---

## 1. Pair eligibility (governance only)

| Capability | Eligible now? | Evidence |
|---|---|---|
| Descriptive artifact / pair review | **YES** | Completed 2026-09-17 |
| Historical Evaluation Intake execution | **NO** | `production_historical_intake_authorized: false`; implementation not built |
| Calibration population | **NO** | Class A intake rows planned `calibrationEligible=false`; no intake row exists |
| Validation population | **NO** | Same firewall (Final Gate §6) |
| Contribution population | **NO** | Same firewall |

---

## 2. Existing evaluation contracts (inventory)

| Contract | Location | Production status | Persistence | Authorization |
|---|---|---|---|---|
| `SealedPredictionInput` | `packages/statistics/src/domain/prediction-evaluation.ts` | **EXISTS_AND_PRODUCTION_READY** | On seal `predictionSnapshot` | N/A |
| `evaluatePrediction` (A1) | `packages/statistics/src/evaluation/evaluate-prediction.ts` | **EXISTS_AND_PRODUCTION_READY** | Ephemeral; checksum in record | Reusable for intake |
| `EvaluationMetrics` | `prediction-evaluation.ts` | **EXISTS_AND_PRODUCTION_READY** | Inside evaluation + History | Defined |
| `EvaluationHistoryRecord` (a15) | `packages/statistics/src/domain/evaluation-history.ts` | **EXISTS_AND_PRODUCTION_READY** | `evaluation_history_items.record_json` | Live report path only |
| `buildEvaluationHistoryRecord` | `build-evaluation-history-record.ts` | **EXISTS_AND_PRODUCTION_READY** | a15 only | **Not** historical intake |
| `EvaluatePredictionUseCase` | `@fas/analysis` | **EXISTS_BUT_NOT_AUTHORIZED** for intake | Re-seals current analysis | **Must not** be used for intake |
| Historical intake command | `ingest-historical-evaluation.ts` (planned) | **NOT_FOUND** | — | Not implemented |
| `validate-verified-real-world-actual.ts` | Planned Final Gate §3.1 | **NOT_FOUND** | — | Not implemented |
| `evaluation-history.mvp.historical-intake.v1` | Final Gate §4 | **NOT_FOUND** (domain) | JSONB capable | Spec only |
| Prisma History decoder | `prisma-evaluation-history-repository.ts` | **PARTIAL** | a15-only revival | Drops unknown schema |

---

## 3. Admission conditions (Class A + verified Actual)

| Condition | Status | Notes |
|---|---|---|
| Authentic PRE_MATCH Class A seal | **PASS** | `FOUND_ADMITTED` |
| Immutable seal authentication | **PASS** | `authenticatePrematchPredictionSeal` |
| Verified real-world Actual | **PASS** | `quality=verified`, `realWorldVerification=true` |
| Exact fixture binding | **PASS** | Pair reviews |
| Post-kickoff `observedAt` | **PASS** | `2026-09-17T03:01:13.950Z` |
| No `MATCH_RESULT` at PRE_MATCH analyze | **PASS** | Seal-time rule |
| Durable persistence | **PASS** | Postgres seal + Evidence |
| Provenance | **PASS** | Documented |
| Schema version compatibility (intake History) | **BLOCKED** | Intake schema **not implemented** |
| Season compatibility (aggregation) | **READINESS note** | See §8 — not a single-pair intake blocker |
| Evaluation metric definitions (A1) | **PASS** | `evaluatePrediction` |
| Pair artifact admission | **PASS** | 2026-09-17 reviews |
| **Historical intake admission / authorization** | **BLOCKED** | No human §8 authorization; no intake code |
| Append-only intake History | **NOT_DEFINED** (runtime) | Port exists; intake builder missing |
| Reproducibility (intake id/checksum) | **NOT_DEFINED** (runtime) | Final Gate specifies design; not coded |

---

## 4. Metric semantics (A1 `evaluatePrediction` only)

| Metric concept | Defined in production? | Mechanism |
|---|---|---|
| 1X2 argmax accuracy | **YES** | `winnerHit` via `predictedWinnerFromProbs` |
| Scenario exact score (mostLikely) | **YES** | `scenarioHit.mostLikely` |
| Scenario exact score (second/upset) | **YES** | `scenarioHit.alternative`, `upset` |
| Scenario winner (mostLikely) | **YES** | `scenarioHit.mostLikelyWinner` |
| Exact-score **mode** (top mass) | **YES** | `scoreHit` = `topScorelines[0]` only |
| Top-K exact-score coverage | **NO** | Not in `EvaluationMetrics` |
| Home/away goal absolute error | **NO** | Not in `EvaluationMetrics` |
| Total goals (mostLikely scenario) | **PARTIAL** | `goalHit` compares `mostLikely` total to actual total |
| Goal-difference error | **NO** | Not in `EvaluationMetrics` |
| Goal-range bucket | **YES** | `goalRangeHit` |
| Brier / log loss (A1 record) | **NO** | Brier in **Calibration** report path over History populations |
| Confidence calibration | **PARTIAL** | `confidenceCorrectness` (high-confidence winner only) |

**Ipswich pair under A1 (if evaluated):** `winnerHit=true`; `scoreHit=false` (mode 3–3); `scenarioHit.mostLikely=false`; `goalRangeHit=true` (6 goals → `range4Plus`). Presence of 2–4 in `topScorelines` is **not** `scoreHit` unless it is `topScorelines[0]`.

---

## 5. Scenario semantics

**Verdict: EXPECTED_BUT_AMBIGUOUS_NAMING**

- Aggregate 1X2: `pHome` / `pDraw` / `pAway` → `predictedWinner` / `winnerHit`.
- Display scenarios: `scenarios.mostLikely` is a **labeled exact-score scenario**, not the argmax of `p*`.
- `topScorelines[0]` drives `scoreHit` (highest-mass listed scoreline).
- Contracts do not equate `mostLikely` scenario with `predictedWinner`; naming can confuse readers but is **not** a contract mismatch.

---

## 6. Multi-market utilization vs intake

**Verdict: B — does not block intake; must be recorded as model-version / evidence provenance.**

Final Gate requires authenticated seal + verified Actual, not consumption of every ODDS row. Pair artifact review documents first-ODDS market features (lottery 1X2 only). Unused persisted markets must not be treated as model inputs in evaluation narrative.

---

## 7. Season semantic debt

**Verdict: AGGREGATION_BLOCKER_ONLY** (for cross-season / multi-fixture aggregation).

`season=2025/26` is operator-attested governed identity on seal and Actual (exact bind). Single-pair intake gate can accept per Final Gate exact binding. **Stronger real-world season normalization** may be required before production historical **aggregation** — **not** a reason to mutate seal/Actual here.

---

## 8. Immutability / reproducibility

| Guarantee | Status |
|---|---|
| Seal immutability | **PASS** (insert-only repository) |
| Actual immutability | **PASS** (Evidence save semantics) |
| Intake History append-only | **PARTIAL** — port intended; intake path missing |
| `originalSealId` on History | **NOT_DEFINED** (runtime) — planned `intakeIntegrity` |
| Actual Evidence id reference | **NOT_DEFINED** (runtime) |
| `evaluatedAt` pinning | **NOT_DEFINED** (runtime) — Final Gate §8.4 |
| Version-aware Prisma decode | **BLOCKED** — implementation gap |

---

## 9. Calibration firewall

**Verdict: SPECIFIED in Final Gate; NOT ENFORCED in code until intake variant exists.**

Planned: `calibrationEligible=false` on historical-intake History; a15/demo paths unchanged. Current Calibration/Validation/Contribution query History **without** intake flags — **readiness BLOCKER for safe intake** until intake variant + population filters land (Final Gate §7, T26).

---

## 10. Readiness blockers (dependency order)

1. **Human authorization** — `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` §8 (no production implementation without explicit approval).
2. **Implementation gap** — historical intake library files **NOT_FOUND** (validate Actual, ingest command, historical-intake History builder, version-aware decoder).
3. **Population firewall** — ensure intake rows default **ineligible** for Calibration/Validation/Contribution before any real ingest.
4. **Season aggregation policy** — before multi-fixture production aggregation (not single-pair ingest).
5. **Optional metric gaps** — top-K / per-goal errors **not** required for intake readiness unless product gate adds them.

Pair artifact prerequisites (authentic seal + verified Actual) are **satisfied**.

---

## 11. Authorization status

```yaml
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

No authorization created by this review.

---

## 12. Recommendation

**A. PASS — HISTORICAL EVALUATION INTAKE READINESS REVIEW COMPLETE**

This PASS completes the **readiness review** only. It does **not** authorize Historical Evaluation Intake.

**Proposed `next_action`:** `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION_REVIEW` (human gate per Final Gate §8).
