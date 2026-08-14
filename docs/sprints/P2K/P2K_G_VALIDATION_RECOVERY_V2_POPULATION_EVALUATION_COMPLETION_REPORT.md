# P2K-G — Validation Recovery V2 Population Evaluation

**Status:** COMPLETED  
**Sprint id:** P2K-G (live population evaluation on Recovery V2 validation dataset)  
**Date:** 2026-08-14  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-F Recovery V2 (`docs/sprints/P2K/P2K_F_VALIDATION_RECOVERY_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`). Reuses P2K-G primitives from `docs/sprints/P2K/P2K_G_POPULATION_EVALUATION_COMPLETION_REPORT.md`.  
**Stop boundary:** Population Evaluation only. **P2K-H NOT AUTHORIZED. No Candidate C promotion.**

---

## A. Implementation correctness

Reused existing:

- `computeSealedCohortPopulationEvaluation` (`@fas/statistics`)
- `PrismaPopulationEvaluationRepository` → `population_evaluation_items`

Fail-closed gates verified on live inputs:

| Gate | Result |
| --- | --- |
| cohort exists + `SEALED` | PASS |
| membershipDigestSha256 match | PASS |
| A/C Replay Run schema `sealed-cohort-offline-replay-run.p2k.f` | PASS |
| A label `r1b.candidate.a.baseline` / C label `r1b.candidate.c.sideAwareOpen` | PASS |
| `productionPromoted === false` on both runs | PASS |
| Replay Run member sets == sealed cohort | PASS |
| paired success `historicalReplayContext` JSON identity | PASS (via P2K-F; consumed unchanged) |
| actualResult from Evaluation History only | PASS |

Minimal scoped defect fixes (no metric redesign):

1. **winnerBreakdown zero-subgroup:** `availableMetric(hits, 0)` now returns `not_available` with explicit reason instead of `availability=available` + `value=undefined`.
2. **Prisma idempotent save:** `sameEvaluation` compares durable checksum/ids (Postgres JSON omits `undefined` keys and may reorder keys).

Did **not**:

- regenerate History / Sidecar / Replay Runs
- reseal or mutate cohort membership
- change P2K-C / P2K-D / Projection / Match Script production parameters
- Provider refresh / Evidence / Feature / Rule regeneration

---

## B. Live 6-member population measurement

### Inputs (pre-existing, untouched)

| Artifact | Id |
| --- | --- |
| SEALED cohort | `p2k.e.validation.recovery.v2.analyzematch.v1` |
| membershipDigestSha256 | `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439` |
| Baseline A Replay Run | `run.p2k.f.validation.recovery.v2.analyzematch.v1.a` (6/0) |
| Candidate C Replay Run | `run.p2k.f.validation.recovery.v2.analyzematch.v1.c` (6/0) |

### Evaluation artifact

| Field | Value |
| --- | --- |
| evaluationRunId | `eval.p2k.g.validation.recovery.v2.analyzematch.v1` |
| schemaVersion | `sealed-cohort-population-evaluation.p2k.g` |
| checksum | `99d13ed765ae26e4e75490927c71046e27166a489c12fa95ca319104edfef833` |
| PostgreSQL round-trip | **PASS** |
| createdAt | `2026-08-14T03:00:00.000Z` |

### Coverage

| Metric | Value |
| --- | --- |
| totalSealedMembers | 6 |
| eligibleReplayMembers | 6 |
| successfulBaselineReplayCount | 6 |
| successfulCandidateReplayCount | 6 |
| pairedSuccessfulCount | 6 |
| failedBaselineCount | 0 |
| failedCandidateCount | 0 |
| excludedCount | 0 |
| finalEvaluationSampleSize | **6** |

### Metrics (A / C / Δ C−A)

