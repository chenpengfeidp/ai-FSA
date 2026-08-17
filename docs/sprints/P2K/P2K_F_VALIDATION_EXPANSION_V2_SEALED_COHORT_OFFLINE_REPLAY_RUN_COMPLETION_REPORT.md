# P2K-F — Validation Expansion V2 Sealed Cohort Offline Replay Run

**Status:** COMPLETED  
**Sprint id:** P2K-F (live A/C offline replay on P2K-E expansion v2 SEALED cohort)  
**Date:** 2026-08-16  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-E Expansion V2 seal (`docs/sprints/P2K/P2K_E_VALIDATION_EXPANSION_V2_SEALED_COHORT_COMPLETION_REPORT.md`). Reuses P2K-F primitives from `docs/sprints/P2K/P2K_F_VALIDATION_RECOVERY_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md` and P2K-D `runOfflineMatchScriptReplay`.  
**Stop boundary:** Replay Runs only. **P2K-G / P2K-H not executed. No population metrics.**

This is a **measurement dataset**. A/C success does **not** mean Candidate C is better.

---

## 1. Cohort under test (unchanged)

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| status | **SEALED** (not mutated; P2K-E not re-executed) |
| member count | **30** |
| membershipDigestSha256 | `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997` |
| digest recompute | **PASS** |
| duplicate historyId | **none** |
| exact members | **PASS** |

Exact 30 members (deterministic `historyId_asc`; see P2K-E report §1): `eval-history:match-p2kg-expansion-v2-10:a53e2628:5a2e3623` … `eval-history:match-p2kg-expansion-v2-9:dc0ae568:005df279`.

---

## 2. Replay Runs

| Role | replayRunId | label | isProductionDefault | productionPromoted | status | success | failure |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Baseline A | `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` | `r1b.candidate.a.baseline` | true | **false** | `completed` | **30** | **0** |
| Candidate C | `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` | `r1b.candidate.c.sideAwareOpen` | false | **false** | `completed` | **30** | **0** |

| Field | Result |
| --- | --- |
| schemaVersion | `sealed-cohort-offline-replay-run.p2k.f` |
| pairedSuccessfulCount | **30** |
| sameHistoricalContext | **30/30 PASS** |
| identity (historyId / matchId / Sidecar checksum / featureModelVersion / featureBundleChecksum / evidenceRefs / features / rules / historical parameter provenance) | **30/30 PASS** |
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

Reused existing (no new engine code):

- `validateSealedCohortForOfflineRun`
- `executeSealedCohortOfflineReplayPair` → P2K-D `runOfflineMatchScriptReplay`

Did **not**:

- recreate or reseal the cohort
- modify History / Sidecar / membership
- weaken replay validation
- fabricate parameter provenance or RuleResult
- Provider / Evidence / Feature / Rule regeneration
- fallback calibration labels
- compute population metrics

---

## 4. Old artifacts untouched

| Check | v1 cohort | recovery-v2 cohort |
| --- | --- | --- |
| cohort id | `p2k.e.validation.bootstrap.analyzematch.v1` | `p2k.e.validation.recovery.v2.analyzematch.v1` |
| status | still **SEALED** | still **SEALED** |
| digest | `abdd11ec…` unchanged | `3b707860…` unchanged |
| member count | still 6 | still 6 |
| prior A/C runs | untouched (`run.p2k.f.validation.bootstrap.analyzematch.v1.a/.c`) | untouched (`run.p2k.f.validation.recovery.v2.analyzematch.v1.a/.c`) |

Current cohort itself: digest / status / member count unchanged after the run.

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
| `docs/sprints/P2K/scripts/p2k-f-validation-expansion-v2-offline-replay-run.mjs` | Live A/C pair runner + identity / old-cohort checks |
| Existing `@fas/analysis` `executeSealedCohortOfflineReplayPair` | Reused; not weakened |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-f-validation-expansion-v2-offline-replay-run.mjs
```

---

## 7. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Live `fas_validation` A/C replay + all checks | **PASS** (exit 0) |

(No package code changed in this sprint — only a new live orchestration script and this report; gates re-verified.)

---

## 8. Concise answers

1. **cohortId:** `p2k.e.validation.expansion.v2.analyzematch.v1`
2. **status:** SEALED
3. **member count:** 30
4. **membership digest:** `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997`
5. **Baseline A replayRunId:** `run.p2k.f.validation.expansion.v2.analyzematch.v1.a`
6. **Candidate C replayRunId:** `run.p2k.f.validation.expansion.v2.analyzematch.v1.c`
7. **A success / failure:** **30 / 0**
8. **C success / failure:** **30 / 0**
9. **pairedSuccessfulCount:** **30**
10. **sameHistoricalContext:** **all PASS**
11. **identity:** **all PASS**
12. **A/C offline parameter artifacts differ:** **PASS**
13. **failure reasonCodes:** **none**
14. **PostgreSQL round-trip:** **PASS**
15. **Candidate C productionPromoted:** **false**
16. **Production Match Script:** **unchanged (Baseline A)**
17. **P2K-G executed:** **No**
18. **P2K-H executed:** **No**
19. **quality / typecheck / test / build:** **PASS**
