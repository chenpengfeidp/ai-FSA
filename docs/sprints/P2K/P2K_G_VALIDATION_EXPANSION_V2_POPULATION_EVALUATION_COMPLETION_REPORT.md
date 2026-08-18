# P2K-G — Validation Expansion V2 Population Evaluation

**Status:** COMPLETED  
**Sprint id:** P2K-G (live population evaluation on Expansion V2 validation dataset)  
**Date:** 2026-08-17  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-F Expansion V2 (`docs/sprints/P2K/P2K_F_VALIDATION_EXPANSION_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`). Reuses P2K-G primitives from `docs/sprints/P2K/P2K_G_POPULATION_EVALUATION_COMPLETION_REPORT.md` / Recovery V2 evaluation.  
**Stop boundary:** Population Evaluation only. **P2K-H NOT AUTHORIZED. No Candidate C promotion.**

---

## A. Implementation correctness

Reused existing (no metric redesign):

- `computeSealedCohortPopulationEvaluation` (`@fas/statistics`)
- `PrismaPopulationEvaluationRepository` → `population_evaluation_items`

Fail-closed gates verified on live Expansion V2 inputs:

| Gate | Result |
| --- | --- |
| cohort exists + `SEALED` | PASS |
| membershipDigestSha256 match | PASS (`03b52d71…`) |
| A/C Replay Run schema `sealed-cohort-offline-replay-run.p2k.f` | PASS |
| A label `r1b.candidate.a.baseline` / C label `r1b.candidate.c.sideAwareOpen` | PASS |
| `productionPromoted === false` on both runs | PASS |
| Replay Run member sets == sealed cohort (30) | PASS |
| paired success historical context identity | PASS (via P2K-F; consumed unchanged) |
| actualResult from Evaluation History only | PASS |

Minimal scoped fixes (not metric redesign):

1. When A2 overall sample meets the minimum qualified threshold, evaluation `limitations` now explicitly state that **calibration qualification ≠ Candidate C superiority / promotion**.
2. P2K-E Prisma sealed-cohort test uses a unique 1ms `recordedAt` window so shared `fas_validation` leftovers no longer inflate membership (test isolation only).

Did **not**:

- regenerate History / Sidecar / Replay Runs
- reseal or mutate cohort membership
- re-execute P2K-E / P2K-F
- change P2K-C / P2K-D / Projection / Match Script production parameters
- Provider refresh / Evidence / Feature / Rule regeneration

---

## B. Live 30-member population measurement

### Inputs (pre-existing, untouched)

| Artifact | Id |
| --- | --- |
| SEALED cohort | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| membershipDigestSha256 | `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997` |
| Baseline A Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` (30/0) |
| Candidate C Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` (30/0) |

### Evaluation artifact

| Field | Value |
| --- | --- |
| evaluationRunId | `eval.p2k.g.validation.expansion.v2.analyzematch.v1` |
| schemaVersion | `sealed-cohort-population-evaluation.p2k.g` |
| checksum | `b65010c9eaf25b1946be7ddb8cd5b8489b5b0fc35c76f3ab7d1e81efebedd2f5` |
| PostgreSQL round-trip | **PASS** |
| createdAt | `2026-08-17T11:00:00.000Z` |

### Coverage

| Metric | Value |
| --- | --- |
| totalSealedMembers | 30 |
| eligibleReplayMembers | 30 |
| successfulBaselineReplayCount | 30 |
| successfulCandidateReplayCount | 30 |
| pairedSuccessfulCount | 30 |
| failedBaselineCount | 0 |
| failedCandidateCount | 0 |
| excludedCount | 0 |
| finalEvaluationSampleSize | **30** |

### Metrics (A / C / Δ C−A)

| Metric | A | C | Δ C−A |
| --- | ---: | ---: | ---: |
| Match Result accuracy | 0.666667 (20/30) | 0.666667 (20/30) | 0 |
| Exact Score accuracy | 0.1 (3/30) | 0.1 (3/30) | 0 |
| Goal Range accuracy | 0.266667 (8/30) | 0.266667 (8/30) | 0 |
| BTTS accuracy | 0.666667 (20/30) | 0.666667 (20/30) | 0 |
| Over/Under 2.5 accuracy | 0.4 (12/30) | 0.4 (12/30) | 0 |
| Brier Score | 0.449629 | 0.450712 | +0.001083 |
| ECE | 0.21933 | 0.219965 | +0.000635 |
| Confidence–Winner correlation | 0.297954 | 0.297954 | 0 |

### Winner breakdown (actual outcome subgroups)

| Subgroup | n | A | C | Δ |
| --- | ---: | ---: | ---: | ---: |
| actual Home | 10 | 1.0 (10/10) | 1.0 (10/10) | 0 |
| actual Draw | 9 | 0.0 (0/9) | 0.0 (0/9) | 0 |
| actual Away | 11 | 0.909091 (10/11) | 0.909091 (10/11) | 0 |

### Calibration qualification

