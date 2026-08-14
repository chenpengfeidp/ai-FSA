# P2K-E — Validation Expansion V2 Sealed Replay Cohort

**Status:** COMPLETED  
**Sprint id:** P2K-E (live validation seal on P2K-G2-A expansion rows)  
**Date:** 2026-08-16  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K after P2K-G2-A (`docs/sprints/P2K/P2K_G2_A_VALIDATION_DATA_EXPANSION_COMPLETION_REPORT.md`). Reuses P2K-E primitives from `docs/sprints/P2K/P2K_E_VALIDATION_RECOVERY_V2_SEALED_COHORT_COMPLETION_REPORT.md`; P2K-G2 planning (`docs/sprints/P2K/P2K_G2_VALIDATION_DATASET_EXPANSION_PLANNING.md`).  
**Stop boundary:** Cohort selection + sealing only. **P2K-F / P2K-G / P2K-H NOT executed.**

---

## 1. Result

| Field | Value |
| --- | --- |
| cohortId | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| status | **SEALED** |
| selected member count | **30** |
| namespace considered | **30** (`match-p2kg-expansion-v2-*`) |
| P2K-C `replayEligible` (namespace) | **30** |
| `offlineReplayExecutable` (namespace) | **30** |
| membershipDigestSha256 | `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997` |
| digest recompute | **PASS** |
| eligibility contract | `projection-replay-eligibility.p2k.c` |
| sidecar schema | `projection-replay-sidecar.p2k.b` |
| ordering | `historyId_asc` (deterministic) |
| PostgreSQL round-trip | **PASS** |
| SEALED immutability | **PASS** |
| Idempotent reseal | **PASS** |

### Selected members (deterministic `historyId_asc`; 30)

| position | historyId | matchId |
| ---: | --- | --- |
| 0 | `eval-history:match-p2kg-expansion-v2-10:a53e2628:5a2e3623` | match-p2kg-expansion-v2-10 |
| 1 | `eval-history:match-p2kg-expansion-v2-11:55422ea3:7aadf53a` | match-p2kg-expansion-v2-11 |
| 2 | `eval-history:match-p2kg-expansion-v2-12:020bbb60:df66dd56` | match-p2kg-expansion-v2-12 |
| 3 | `eval-history:match-p2kg-expansion-v2-13:445e9c8f:31281c54` | match-p2kg-expansion-v2-13 |
| 4 | `eval-history:match-p2kg-expansion-v2-14:e9aa5f7d:7adb4ee7` | match-p2kg-expansion-v2-14 |
| 5 | `eval-history:match-p2kg-expansion-v2-15:89919b0a:bc01f328` | match-p2kg-expansion-v2-15 |
| 6 | `eval-history:match-p2kg-expansion-v2-16:2dc19291:cc0af41c` | match-p2kg-expansion-v2-16 |
| 7 | `eval-history:match-p2kg-expansion-v2-17:87ef3a71:55a1a15a` | match-p2kg-expansion-v2-17 |
| 8 | `eval-history:match-p2kg-expansion-v2-18:124ed3fe:7418179e` | match-p2kg-expansion-v2-18 |
| 9 | `eval-history:match-p2kg-expansion-v2-19:aba699d7:74df99ad` | match-p2kg-expansion-v2-19 |
| 10 | `eval-history:match-p2kg-expansion-v2-1:e6ca0b7b:38478169` | match-p2kg-expansion-v2-1 |
| 11 | `eval-history:match-p2kg-expansion-v2-20:cf794ea3:e25226cd` | match-p2kg-expansion-v2-20 |
| 12 | `eval-history:match-p2kg-expansion-v2-21:037ab615:7b6d63d6` | match-p2kg-expansion-v2-21 |
| 13 | `eval-history:match-p2kg-expansion-v2-22:1992b77e:f7488821` | match-p2kg-expansion-v2-22 |
| 14 | `eval-history:match-p2kg-expansion-v2-23:56fb9674:fedfcb84` | match-p2kg-expansion-v2-23 |
| 15 | `eval-history:match-p2kg-expansion-v2-24:d59f09dc:24a2fa9f` | match-p2kg-expansion-v2-24 |
| 16 | `eval-history:match-p2kg-expansion-v2-25:6844ae8a:b93756ae` | match-p2kg-expansion-v2-25 |
| 17 | `eval-history:match-p2kg-expansion-v2-26:5f06606c:03cc2c2f` | match-p2kg-expansion-v2-26 |
| 18 | `eval-history:match-p2kg-expansion-v2-27:c73e94e9:e6f38222` | match-p2kg-expansion-v2-27 |
| 19 | `eval-history:match-p2kg-expansion-v2-28:08a7da3c:35a34038` | match-p2kg-expansion-v2-28 |
| 20 | `eval-history:match-p2kg-expansion-v2-29:951a9a44:b6ffaf51` | match-p2kg-expansion-v2-29 |
| 21 | `eval-history:match-p2kg-expansion-v2-2:e48455d5:a0152867` | match-p2kg-expansion-v2-2 |
| 22 | `eval-history:match-p2kg-expansion-v2-30:1e1969ab:f198214f` | match-p2kg-expansion-v2-30 |
| 23 | `eval-history:match-p2kg-expansion-v2-3:d7d03b9b:4e1efdce` | match-p2kg-expansion-v2-3 |
| 24 | `eval-history:match-p2kg-expansion-v2-4:7bddbde9:21626f87` | match-p2kg-expansion-v2-4 |
| 25 | `eval-history:match-p2kg-expansion-v2-5:38535889:48fc060d` | match-p2kg-expansion-v2-5 |
| 26 | `eval-history:match-p2kg-expansion-v2-6:239a52fd:b1413fe5` | match-p2kg-expansion-v2-6 |
| 27 | `eval-history:match-p2kg-expansion-v2-7:2429e3ae:fde5539d` | match-p2kg-expansion-v2-7 |
| 28 | `eval-history:match-p2kg-expansion-v2-8:02ce4134:e9221c77` | match-p2kg-expansion-v2-8 |
| 29 | `eval-history:match-p2kg-expansion-v2-9:dc0ae568:005df279` | match-p2kg-expansion-v2-9 |

