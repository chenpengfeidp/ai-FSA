# P2K-E — Validation Sealed Replay Cohort (Bootstrap Population)

**Status:** COMPLETED  
**Sprint id:** P2K-E (live validation seal on AnalyzeMatch bootstrap rows)  
**Date:** 2026-08-12  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after Validation Data Bootstrap; reuses P2K-E primitives from `docs/sprints/P2K/P2K_E_SEALED_REPLAY_COHORT_COMPLETION_REPORT.md`.  
**Stop boundary:** Cohort selection + sealing only. **P2K-F / P2K-G / P2K-H not executed.**

---

## 1. Result

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.bootstrap.analyzematch.v1` |
| status | **SEALED** |
| selected member count | **6** |
| membershipDigestSha256 | `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` |
| eligibility contract | `projection-replay-eligibility.p2k.c` |
| sidecar schema | `projection-replay-sidecar.p2k.b` |
| ordering | `historyId_asc` |
| PostgreSQL round-trip | **PASS** |
| SEALED immutability | **PASS** |
| Idempotent reseal | **PASS** |

### Selected members (deterministic `historyId_asc`)

| position | historyId | matchId |
| ---: | --- | --- |
| 0 | `eval-history:match-example-1:48efeee9:8bd904bf` | `match-example-1` |
| 1 | `eval-history:match-example-2:ce42db84:1173f903` | `match-example-2` |
| 2 | `eval-history:match-example-3:162ffbcc:df686fb0` | `match-example-3` |
| 3 | `eval-history:match-example-4:bb4f4d8a:cb991bfd` | `match-example-4` |
| 4 | `eval-history:match-example-5:bae4159e:e371e7c8` | `match-example-5` |
| 5 | `eval-history:match-example-6:6f2d26be:53771f4e` | `match-example-6` |

Membership fields persisted per member: `cohortId`, `historyId`, `matchId`, `position`, plus cohort-level `membershipDigestSha256`, `eligibilityContractVersion`, `sidecarSchemaVersion`.

---

## 2. Selection gate (orchestration)

P2K-C alone (`createAndSealReplayCohort` over full DB) would admit **all** P2K-C `replayEligible` rows, including invalid fixture Sidecars (`rule-1` / `rule-p2k` / `feature.v2.test`).

**P2K-C architecture was not changed.**

Validation orchestration added:

`createAndSealOfflineRebuildableReplayCohort` (`@fas/analysis`)

Gate:

1. P2K-C `assessProjectionReplayEligibility` → `replayEligible === true`
2. Sidecar schema pin match
3. **Additional:** `assessSealedReplayRuleRebuild` → offline RuleResult-rebuildable

Then reuses:

- `selectReplayCohortMembers`
- `buildReplayCohort`
- `PrismaReplayCohortRepository.save` (SEALED)

---

## 3. Exclusions (live `fas_validation`)

| Metric | Count |
| --- | --- |
| Histories considered | 80 |
| Selected (SEALED members) | **6** |
| Excluded total | 74 |
| Excluded fixture (P2K-C eligible, not rebuildable) | **52** |
| Missing Sidecar | 22 |

### Exclusion reasons

| Reason | Count |
| --- | --- |
| `OFFLINE_RULE_RESULT_NOT_REBUILDABLE` | 52 |
| `MISSING_SIDECAR` | 22 |

Fixture rows with `rule-1` / `rule-p2k` / `feature.v2.test` were **not** mutated and **not** admitted. History/Sidecar rows unchanged.

---

## 4. What was not done

| Action | Status |
| --- | --- |
| Provider / Evidence / Feature / Rule regeneration | **No** |
| History / Sidecar mutation or fabrication | **No** |
| Production Match Script change | **No** (Baseline A) |
| Projection / Poisson change | **No** |
| Candidate C promotion | **No** (`productionPromoted = false`) |
| P2K-F Replay Run | **Not executed** |
| P2K-G population evaluation | **Not executed** |
| P2K-H | **NOT AUTHORIZED** |

---

## 5. Files

| File | Role |
| --- | --- |
| `packages/analysis/src/replay/create-and-seal-offline-rebuildable-replay-cohort.ts` | Validation orchestration + exclusion inventory |
| `packages/analysis/test/offline-rebuildable-sealed-cohort-p2k-e.spec.ts` | Fixture exclusion + immutability tests |
| `docs/sprints/P2K/scripts/p2k-e-validation-seal-cohort.mjs` | Live seal + round-trip / immutability checks |

### Live command

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-e-validation-seal-cohort.mjs
```

---

## 6. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |

---

## 7. Concise answers

1. **P2K-E succeeded?** **Yes** — SEALED cohort with 6 AnalyzeMatch-generated members.  
2. **Exact members?** `match-example-1` … `match-example-6` (historyIds above).  
3. **Fixtures included?** **No** — 52 excluded as `OFFLINE_RULE_RESULT_NOT_REBUILDABLE`.  
4. **P2K-F started?** **No**.  
5. **Candidate C / Baseline A / P2K-H?** NON-DEFAULT / unchanged / not authorized.
