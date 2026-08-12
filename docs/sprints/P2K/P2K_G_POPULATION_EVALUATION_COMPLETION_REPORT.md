# P2K-G — Population Evaluation of Sealed Cohort Offline Replay Runs

**Status:** COMPLETED  
**Sprint id:** P2K-G  
**Roadmap citation:** Continues P2K after P2K-F (`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` § P2K-G). Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. Goal delivered

Population evaluation completed for **Baseline A** versus **Candidate C** using:

- the **same SEALED** Replay Cohort (P2K-E)
- the corresponding offline Replay Runs (P2K-F)
- Evaluation History **actual outcomes** (evaluation-only)

This is the first population-level validation stage for R1B Candidate C.  
It is **measurement / evidence only**.

## 2. Exact sealed cohort contract

Evaluation requires:

| Field | Rule |
| --- | --- |
| `cohortId` | Identical on cohort, Baseline run, Candidate run |
| `membershipDigestSha256` | Identical across cohort and both runs |
| Cohort status | `SEALED` |
| Replay Run schema | `sealed-cohort-offline-replay-run.p2k.f` |
| Baseline label | `r1b.candidate.a.baseline` |
| Candidate label | `r1b.candidate.c.sideAwareOpen` |
| Membership set | Every sealed member present in both runs; no orphans |
| Historical context | Equal for every paired success (`JSON` identity) |
| Outcomes | Loaded from Evaluation History only at evaluation time |

Any integrity failure → **FAIL CLOSED** (no partial mismatched cohort scoring).

## 3. Coverage accounting

`PopulationEvaluationCoverage` reports:

- total sealed members
- eligible replay members (sealed membership = P2K-C eligible by construction)
- successful A / successful C counts
- paired successful count
- failed A / failed C counts
- excluded count (paired successes with undefined A1 metrics)
- final evaluation sample size

**A and C metrics always use the same paired evaluation population.**

## 4. Metrics calculated

Reused existing definitions (no new scoring invented):

| Metric | Source |
| --- | --- |
| Match Result (Winner) accuracy + Home/Draw/Away breakdown | A1 `evaluatePrediction` / P2H `computeProjectionReplayMetrics` |
| Exact Score accuracy | A1 `scoreHit` |
| Goal Range accuracy | A1 `goalRangeHit` |
| BTTS accuracy | P2H BTTS definition |
| Over/Under accuracy | P2H O/U 2.5 definition |
| Brier Score | A2 `computePredictionCalibrationReport` |
| ECE | A2 `expectedCalibrationError` |
| Confidence–winner correlation | existing Pearson helper from P2H |

Comparison rows include Baseline A, Candidate C, delta **C − A**, hit counts where applicable, and sample size.

## 5. Unavailable metrics

When the final paired sample size is 0, accuracy/calibration rows are marked:

`availability: "not_available"` with an explicit reason.

Pearson correlation may also be `NOT AVAILABLE` when sample &lt; 2 or variance is zero.

No metric values are fabricated.

## 6. Persistence

Domain: `SealedCohortPopulationEvaluation` (`sealed-cohort-population-evaluation.p2k.g`)

Persists:

- `evaluationRunId`, `cohortId`, `membershipDigestSha256`
- Baseline / Candidate Replay Run ids and calibration labels
- metric comparisons, winner breakdown, coverage
- limitations, schema version, timestamps, checksum

Prisma: `PopulationEvaluationItem` / `population_evaluation_items`  
Migration: `20260812180000_p2k_g_population_evaluation`

## 7. Candidate C governance

- Candidate C remains **NON-DEFAULT**
- `candidateCProductionPromoted: false` on every evaluation artifact
- **No automatic promotion** occurred
- `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` / production Match Script **unchanged**
- No production prediction semantics changed

## 8. Statistical honesty / limitations

- Results are **descriptive performance** + coverage + calibration metrics
- Existing infrastructure does **not** support statistical significance or confidence intervals; reports state this explicitly
- Do not claim “Candidate C is better” from a single higher metric
- Failed members are coverage-only; they never create asymmetric A vs C metric populations
- Actual outcomes are never used for cohort membership, Sidecar selection, Match Script selection, or Replay generation

## 9. Implementation surface

- `@fas/statistics`: `computeSealedCohortPopulationEvaluation`, domain + repository ports, in-memory store
- `@fas/database`: `PrismaPopulationEvaluationRepository` + migration
- Tests: focused P2K-G unit/integration + Prisma persistence (when DB available)

## 10. Validation

Run from repo root (acceptance gates):

- `pnpm quality`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Regressions covered by existing suites plus P2K-G specs: P2K-C/D/E/F, R1B, P2J, A1, A2.

## 11. Next governance decision

Human review of population evidence for any Candidate C promotion gate.  
**P2K-G does not implement promotion.**  
Do not start P2K-H or later work from this report alone.

---

## Acceptance checklist

1. A and C evaluated on the SAME sealed cohort — yes  
2. Membership integrity verified — yes (fail closed)  
3. A/C replay results paired — yes  
4. Outcomes evaluation-only — yes  
5. Coverage explicit — yes  
6–11. Winner / Exact Score / Goal Range / BTTS / O/U / A2 calibration reused where supported — yes  
12–13. Missing metrics `NOT AVAILABLE` with reason; none fabricated — yes  
14–15. Candidate C not promoted; production Match Script unchanged — yes  
16–19. `pnpm quality` / `pnpm typecheck` / `pnpm test` / `pnpm build` — passed (2026-08-12)