Membership fields persisted per member: `cohortId`, `historyId`, `matchId`, `position`, plus cohort-level `membershipDigestSha256`, `eligibilityContractVersion`, `sidecarSchemaVersion`.

---

## 2. Selection gates (orchestration unchanged)

Reused **unchanged**:

- `createAndSealOfflineExecutableReplayCohort` (`packages/analysis/src/replay/create-and-seal-offline-executable-replay-cohort.ts`)

Gates, in order:

1. Namespace: `matchId` starts with `match-p2kg-expansion-v2-`
2. Canonical P2K-C `assessProjectionReplayEligibility` → `replayEligible === true`
3. Sidecar schema pin (`projection-replay-sidecar.p2k.b`)
4. Independent `assessOfflineReplayExecutability` → `offlineReplayExecutable === true`

Then reuses:

- `selectReplayCohortMembers` (`historyId_asc`)
- `buildReplayCohort`
- `PrismaReplayCohortRepository.save` (SEALED)

No P2K-C contract change; no provenance folded into `replayComplete`; fail-closed exclusion reasons recorded.

---

## 3. Exclusions (live `fas_validation`)

| Metric | Count |
| --- | --- |
| Histories considered | 172 |
| Namespace (`match-p2kg-expansion-v2-*`) | 30 |
| Selected (SEALED members) | **30** |
| Excluded total | **142** |

| Reason | Count |
| --- | --- |
| `OUT_OF_NAMESPACE` | 142 |
| `MISSING_SIDECAR` | 0 |
| `NOT_P2K_C_REPLAY_ELIGIBLE` | 0 (inside namespace) |
| `SIDECAR_SCHEMA_MISMATCH` | 0 |
| `NOT_OFFLINE_REPLAY_EXECUTABLE` | 0 (inside namespace) |

`membersOutsideNamespace` in the sealed cohort: **0**. Legacy rows (v1 `match-example-*`, recovery `match-p2kg-recovery-v2-*`, persistence `match-p2k-*`) were excluded by namespace and **not mutated**.

---

## 4. Member-level eligibility (per-member, 30/30)

