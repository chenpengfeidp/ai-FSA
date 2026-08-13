# P2K-G-RECOVERY — Projection V2 Validation Data Bootstrap

**Status:** COMPLETED  
**Slice id:** P2K-G-RECOVERY  
**Date:** 2026-08-13  
**Architecture Freeze:** v0.3 (unchanged)  
**Stop boundary:** Inventory only. **No new SEALED cohort. No P2K-E/F/G population. No P2K-H.**

---

## 1. Goal

Generate **new** AnalyzeMatch History + Sidecar rows with `projectionPolicyPin = "v2"` so Sidecars persist real Projection parameter provenance required by P2K-D/F, without mutating the failed v1 bootstrap rows or the existing SEALED cohort.

---

## 2. Results (live `fas_validation`)

| Metric | Value |
| --- | --- |
| New History | **6** |
| New Sidecar | **6** |
| Namespace | `match-p2kg-recovery-v2-1` … `match-p2kg-recovery-v2-6` |
| `projectionPolicyPin` | **v2** |
| All RuleIds catalog-valid | **YES** |
| PASS score == weight | **YES** |
| Parameter provenance complete | **6 / 6** |
| P2K-C `replayComplete` | **6** |
| P2K-C `outcomeEvaluable` | **6** |
| P2K-C `replayEligible` | **6** |
| Offline RuleResult-rebuildable | **6** |
| `offlineReplayExecutable` | **6** |
| Offline A smoke (`runOfflineMatchScriptReplay` Baseline A) | **6 / 6 ok** |
| Ready for new sealed cohort | **YES** |
| Cohort auto-created | **NO** |
| P2K-E / F / G population / H | **NOT executed** |

### Parameter provenance (all 6 identical active artifact)

| Field | Value |
| --- | --- |
| parameterVersionLabel | `projection.v3.replay` |
| parameterArtifactId | `projectionParams:v3.1:matchScript` |
| parameterArtifactChecksum | `d7b2f4fd` |

### New History IDs

| matchId | historyId |
| --- | --- |
| match-p2kg-recovery-v2-1 | `eval-history:match-p2kg-recovery-v2-1:1d7c579c:ffb31e47` |
| match-p2kg-recovery-v2-2 | `eval-history:match-p2kg-recovery-v2-2:47be3bd9:595aa351` |
| match-p2kg-recovery-v2-3 | `eval-history:match-p2kg-recovery-v2-3:02dd458e:5f66a6e0` |
| match-p2kg-recovery-v2-4 | `eval-history:match-p2kg-recovery-v2-4:9b7944b7:69df5c14` |
| match-p2kg-recovery-v2-5 | `eval-history:match-p2kg-recovery-v2-5:7ed08122:054376cc` |
| match-p2kg-recovery-v2-6 | `eval-history:match-p2kg-recovery-v2-6:53db7b2b:5e9048db` |

---

## 3. Old v1 data untouched

| Check | Result |
| --- | --- |
| `match-example-*` History count | unchanged (6) |
| SEALED cohort `p2k.e.validation.bootstrap.analyzematch.v1` | still **SEALED** |
| membershipDigestSha256 | unchanged `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` |
| Cohort members | still 6 (old v1 rows) |
| No rewrite of v1 Sidecars | **confirmed** |

---

## 4. Diagnostic: `replayComplete` ≠ `offlineReplayExecutable`

Added **without changing P2K-C**:

`assessOfflineReplayExecutability` (`@fas/analysis`)

| Signal | Meaning |
| --- | --- |
| P2K-C `replayComplete` / `replayEligible` | Presence + hash + sealed context completeness (parameter pin optional / informational) |
| `offlineReplayExecutable` | P2K-D/F ready: P2K-C complete **and** parameter provenance complete/registry-known **and** RuleResult rebuildable |

This explains why the prior v1 bootstrap sealed cohort failed P2K-F (`PARAMETER_PROVENANCE_MISSING`) while remaining P2K-C eligible.

---

## 5. Implementation

| Artifact | Role |
| --- | --- |
| `packages/report/src/validation/bootstrap-projection-v2-validation-history-sidecar.ts` | V2 AnalyzeMatch bootstrap (`projectionPolicyPin: "v2"`) |
| `packages/analysis/src/replay/assess-offline-replay-executability.ts` | Offline executability diagnostic |
| `packages/report/test/bootstrap-projection-v2-validation-history-sidecar.spec.ts` | Bootstrap path tests |
| `packages/analysis/test/offline-replay-executability-p2k-g-recovery.spec.ts` | Completeness vs executability tests |
| `docs/sprints/P2K/scripts/p2k-g-recovery-projection-v2-bootstrap.mjs` | Live bootstrap + inventory |

Hard boundaries held: no Engine/Provider/Feature/Rule; no Projection/Poisson/Match Script production change; no Candidate C promotion; no fabricate pins; no auto cohort.

---

## 6. Governance

| Item | Status |
| --- | --- |
| Candidate C NON-DEFAULT / `productionPromoted` | **false** |
| Production Baseline A | **unchanged** |
| Architecture Freeze v0.3 | **unchanged** |
| P2K-G population evaluation | **NOT started** |
| P2K-H | **NOT AUTHORIZED** |

---

## 7. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** (recorded below) |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |

---

## 8. Next authorized step (not executed)

Create a **new** P2K-E SEALED cohort from `match-p2kg-recovery-v2-*` members (offline-rebuildable + offlineReplayExecutable), then re-run P2K-F A/C. Do **not** reuse the old v1 cohort for offline replay.
