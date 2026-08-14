# P2K-F — Validation Recovery V2 Sealed Cohort Offline Replay Run

**Status:** COMPLETED  
**Sprint id:** P2K-F (live A/C offline replay on P2K-E recovery v2 SEALED cohort)  
**Date:** 2026-08-13  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-E Recovery V2 seal (`docs/sprints/P2K/P2K_E_VALIDATION_RECOVERY_V2_SEALED_COHORT_COMPLETION_REPORT.md`). Reuses P2K-F primitives from `docs/sprints/P2K/P2K_F_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`.  
**Stop boundary:** Replay Runs only. **P2K-G / P2K-H not executed. No population metrics.**

This is a **measurement dataset**. A/C success does **not** mean Candidate C is better.

---

## 1. Cohort under test (unchanged)

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.recovery.v2.analyzematch.v1` |
| status | **SEALED** (not mutated; P2K-E not re-executed) |
| member count | **6** |
| membershipDigestSha256 | `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439` |
| digest recompute | **PASS** |
| duplicate historyId | **none** |
| exact members | **PASS** |

| position | historyId | matchId |
| ---: | --- | --- |
| 0 | `eval-history:match-p2kg-recovery-v2-1:1d7c579c:ffb31e47` | `match-p2kg-recovery-v2-1` |
| 1 | `eval-history:match-p2kg-recovery-v2-2:47be3bd9:595aa351` | `match-p2kg-recovery-v2-2` |
| 2 | `eval-history:match-p2kg-recovery-v2-3:02dd458e:5f66a6e0` | `match-p2kg-recovery-v2-3` |
| 3 | `eval-history:match-p2kg-recovery-v2-4:9b7944b7:69df5c14` | `match-p2kg-recovery-v2-4` |
| 4 | `eval-history:match-p2kg-recovery-v2-5:7ed08122:054376cc` | `match-p2kg-recovery-v2-5` |
| 5 | `eval-history:match-p2kg-recovery-v2-6:53db7b2b:5e9048db` | `match-p2kg-recovery-v2-6` |

---

## 2. Replay Runs

| Role | replayRunId | label | isProductionDefault | productionPromoted | status | success | failure |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Baseline A | `run.p2k.f.validation.recovery.v2.analyzematch.v1.a` | `r1b.candidate.a.baseline` | true | **false** | `completed` | **6** | **0** |
| Candidate C | `run.p2k.f.validation.recovery.v2.analyzematch.v1.c` | `r1b.candidate.c.sideAwareOpen` | false | **false** | `completed` | **6** | **0** |

| Field | Result |
| --- | --- |
| schemaVersion | `sealed-cohort-offline-replay-run.p2k.f` |
| pairedSuccessfulCount | **6** |
| sameHistoricalContext | **6/6 PASS** |
| identity (historyId / matchId / Sidecar checksum / featureModelVersion / featureBundleChecksum / evidenceRefs / features / rules / historical parameter provenance) | **6/6 PASS** |
| A/C labels differ | **PASS** |
| A/C offline parameter artifacts differ | **PASS** |
| member failure reasonCodes | **none** |
| PostgreSQL round-trip | **PASS** |

Historical Sidecar parameter pin (shared A/C context):

| Field | Value |
| --- | --- |
| parameterVersionLabel | `projection.v3.replay` |
| parameterArtifactId | `projectionParams:v3.1:matchScript` |
| parameterArtifactChecksum | `d7b2f4fd` |

Offline override artifacts (A vs C, expected to differ):

| Role | offlineParameterArtifactId | checksum |
| --- | --- | --- |
| Baseline A | `offline.p2k.d:projectionParams:v3.1:matchScript:r1b.candidate.a.baseline` | `d7b2f4fd` |
| Candidate C | `offline.p2k.d:projectionParams:v3.1:matchScript:r1b.candidate.c.sideAwareOpen` | `47eef144` |

---

## 3. Orchestration

Reused existing:

- `validateSealedCohortForOfflineRun`
- `executeSealedCohortOfflineReplayRun`
- `executeSealedCohortOfflineReplayPair` → P2K-D `runOfflineMatchScriptReplay`

Did **not**:

- recreate or reseal the cohort
- modify History / Sidecar / membership
- weaken replay validation
- fabricate parameter provenance or RuleResult
- Provider / Evidence / Feature / Rule regeneration
- fallback calibration labels

---

## 4. Old V1 artifacts untouched

| Check | Result |
| --- | --- |
| cohort `p2k.e.validation.bootstrap.analyzematch.v1` | still **SEALED** |
| digest | still `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` |
| prior fail-closed A/C runs | **untouched** |

---

## 5. Governance / non-claims

| Invariant | Status |
| --- | --- |
| Candidate C `productionPromoted` | **false** |
| Production `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` = Baseline A | **unchanged** |
| Winner / Exact Score / Goal Range / BTTS / O/U / Brier / ECE / confidence correlation | **Not computed** |
| “Candidate C better” | **Not claimed** |
| P2K-E re-executed | **No** |
| P2K-G | **Not executed** |
| P2K-H | **NOT AUTHORIZED** |
| Architecture Freeze v0.3 | **unchanged** |

---

## 6. Files

| File | Role |
| --- | --- |
| `docs/sprints/P2K/scripts/p2k-f-validation-recovery-v2-offline-replay-run.mjs` | Live A/C pair runner + identity / old-V1 checks |
| Existing `@fas/analysis` `executeSealedCohortOfflineReplayPair` | Reused; not weakened |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-f-validation-recovery-v2-offline-replay-run.mjs
```

---

## 7. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Scoped P2K-F / P2K-E / P2K-G-RECOVERY / R1B / P2J | **PASS** |

---

## 8. Concise answers

1. **cohortId:** `p2k.e.validation.recovery.v2.analyzematch.v1`  
2. **status:** SEALED  
3. **membership digest:** `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439`  
4. **member count:** 6  
5. **Baseline A replayRunId:** `run.p2k.f.validation.recovery.v2.analyzematch.v1.a`  
6. **Candidate C replayRunId:** `run.p2k.f.validation.recovery.v2.analyzematch.v1.c`  
7. **A success / failure:** **6 / 0**  
8. **C success / failure:** **6 / 0**  
9. **pairedSuccessfulCount:** **6**  
10. **sameHistoricalContext:** **all PASS**  
11. **failure reasonCodes:** **none**  
12. **PostgreSQL round-trip:** **PASS**  
13. **Candidate C productionPromoted:** **false**  
14. **Production Match Script:** **unchanged (Baseline A)**  
15. **P2K-G executed:** **No**  
16. **P2K-H executed:** **No**  
17. **quality / typecheck / test / build:** **PASS**
