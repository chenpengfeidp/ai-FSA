# P2K-F — Validation Sealed Cohort Offline Replay Run

**Status:** FAIL CLOSED (executed; zero successful member replays)  
**Sprint id:** P2K-F (live validation on SEALED bootstrap cohort)  
**Date:** 2026-08-13  
**Architecture Freeze:** v0.3 (unchanged)  
**Stop boundary:** Replay Runs only. **P2K-G / P2K-H not executed. No population metrics.**

---

## 1. Cohort under test

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.bootstrap.analyzematch.v1` |
| status | **SEALED** (unchanged; not mutated) |
| member count | **6** |
| membershipDigestSha256 | `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` |
| digest recompute | **PASS** |
| duplicate historyId | **none** |

Members remain `match-example-1` … `match-example-6` as sealed in P2K-E.

---

## 2. Replay Runs executed

| Role | replayRunId | label | status | success | failure |
| --- | --- | --- | ---: | ---: | ---: |
| Baseline A | `run.p2k.f.validation.bootstrap.analyzematch.v1.a` | `r1b.candidate.a.baseline` | `completed_with_failures` | **0** | **6** |
| Candidate C | `run.p2k.f.validation.bootstrap.analyzematch.v1.c` | `r1b.candidate.c.sideAwareOpen` | `completed_with_failures` | **0** | **6** |

| Field | A | C |
| --- | --- | --- |
| isProductionDefault | true | false |
| productionPromoted | **false** | **false** |
| PostgreSQL persisted + reloaded | **PASS** | **PASS** |

Paired relationship via `executeSealedCohortOfflineReplayPair`: **created**.  
Paired success count (`both success ∧ sameHistoricalContext`): **0**.

---

## 3. Member failure (all 6 × A and C)

| reasonCode | message |
| --- | --- |
| `MISSING_REQUIRED_REPLAY_ARTIFACT` | Sealed Projection Replay Sidecar is missing a pinned `parameterVersionLabel`. |

Observed on every sealed member for both A and C.

Live Sidecar context for bootstrap rows contains only:

`matchId`, `featureModelVersion`, `featureBundleChecksum`, `featureBundleStatus`, `evidenceRefs`, `features`, `rules`, `requiredEvidencePresentCount`, `generatedAt`

**Absent:** `parameterVersionLabel`, `parameterArtifactId`, `parameterArtifactChecksum`.

---

## 4. Root cause (fail closed — no repair)

1. Validation Data Bootstrap composed `AnalyzeMatchUseCase` with default `projectionPolicyPin`.
2. `DEFAULT_PROJECTION_POLICY_PIN = "v1"`.
3. Projection **v1** path does **not** emit `projectionFramework`.
4. `buildProjectionReplayContext` therefore omitted parameter provenance from Sidecars.
5. P2K-C still marks rows `replayEligible` (`PARAMETER_ARTIFACT_UNPINNED` is informational).
6. P2K-E offline-rebuildable gate checked RuleResult catalog rebuild only — not parameter pin.
7. P2K-D / P2K-F offline replay **requires** pinned `parameterVersionLabel` → fail closed.

**Not done (forbidden by this sprint):**

- UPDATE / fabricate Sidecars  
- Provider / Evidence / Feature / Rule regeneration  
- Re-AnalyzeMatch of sealed members  
- Weakening offline replay validation  
- Cohort membership mutation  

---

## 5. A/C paired invariants

| Check | Result |
| --- | --- |
| Explicit labels A vs C | **PASS** (labels set correctly on runs) |
| No empty / unknown / fallback labels | **PASS** |
| sameHistoricalContext on successful pairs | **N/A** (zero successes) |
| A/C offline parameter artifacts differ | **N/A** (zero successes) |
| Historical context identity mismatch failures | **none** (no success pairs to compare) |

---

## 6. Governance / non-claims

| Invariant | Status |
| --- | --- |
| Candidate C `productionPromoted` | **false** |
| Production `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` = Baseline A | **unchanged** |
| Provider refresh | **No** |
| Evidence / Feature / Rule regeneration | **No** |
| History / Sidecar / cohort mutation | **No** |
| Population metrics / Winner / Brier / ECE / etc. | **Not computed** |
| P2K-G | **Not started** |
| P2K-H | **NOT AUTHORIZED** |

---

## 7. Required next step (outside P2K-F)

To obtain a successful P2K-F dataset, separately authorize **new** AnalyzeMatch-generated History+Sidecar rows that pin Projection **v2** parameter provenance (`parameterVersionLabel` present), then seal a **new** cohort. Do **not** rewrite the existing 6 Sidecars.

Suggested bootstrap fix (future task only): compose AnalyzeMatch with `projectionPolicyPin: "v2"` (production composition path), write **new** matchIds / seals, re-run P2K-E → P2K-F.

---

## 8. Files

| File | Role |
| --- | --- |
| `docs/sprints/P2K/scripts/p2k-f-validation-offline-replay-run.mjs` | Live A/C pair runner + validations |
| Existing `@fas/analysis` `executeSealedCohortOfflineReplayPair` | Reused; not weakened |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-f-validation-offline-replay-run.mjs
```

---

## 9. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| P2K-F scoped tests (analysis / statistics / database) | **PASS** |

---

## 10. Concise answers

1. **P2K-F successful member replays?** **No** — 0/6 A, 0/6 C.  
2. **Runs persisted?** **Yes** (fail-closed `completed_with_failures`).  
3. **Why?** Sidecars lack pinned `parameterVersionLabel` (bootstrap used Projection v1 defaults).  
4. **Cohort mutated?** **No**.  
5. **Candidate C promoted?** **No**.  
6. **P2K-G / metrics?** **Not started / not computed**.  
7. **P2K-H?** **Not authorized**.