| Check | Result |
| --- | --- |
| P2K-C `replayComplete` | 30 / 30 |
| P2K-C `outcomeEvaluable` | 30 / 30 |
| P2K-C `replayEligible` | 30 / 30 |
| `offlineReplayExecutable` (`assessOfflineReplayExecutability`) | 30 / 30 |
| `ruleResultRebuildable` (RuleResult catalog-valid + rebuildable) | 30 / 30 |
| `parameterProvenance.complete` | 30 / 30 |
| `parameterProvenance.registryRecognized` | 30 / 30 |
| Sidecar schema pin | 30 / 30 |
| Baseline A offline smoke (`runOfflineMatchScriptReplay`) | 30 / 30 ok |
| Replay failure reasonCodes | **none** |

Parameter provenance (all 30 identical active artifact, persisted by `buildProjectionReplayContext` — not hand-written):

| Field | Value |
| --- | --- |
| parameterVersionLabel | `projection.v3.replay` |
| parameterArtifactId | `projectionParams:v3.1:matchScript` |
| parameterArtifactChecksum | `d7b2f4fd` |

---

## 5. PostgreSQL round-trip / immutability / idempotent reseal

| Check | Result |
| --- | --- |
| Reloaded cohort exists + `SEALED` | **PASS** |
| Reloaded member count == sealed count (30) | **PASS** |
| Recomputed `membershipDigestSha256` == persisted | **PASS** |
| Persisted digest == seal result digest | **PASS** |
| Mutated save rejected with `SealedReplayCohortImmutableError` | **PASS** |
| Idempotent reseal returns same digest | **PASS** |

---

## 6. Old cohort immutability

| Check | `p2k.e.validation.bootstrap.analyzematch.v1` | `p2k.e.validation.recovery.v2.analyzematch.v1` |
| --- | --- | --- |
| status | still **SEALED** | still **SEALED** |
| membershipDigestSha256 | `abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c` (unchanged) | `3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439` (unchanged) |
| member count | still 6 | still 6 |
| reused as this cohort | **NO** | **NO** |

---

## 7. What was not done

| Action | Status |
| --- | --- |
| History / Sidecar UPDATE/DELETE | **No** |
| Provider / Evidence / Feature / Rule regeneration | **No** |
| P2K-C contract change | **No** |
| Parameter pin folded into `replayComplete` | **No** |
| Production Match Script / Projection / Poisson change | **No** (Baseline A) |
| Candidate C promotion | **No** (`productionPromoted = false`) |
| P2K-F Replay Run | **NOT EXECUTED** |
| P2K-G population evaluation | **NOT EXECUTED** |
| P2K-H | **NOT AUTHORIZED** |

---

## 8. Files

| File | Role |
| --- | --- |
| `docs/sprints/P2K/scripts/p2k-e-validation-seal-expansion-v2-cohort.mjs` | Live seal (namespace + P2K-C + offline gates) + round-trip / immutability / idempotent / old-cohort checks |
| Existing `createAndSealOfflineExecutableReplayCohort` (`@fas/analysis`) | Reused; not weakened |

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-e-validation-seal-expansion-v2-cohort.mjs
```

---

## 9. Governance / concise answers

1. **cohortId:** `p2k.e.validation.expansion.v2.analyzematch.v1`
2. **status:** **SEALED**
3. **member count:** **30**
4. **membershipDigestSha256:** `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997`
5. **ordering:** `historyId_asc`
6. **P2K-C replayEligible (members):** 30 / 30
7. **offlineReplayExecutable (members):** 30 / 30
8. **RuleResult rebuildable:** 30 / 30
9. **Parameter provenance complete + registryRecognized:** 30 / 30
10. **Excluded:** 142 (all `OUT_OF_NAMESPACE`); 0 inside namespace
11. **PostgreSQL round-trip / immutability / idempotent reseal:** PASS / PASS / PASS
12. **Old v1 + recovery-v2 cohorts:** SEALED and unchanged
13. **Candidate C `productionPromoted`:** **false**
14. **Production Match Script:** **unchanged (Baseline A)**
15. **P2K-F:** **NOT EXECUTED**
16. **P2K-G:** **NOT EXECUTED**
17. **P2K-H:** **NOT AUTHORIZED**

---

## 10. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Live `fas_validation` seal + all checks | **PASS** (exit 0) |

(No package code changed in this sprint — only a new live orchestration script and this report; gates re-verified.)
