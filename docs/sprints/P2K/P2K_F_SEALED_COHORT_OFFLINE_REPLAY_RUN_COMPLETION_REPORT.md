# P2K-F — Sealed Cohort Offline Replay Run

**Status:** COMPLETED  
**Sprint id:** P2K-F  
**Roadmap citation:** Continues P2K after P2K-E (`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` § P2K-F). Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. Goal delivered

Execute deterministic **offline-only** Replay Runs for one immutable **SEALED** Replay Cohort under:

| Label | Role |
| --- | --- |
| `r1b.candidate.a.baseline` | Baseline A |
| `r1b.candidate.c.sideAwareOpen` | Candidate C (NON-DEFAULT) |

Produces an auditable measurement dataset for later population evaluation (**P2K-G**).  
Does **not** compute population metrics. Does **not** promote Candidate C.

## 2. Offline-only nature

- Orchestration: `executeSealedCohortOfflineReplayRun` / `executeSealedCohortOfflineReplayPair` in `@fas/analysis`
- Member replay: reuses P2K-D `runOfflineMatchScriptReplay` only
- No Provider refresh; no Evidence / Feature / Rule regeneration; no Sidecar fabrication
- Sealed cohort membership is never mutated

## 3. Cohort validation (fail closed)

Before execution:

1. Cohort exists  
2. `status === SEALED`  
3. Membership digest recomputed and matches sealed digest  
4. No duplicate `historyId` membership  
5. Explicit calibration label only (`A` or `C`)

Invalid cohort → explicit error codes (`COHORT_NOT_FOUND`, `COHORT_NOT_SEALED`, `MEMBERSHIP_DIGEST_MISMATCH`, `DUPLICATE_MEMBERSHIP`, `INVALID_CALIBRATION_LABEL`). Never silently rebuild/repair.

## 4. Same-context A/B invariant

For each sealed member, Baseline A and Candidate C share identical historical context identity (Sidecar checksum, features, rules, evidence refs, etc.).  
Only calibration label / offline parameter artifact / Match Script selection / projection output differ.  
`executeSealedCohortOfflineReplayPair` returns ordered pairs with `sameHistoricalContext`.

## 5. Replay Run model

`SealedCohortOfflineReplayRun` (`sealed-cohort-offline-replay-run.p2k.f`):

- `replayRunId`, `cohortId`, `membershipDigestSha256`
- `matchScriptCalibrationLabel`, `isProductionDefault`, `productionPromoted: false`
- ordered `results[]` (success | failure with reason codes)
- counts, timestamps, limitations

Persistence: Prisma `ReplayRunItem` / `replay_run_items` (full `runJson` + indexed pins).  
Migration: `20260812170000_p2k_f_sealed_cohort_offline_replay_run`.

## 6. Failure handling

Member failures are explicit (e.g. `MISSING_SIDECAR`, `INVALID_SIDECAR_HASH`, `UNSUPPORTED_SIDECAR_SCHEMA`, `INCOMPLETE_REPLAY_CONTEXT`, `MATCH_ID_MISMATCH`, `INVALID_PARAMETER_LABEL`, `MISSING_REQUIRED_REPLAY_ARTIFACT`, `REPLAY_NOT_ELIGIBLE`).  
Run status: `completed` | `completed_with_failures`. No silent skips.

## 7. Production safety

| Invariant | Status |
| --- | --- |
| `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` = Baseline A | Unchanged |
| Candidate C NON-DEFAULT / not population validated / not promoted | Unchanged |
| No implicit Candidate C fallback | Enforced |
| Offline-only | Enforced |

## 8. Explicit non-claims

P2K-F does **not** report Winner / Draw / Exact Score / Goal Range / BTTS / O-U accuracy, confidence calibration, Candidate C improvement, or promotion readiness.

## 9. Architecture Freeze v0.3

Unchanged. No new Engine / Provider / Feature / Rule / Football State dimension / Match Script production behavior / Projection / Poisson / Market→Probability.

## 10. Tests

- `packages/analysis/test/sealed-cohort-offline-replay-run-p2k-f.spec.ts`
- `packages/statistics/test/validate-sealed-cohort-for-offline-run-p2k-f.spec.ts`
- `packages/database/test/prisma-p2k-f-sealed-cohort-offline-replay-run.spec.ts`
- Regressions: P2K-C / P2K-D / P2K-E / R1B / P2J

## 11. Quality gates

| Gate | Status |
| --- | --- |
| `pnpm quality` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (one transient `@fas/web` 5s timeout under parallel turbo; PASS on retry) |
| `pnpm build` | PASS |
| PostgreSQL Replay Run persistence | PASS (migration + round-trip on `fas_validation`) |
| Scoped P2K-C/D/E/F + R1B + P2J | PASS |

## 12. Next step

**P2K-G — Population evaluation** on sealed cohort offline Replay Run results (still no automatic Candidate C promotion).

---

## Files touched

- `packages/statistics/src/domain/sealed-cohort-offline-replay-run.ts`
- `packages/statistics/src/replay/validate-sealed-cohort-for-offline-run.ts`
- `packages/statistics/src/repository/replay-run-repository.ts`
- `packages/statistics/src/repository/in-memory-replay-run-repository.ts`
- `packages/statistics/src/index.ts`
- `packages/statistics/test/validate-sealed-cohort-for-offline-run-p2k-f.spec.ts`
- `packages/analysis/src/replay/execute-sealed-cohort-offline-replay-run.ts`
- `packages/analysis/src/index.ts`
- `packages/analysis/test/sealed-cohort-offline-replay-run-p2k-f.spec.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260812170000_p2k_f_sealed_cohort_offline_replay_run/migration.sql`
- `packages/database/src/prisma-replay-run-repository.ts`
- `packages/database/src/client.ts`
- `packages/database/src/index.ts`
- `packages/database/test/prisma-p2k-f-sealed-cohort-offline-replay-run.spec.ts`
- `docs/sprints/P2K/P2K_F_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