| Field | Value |
| --- | --- |
| A2 minimum qualified report sample size | 20 |
| Sample meets minimum | **true** (n=30) |
| Candidate superiority claimed | **false** |
| Distinction recorded in limitations | **yes** |

Meeting the A2 sample threshold means Brier/ECE are no longer labeled “below threshold / directional only” for overall sample size. It does **not** mean Candidate C is better, population-validated for promotion, or authorized for P2K-H.

### Distribution diagnostics (observational; from durable A/C predictions + History actuals)

| Distribution | Baseline A | Candidate C |
| --- | --- | --- |
| Confidence band | low 24 / medium 6 | low 24 / medium 6 |
| Predicted goal-range | range01 1 / range23 2 / range4Plus 27 | same |
| Predicted winner | home 19 / away 11 | same |
| Prediction profile count | **28** | **28** |

| Actual outcome (History) | Count |
| --- | ---: |
| winner home / draw / away | 10 / 9 / 11 |
| goal-range range01 / range23 / range4Plus | 7 / 18 / 5 |

### Subgroup sample insufficiency (bucket minimum = 5)

| Subgroup | Insufficient buckets |
| --- | --- |
| confidence band (A/C) | none |
| predicted winner (A/C) | none |
| actual winner | none |
| actual goal-range | none |
| predicted goal-range (A/C) | **range01 (1)**, **range23 (2)** |

Predicted `range01` / `range23` remain sparse (model bias toward `range4Plus`), so those predicted goal-range buckets stay below the A2 bucket reliability floor even though overall n=30.

### Prior artifacts untouched

| Artifact | Status |
| --- | --- |
| Old V1 cohort `p2k.e.validation.bootstrap.analyzematch.v1` | SEALED, digest unchanged |
| Recovery V2 cohort `p2k.e.validation.recovery.v2.analyzematch.v1` | SEALED, digest unchanged |
| Recovery V2 evaluation `eval.p2k.g.validation.recovery.v2.analyzematch.v1` | checksum unchanged |

---

## C. Statistical limitations (n=30)

- Results are **descriptive validation evidence only**.
- **No statistical significance** claim.
- **No confidence intervals**.
- Tiny Brier/ECE deltas **must not** be interpreted as Candidate C superiority (here C is slightly worse on both).
- Accuracy deltas are **exactly zero** on winner / exact score / goal range / BTTS / O/U / confidence correlation for this sealed set.
- Calibration qualification and Candidate superiority are **different concepts**.
- Sparse predicted goal-range buckets (`range01`, `range23`) remain insufficient for bucket-level reliability claims.
- Predicted winners still exclude `draw` (model property documented in P2K-G2-A).

---

## D. Governance / promotion status

| Invariant | Status |
| --- | --- |
| Candidate C `productionPromoted` | **false** |
| Production Match Script = Baseline A | **unchanged** |
| `candidateCProductionPromoted` on evaluation | **false** |
| `statisticalSignificanceSupported` | **false** |
| “Candidate C better” claim | **NOT MADE** |
| P2K-H | **NOT AUTHORIZED** |
| Architecture Freeze v0.3 | **unchanged** |

---

## Files

| File | Role |
| --- | --- |
| `packages/statistics/src/evaluation/compute-sealed-cohort-population-evaluation.ts` | qualified-sample governance limitation |
| `packages/statistics/test/sealed-cohort-population-evaluation-p2k-g.spec.ts` | qualification ≠ superiority regression |
| `docs/sprints/P2K/scripts/p2k-g-validation-expansion-v2-population-evaluation.mjs` | live Expansion V2 consumer + distribution diagnostics |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-g-validation-expansion-v2-population-evaluation.mjs
```

---

## Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Focused P2K-G statistics tests | **PASS** |
| Live `fas_validation` population evaluation | **PASS** |

---

## Machine-readable summary

```json
{
  "aSuccess": 30,
  "aFailure": 0,
  "cSuccess": 30,
  "cFailure": 0,
  "pairedSample": 30,
  "winnerAccuracyA": 0.666667,
  "winnerAccuracyC": 0.666667,
  "winnerDelta": 0,
  "exactScoreA": 0.1,
  "exactScoreC": 0.1,
  "exactScoreDelta": 0,
  "goalRangeA": 0.266667,
  "goalRangeC": 0.266667,
  "goalRangeDelta": 0,
  "bttsA": 0.666667,
  "bttsC": 0.666667,
  "bttsDelta": 0,
  "ouA": 0.4,
  "ouC": 0.4,
  "ouDelta": 0,
  "brierA": 0.449629,
  "brierC": 0.450712,
  "brierDelta": 0.001083,
  "eceA": 0.21933,
  "eceC": 0.219965,
  "eceDelta": 0.000635,
  "confidenceCorrA": 0.297954,
  "confidenceCorrC": 0.297954,
  "confidenceCorrDelta": 0,
  "predictionProfileCountA": 28,
  "predictionProfileCountC": 28,
  "candidateCPromotion": false,
  "productionBaselineA": true,
  "p2kH": "NOT_AUTHORIZED"
}
```