| Metric | A | C | Δ C−A |
| --- | ---: | ---: | ---: |
| Match Result accuracy | 0.5 (3/6) | 0.5 (3/6) | 0 |
| Exact Score accuracy | 0 (0/6) | 0 (0/6) | 0 |
| Goal Range accuracy | 0 (0/6) | 0 (0/6) | 0 |
| BTTS accuracy | 0.5 (3/6) | 0.5 (3/6) | 0 |
| Over/Under 2.5 accuracy | 0.5 (3/6) | 0.5 (3/6) | 0 |
| Brier Score | 0.638058 | 0.637567 | −0.000491 |
| ECE | 0.223079 | 0.220846 | −0.002233 |
| Confidence–Winner correlation | 0.369616 | 0.369616 | 0 |

### Winner breakdown (actual outcome subgroups)

| Subgroup | n | A | C | Δ |
| --- | ---: | ---: | ---: | ---: |
| actual Home | 3 | 1.0 (3/3) | 1.0 (3/3) | 0 |
| actual Draw | 2 | 0.0 (0/2) | 0.0 (0/2) | 0 |
| actual Away | 1 | 0.0 (0/1) | 0.0 (0/1) | 0 |

### Calibration qualification

A2 calibration sample is **below the qualified threshold**; Brier/ECE are **directional only** (recorded in evaluation `limitations`).

---

## C. Statistical limitations

- Cohort size **n = 6** only.
- Results are **descriptive validation evidence**, not inferential statistics.
- **No statistical significance** claim.
- **No confidence intervals**.
- Tiny Brier/ECE deltas **must not** be interpreted as Candidate C superiority.
- Exact Score / Goal Range both 0/6 for A and C on this sealed set.

---

## D. Governance / promotion status

| Invariant | Status |
| --- | --- |
| Candidate C `productionPromoted` | **false** |
| Production Match Script = Baseline A | **unchanged** |
| `candidateCProductionPromoted` on evaluation | **false** |
| `statisticalSignificanceSupported` | **false** |
| “Candidate C better” claim | **NOT MADE** |
| Old V1 cohort / fail-closed runs | **untouched** |
| P2K-H | **NOT AUTHORIZED** |
| Architecture Freeze v0.3 | **unchanged** |

---

## Files

| File | Role |
| --- | --- |
| `packages/statistics/src/evaluation/compute-sealed-cohort-population-evaluation.ts` | zero-subgroup `not_available` fix |
| `packages/statistics/test/sealed-cohort-population-evaluation-p2k-g.spec.ts` | home-only subgroup regression |
| `packages/database/src/prisma-population-evaluation-repository.ts` | checksum-based idempotent save |
| `docs/sprints/P2K/scripts/p2k-g-validation-recovery-v2-population-evaluation.mjs` | live Recovery V2 consumer (no P2K-F re-run) |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-g-validation-recovery-v2-population-evaluation.mjs
```

---

## Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Focused P2K-G statistics + database tests | **PASS** |
| Live `fas_validation` population evaluation | **PASS** |

---

## Machine-readable summary

```json
{
  "aSuccess": 6,
  "aFailure": 0,
  "cSuccess": 6,
  "cFailure": 0,
  "pairedSample": 6,
  "winnerAccuracyA": 0.5,
  "winnerAccuracyC": 0.5,
  "winnerDelta": 0,
  "exactScoreA": 0,
  "exactScoreC": 0,
  "exactScoreDelta": 0,
  "goalRangeA": 0,
  "goalRangeC": 0,
  "goalRangeDelta": 0,
  "bttsA": 0.5,
  "bttsC": 0.5,
  "bttsDelta": 0,
  "ouA": 0.5,
  "ouC": 0.5,
  "ouDelta": 0,
  "brierA": 0.638058,
  "brierC": 0.637567,
  "brierDelta": -0.000491,
  "eceA": 0.223079,
  "eceC": 0.220846,
  "eceDelta": -0.002233,
  "confidenceCorrA": 0.369616,
  "confidenceCorrC": 0.369616,
  "confidenceCorrDelta": 0,
  "candidateCPromotion": false,
  "productionBaselineA": true,
  "p2kH": "NOT_AUTHORIZED"
}
```
