# P2K-E — Validation Sealed Replay Cohort (Projection V2 Recovery)

**Status:** COMPLETED  
**Sprint id:** P2K-E (live validation seal on P2K-G-RECOVERY v2 rows)  
**Date:** 2026-08-13  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-G-RECOVERY (`docs/sprints/P2K/P2K_G_RECOVERY_PROJECTION_V2_VALIDATION_DATA_BOOTSTRAP_COMPLETION_REPORT.md`). Reuses P2K-E primitives from `docs/sprints/P2K/P2K_E_SEALED_REPLAY_COHORT_COMPLETION_REPORT.md`.  
**Stop boundary:** New cohort selection + sealing only. **P2K-F / P2K-G / P2K-H not executed.**

---

## 1. Result

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.recovery.v2.analyzematch.v1` |
| status | **SEALED** |
| selected member count | **6** |
| namespace considered | **6** (`match-p2kg-recovery-v2-*`) |
| P2K-C `replayEligible` (namespace) | **6** |
| `offlineReplayExecutable` (namespace) | **6** |
| membershipDigestSha256 | `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439` |
| eligibility contract | `projection-replay-eligibility.p2k.c` |
| sidecar schema | `projection-replay-sidecar.p2k.b` |
| ordering | `historyId_asc` |
| PostgreSQL round-trip | **PASS** |
| SEALED immutability | **PASS** |
| Idempotent reseal | **PASS** |

### Selected members (deterministic `historyId_asc`)

| position | historyId | matchId |
| ---: | --- | --- |
| 0 | `eval-history:match-p2kg-recovery-v2-1:1d7c579c:ffb31e47` | `match-p2kg-recovery-v2-1` |
| 1 | `eval-history:match-p2kg-recovery-v2-2:47be3bd9:595aa351` | `match-p2kg-recovery-v2-2` |
| 2 | `eval-history:match-p2kg-recovery-v2-3:02dd458e:5f66a6e0` | `match-p2kg-recovery-v2-3` |
| 3 | `eval-history:match-p2kg-recovery-v2-4:9b7944b7:69df5c14` | `match-p2kg-recovery-v2-4` |
| 4 | `eval-history:match-p2kg-recovery-v2-5:7ed08122:054376cc` | `match-p2kg-recovery-v2-5` |
| 5 | `eval-history:match-p2kg-recovery-v2-6:53db7b2b:5e9048db` | `match-p2kg-recovery-v2-6` |

---

## 2. Selection gates (orchestration)

P2K-C architecture **unchanged**. Parameter provenance was **not** added to `replayComplete`.

New validation orchestration:

`createAndSealOfflineExecutableReplayCohort` (`@fas/analysis`)

Gates, in order:

1. Namespace: `matchId` starts with `match-p2kg-recovery-v2-`
2. Canonical P2K-C `assessProjectionReplayEligibility` → `replayEligible === true`
3. Sidecar schema pin
4. Independent `assessOfflineReplayExecutability` → `offlineReplayExecutable === true`

Then reuses:

- `selectReplayCohortMembers` (`historyId_asc`)
- `buildReplayCohort`
- `PrismaReplayCohortRepository.save` (SEALED)

---

## 3. Exclusions (live `fas_validation`)

| Metric | Count |
| --- | --- |
| Histories considered | 100 |
| Namespace (`match-p2kg-recovery-v2-*`) | 6 |
| Selected (SEALED members) | **6** |
| Excluded total | 94 |

| Reason | Count |
| --- | --- |
| `OUT_OF_NAMESPACE` | 94 |
| `NOT_P2K_C_REPLAY_ELIGIBLE` | 0 (inside namespace) |
| `NOT_OFFLINE_REPLAY_EXECUTABLE` | 0 (inside namespace) |

Old V1 bootstrap / fixture rows were excluded by namespace. They were **not** mutated.

---

## 4. Old V1 cohort untouched

| Check | Result |
| --- | --- |
| cohortId | `p2k.e.validation.bootstrap.analyzematch.v1` |
| status | still **SEALED** |
| membershipDigestSha256 | still `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` |
| member count | still 6 |
| reused as this cohort | **NO** |

---

## 5. What was not done

| Action | Status |
| --- | --- |
| History / Sidecar mutation | **No** |
| Old V1 cohort mutation / reuse | **No** |
| P2K-C contract change | **No** |
| Parameter pin folded into `replayComplete` | **No** |
| Production Match Script change | **No** (Baseline A) |
| Candidate C promotion | **No** (`productionPromoted = false`) |
| P2K-F Replay Run | **Not executed** |
| P2K-G population evaluation | **Not executed** |
| P2K-H | **NOT AUTHORIZED** |

---

## 6. Files

| File | Role |
| --- | --- |
| `packages/analysis/src/replay/create-and-seal-offline-executable-replay-cohort.ts` | Namespace + P2K-C + `offlineReplayExecutable` seal |
| `packages/analysis/test/offline-executable-sealed-cohort-p2k-e.spec.ts` | Namespace / gate / immutability tests |
| `docs/sprints/P2K/scripts/p2k-e-validation-seal-recovery-v2-cohort.mjs` | Live seal + round-trip / old-V1 checks |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-e-validation-seal-recovery-v2-cohort.mjs
```

---

## 7. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |

---

## 8. Concise answers

1. **New P2K-E succeeded?** **Yes** — SEALED cohort with 6 v2 recovery members.  
2. **Exact members?** `match-p2kg-recovery-v2-1` … `match-p2kg-recovery-v2-6` (historyIds above).  
3. **Old V1 cohort used?** **No** — untouched.  
4. **P2K-F started?** **No**.  
5. **Candidate C / Baseline A / P2K-H?** NON-DEFAULT / unchanged / not authorized.
