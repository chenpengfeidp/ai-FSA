# P2K-G2-A — Validation Dataset Diversity Expansion + V2 Bootstrap

**Status:** COMPLETED  
**Sprint id:** P2K-G2-A (validation dataset diversity expansion, real AnalyzeMatch v2 bootstrap)  
**Date:** 2026-08-16  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Implements the P2K-G2 expansion strategy (`docs/sprints/P2K/P2K_G2_VALIDATION_DATASET_EXPANSION_PLANNING.md`); maps to roadmap A1/A2 lineage (`docs/40_PRODUCT_ROADMAP.md` §A1/§A2). Governance note: P2* not yet listed in doc 40 (recorded in `docs/PROJECT_STATE.md`).  
**Stop boundary:** Data expansion + audits only. **NO cohort. NO P2K-E. NO P2K-F. NO P2K-G. NO P2K-H.**

---

## 1. Goal

Build a genuinely diverse validation dataset (new namespace `match-p2kg-expansion-v2-*`, 30 rows) through the **real AnalyzeMatch production composition** with `projectionPolicyPin = "v2"`, so that prediction-profile / confidence / goal-range / outcome diversity is materially higher than the previous n = 6 recovery cohort. Then audit P2K-C eligibility, `offlineReplayExecutable`, parameter provenance, and the coverage gates defined in P2K-G2.

## 2. Stop boundary (respected)

| Action | Status |
| --- | --- |
| Create SEALED cohort | **NO** |
| P2K-E / P2K-F / P2K-G population / P2K-H | **NOT executed** |
| Candidate C promotion | **NO** (`productionPromoted = false`) |
| Production Baseline A / Match Script / Projection / Poisson change | **NO** |
| P2K-C `replayComplete` / `replayEligible` contract change | **NO** |
| Mutation of history v1 / recovery-v2 Sidecars | **NO** |
| Mutation of existing SEALED cohorts | **NO** |
| UPDATE/DELETE repair of old data | **NO** |
| Fabricated RuleResult / parameter provenance | **NO** |

## 3. Existing fixture audit (before expansion)

| Item | Finding |
| --- | --- |
| `FixtureProvider` templates | 7 total (`match-example`, `match-example-1…6`), built from 2 form profiles, 3 H2H shapes, 4 odds shapes → **~4 distinct prediction profiles** |
| Recorded `football:*` bundles | 4 (`football:100001-3`, `football:244001`), all SCHEDULED — no provider FT results |
| Real AnalyzeMatch rows pre-expansion | 12 (6 `match-example-*` v1 no-provenance + 6 `match-p2kg-recovery-v2-*` v2 with provenance); only the 6 recovery rows were `offlineReplayExecutable` |
| Legacy projection behavior on those templates | predicted winner home 6/6, predicted goal range `range4Plus` 6/6 (0.83–0.88), confidence `low` 12/12 → P2K-G Exact Score 0/6 and Goal Range 0/6 |
| Root cause of narrow diversity (verified in code) | `lambda-builder-v2` attack-group `unitCentered` scale interacts with 0–100 feature values (`recentForm`/`momentum`) so the attack factor saturates at 2.5 unless `recentForm = 0` (`allL` form); matchContext group saturates home 2.5 / away 0.05 when venue/context evidence is present |

## 4. New templates (30, all genuinely distinct)

Shapes cover A–H / K of the P2K-G2 design plus market-conflict and low-λ asymmetric variants:

| Class | Templates (match-p2kg-expansion-v2-*) | Prediction character |
| --- | --- | --- |
| A Strong Home | 1 (enriched), 2, 18 (conflict), 20, 23 | home, range4Plus |
| B Moderate Home | 3 (enriched), 4 | home, range4Plus |
| C Balanced | 5 (enriched), 25 | home-lean, range4Plus |
| D Draw-oriented | 6 (enriched), 7, 27 | home-lean, range4Plus |
| E Moderate Away | 8 (enriched), 9, 21 (conflict), 26 | away (8) / home (9, 21) / away (26) |
| F Strong Away | 10 (enriched), 11, 19 (conflict), 24 | away, range4Plus |
| G Open / high-scoring | 12 (enriched), 13, 14, 22 | home/away, range4Plus |
| H Control / low-scoring | 15 (enriched), 16 | home, range4Plus |
| K Control / very-low | 17 | home, **range01** |
| Mid / low-λ asymmetric | 28, 29, 30 | away, **range23** |

8 templates (1, 3, 5, 6, 8, 10, 12, 15) are **intelligence-enriched** with Expected Goals (`EXPECTED_GOALS`), Manager Intelligence (`MANAGER_INTELLIGENCE`), Availability (`INJURY`/`SUSPENSION`), Advanced Statistics (`STATISTICS.advanced`), and Player (`PLAYER`) evidence — this raises evidence completeness and produces **medium** confidence, and brings the Football Intelligence dimensions into the validation population (previously absent).

## 5. New namespace

`match-p2kg-expansion-v2-1` … `match-p2kg-expansion-v2-30` (prefix `match-p2kg-expansion-v2-`). Disjoint from `match-example-*` and `match-p2kg-recovery-v2-*` (enforced by unit test and live check).

## 6. New History IDs (30)

| matchId | historyId |
| --- | --- |
| match-p2kg-expansion-v2-1 | `eval-history:match-p2kg-expansion-v2-1:e6ca0b7b:38478169` |
| match-p2kg-expansion-v2-2 | `eval-history:match-p2kg-expansion-v2-2:e48455d5:a0152867` |
| match-p2kg-expansion-v2-3 | `eval-history:match-p2kg-expansion-v2-3:d7d03b9b:4e1efdce` |
| match-p2kg-expansion-v2-4 | `eval-history:match-p2kg-expansion-v2-4:7bddbde9:21626f87` |
| match-p2kg-expansion-v2-5 | `eval-history:match-p2kg-expansion-v2-5:38535889:48fc060d` |
| match-p2kg-expansion-v2-6 | `eval-history:match-p2kg-expansion-v2-6:239a52fd:b1413fe5` |
| match-p2kg-expansion-v2-7 | `eval-history:match-p2kg-expansion-v2-7:2429e3ae:fde5539d` |
| match-p2kg-expansion-v2-8 | `eval-history:match-p2kg-expansion-v2-8:02ce4134:e9221c77` |
| match-p2kg-expansion-v2-9 | `eval-history:match-p2kg-expansion-v2-9:dc0ae568:005df279` |
| match-p2kg-expansion-v2-10 | `eval-history:match-p2kg-expansion-v2-10:a53e2628:5a2e3623` |
| match-p2kg-expansion-v2-11 | `eval-history:match-p2kg-expansion-v2-11:55422ea3:7aadf53a` |
| match-p2kg-expansion-v2-12 | `eval-history:match-p2kg-expansion-v2-12:020bbb60:df66dd56` |
| match-p2kg-expansion-v2-13 | `eval-history:match-p2kg-expansion-v2-13:445e9c8f:31281c54` |
| match-p2kg-expansion-v2-14 | `eval-history:match-p2kg-expansion-v2-14:e9aa5f7d:7adb4ee7` |
| match-p2kg-expansion-v2-15 | `eval-history:match-p2kg-expansion-v2-15:89919b0a:bc01f328` |
| match-p2kg-expansion-v2-16 | `eval-history:match-p2kg-expansion-v2-16:2dc19291:cc0af41c` |
| match-p2kg-expansion-v2-17 | `eval-history:match-p2kg-expansion-v2-17:87ef3a71:55a1a15a` |
| match-p2kg-expansion-v2-18 | `eval-history:match-p2kg-expansion-v2-18:124ed3fe:7418179e` |
| match-p2kg-expansion-v2-19 | `eval-history:match-p2kg-expansion-v2-19:aba699d7:74df99ad` |
| match-p2kg-expansion-v2-20 | `eval-history:match-p2kg-expansion-v2-20:cf794ea3:e25226cd` |
| match-p2kg-expansion-v2-21 | `eval-history:match-p2kg-expansion-v2-21:037ab615:7b6d63d6` |
| match-p2kg-expansion-v2-22 | `eval-history:match-p2kg-expansion-v2-22:1992b77e:f7488821` |
| match-p2kg-expansion-v2-23 | `eval-history:match-p2kg-expansion-v2-23:56fb9674:fedfcb84` |
| match-p2kg-expansion-v2-24 | `eval-history:match-p2kg-expansion-v2-24:d59f09dc:24a2fa9f` |
| match-p2kg-expansion-v2-25 | `eval-history:match-p2kg-expansion-v2-25:6844ae8a:b93756ae` |
| match-p2kg-expansion-v2-26 | `eval-history:match-p2kg-expansion-v2-26:5f06606c:03cc2c2f` |
| match-p2kg-expansion-v2-27 | `eval-history:match-p2kg-expansion-v2-27:c73e94e9:e6f38222` |
| match-p2kg-expansion-v2-28 | `eval-history:match-p2kg-expansion-v2-28:08a7da3c:35a34038` |
| match-p2kg-expansion-v2-29 | `eval-history:match-p2kg-expansion-v2-29:951a9a44:b6ffaf51` |
| match-p2kg-expansion-v2-30 | `eval-history:match-p2kg-expansion-v2-30:1e1969ab:f198214f` |

## 7. New Sidecar IDs

One Sidecar per History (same `historyId` as the FK), schema `projection-replay-sidecar.p2k.b`, content SHA-256 persisted per record (verified by P2K-C `computeProjectionReplaySidecarContentSha256` recompute — no `INVALID_SIDECAR_HASH`).

## 8. FT mapping (deterministic, MATCH_RESULT Evidence overlay only)

| matchId | score | winner | matchId | score | winner |
| --- | --- | --- | --- | --- | --- |
| v2-1 | 2-0 | home | v2-16 | 1-1 | draw |
| v2-2 | 3-1 | home | v2-17 | 0-0 | draw |
| v2-3 | 1-0 | home | v2-18 | 2-1 | home |
| v2-4 | 2-1 | home | v2-19 | 0-2 | away |
| v2-5 | 1-1 | draw | v2-20 | 3-0 | home |
| v2-6 | 1-1 | draw | v2-21 | 1-1 | draw |
| v2-7 | 0-0 | draw | v2-22 | 2-1 | home |
| v2-8 | 0-1 | away | v2-23 | 2-0 | home |
| v2-9 | 1-2 | away | v2-24 | 0-1 | away |
| v2-10 | 0-2 | away | v2-25 | 1-1 | draw |
| v2-11 | 1-3 | away | v2-26 | 0-1 | away |
| v2-12 | 4-2 | home | v2-27 | 1-1 | draw |
| v2-13 | 2-2 | draw | v2-28 | 0-2 | away |
| v2-14 | 2-3 | away | v2-29 | 0-2 | away |
| v2-15 | 1-0 | home | v2-30 | 1-2 | away |

**Actual outcome distribution (30):** Home **10**, Draw **9**, Away **11** (gates: H≥7 ✓ / D≥6 ✓ / A≥7 ✓).  
**Actual goal totals (30):** 0 ×2, 1 ×5, 2 ×12, 3 ×6, 4 ×3, 5 ×1, 6 ×1 (0/1/2/3/4+ all present ✓). Outcomes are attached as `MATCH_RESULT` Evidence (`providerSource = validation-bootstrap`) — **never** written into RuleResult / Sidecar prediction / parameter provenance.

## 9. Prediction profile distribution (sealed snapshots)

| Metric | Value |
| --- | --- |
| Distinct prediction profiles (pHome/pDraw/pAway @1e-6) | **28** |
| Predicted winner | home **19**, away **11** |
| Predicted BTTS (most-likely scenario) | BTTS **24**, no-BTTS **6** |
| Predicted O/U 2.5 (goalRange mass) | over **29**, under **1** |

## 10. Confidence distribution

| Band | Count |
| --- | ---: |
| medium | **6** (templates 1, 3, 8, 10, 12, 15 — all intelligence-enriched) |
| low | **24** |

`high` / `very_high` remain unreachable for fixture-based evidence (evidence completeness caps near 25–34 of 20 checks; structural, documented in §18).

## 11. Goal-range distribution (predicted)

| Class | Count |
| --- | ---: |
| range01 | **1** (match 17: Cagliari v Venezia) |
| range23 | **2** (matches 29, 30: Leicester v Middlesbrough, Stoke v Norwich) |
| range4Plus | **27** |

## 12. Outcome distribution

See §8 — actual winners Home 10 / Draw 9 / Away 11; actual goal totals 0–6. The set is **no longer degenerate**: 11 away actuals, 9 draws, high-scoring (4–6 goal) rows present.

## 13. P2K-C eligibility

| Gate | Result |
| --- | --- |
| `replayComplete` | **30 / 30** |
| `outcomeEvaluable` | **30 / 30** |
| `replayEligible` | **30 / 30** |
| `INVALID_SIDECAR_HASH` | **0** |
| `MISSING_SIDECAR` / `MATCH_ID_MISMATCH` / `MISSING_FEATURES` / `MISSING_RULES` | **0** |

## 14. offlineReplayExecutable

| Check | Result |
| --- | --- |
| `offlineReplayExecutable` | **30 / 30** |
| `ruleResultRebuildable` | **30 / 30** |
| `parameterProvenance.complete` | **30 / 30** |
| `parameterProvenance.registryRecognized` | **30 / 30** |
| Offline Baseline A smoke (`runOfflineMatchScriptReplay`) | **30 / 30 ok** |
| Replay failure reasonCodes | **none** |

## 15. Parameter provenance

All 30 Sidecars carry the **real** active registry artifact (not hand-written):

| Field | Value |
| --- | --- |
| parameterVersionLabel | `projection.v3.replay` |
| parameterArtifactId | `projectionParams:v3.1:matchScript` |
| parameterArtifactChecksum | `d7b2f4fd` |
| source | persisted by `buildProjectionReplayContext` from the analysis framework (projectionPolicyPin = "v2") — **no manual writes** |

## 16. Old data immutability

| Check | Before | After | Status |
| --- | ---: | ---: | --- |
| `match-example-*` History | 6 | 6 | **untouched** |
| `match-p2kg-recovery-v2-*` History | 6 | 6 | **untouched** |
| v1 cohort `p2k.e.validation.bootstrap.analyzematch.v1` | SEALED, digest `abdd11ec…` | unchanged | **untouched** |
| Recovery V2 cohort `p2k.e.validation.recovery.v2.analyzematch.v1` | SEALED, digest `3b707860…` | unchanged | **untouched** |
| History total | 135 | **165** (+30 expansion) | additive |
| Sidecar total | 99 | **129** (+30 expansion) | additive |

## 17. Coverage gate result

| Gate (from P2K-G2) | Target | Result |
| --- | --- | --- |
| Candidate rows | ≥ 20 (preferred 30) | **30** — PASS |
| Distinct prediction profiles | ≥ 6 | **28** — PASS |
| Predicted winner classes | ≥ 2 | **2** (home/away) — PASS |
| Goal-range classes | ≥ 3 | **3** (range01/range23/range4Plus) — PASS |
| Confidence bands | ≥ 2 | **2** (low/medium) — PASS |
| Actual Home / Draw / Away | ≥ 7 / ≥ 6 / ≥ 7 | **10 / 9 / 11** — PASS |
| Actual goal totals | 0,1,2,3,4+ present | **0–6 present** — PASS |
| P2K-C replayEligible | 100% | **30/30** — PASS |
| offlineReplayExecutable | 100% | **30/30** — PASS |
| Parameter provenance complete | 100% | **30/30** — PASS |

**ALL GATES PASS.** (Probe-verified during design: the medium band requires intelligence enrichment; range23 requires the asymmetric allL-form low-λ shapes; these are now fixed in the template module.)

## 18. Known limitations

- **Predicted winners never include `draw`** and **27/30 predicted goal ranges are `range4Plus`** — the deterministic projection model (attack-group `unitCentered` saturation at 2.5, home-advantage ×1.21/×0.86) is structurally home/high-scoring biased. This is a model property, not a data defect; the expansion dataset documents it and provides the maximum diversity the production model can produce.
- **`high` / `very_high` confidence bands are unreachable** on fixture/recorded evidence (evidence completeness caps at ~34/100; `bandFor` needs ≥65). Reported honestly — the confidence gate (≥2 bands) is satisfied by low + medium.
- Outcomes remain **deterministic hand-assigned** `MATCH_RESULT` overlays (`validation-bootstrap`), not provider-sourced FT results; no real FT results exist in the repository (recorded `football:*` bundles are SCHEDULED; live API requires key + network).
- Only **2 templates (29, 30) produce range23** and **1 (17) range01** — the goal-range classes are present but thin; a future bootstrap can re-weight templates to strengthen range23/range01 representation.
- No statistical significance infrastructure (`statisticalSignificanceSupported = false`); the expanded dataset is descriptive validation evidence, not inferential.

## 19. Governance status

| Invariant | Status |
| --- | --- |
| Architecture Freeze v0.3 | **unchanged** |
| Production Match Script = Baseline A | **unchanged** (`GOVERNED_MATCH_SCRIPT_PARAMETER_SET === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET`) |
| Candidate C `productionPromoted` | **false** |
| Cohort created | **false** |
| P2K-E / F / G / H | **not executed** |
| P2K-C / P2K-D / Projection / Poisson / Match Script algorithms | **unchanged** |
| Old v1 / recovery-v2 cohorts | **SEALED and untouched** |

## 20. Explicit STOP before P2K-E

**The expansion dataset is ready (30/30 offlineReplayExecutable candidates), but no cohort is sealed and no P2K-E/F/G/H step has run.** Next steps require separate human authorization: P2K-E seal on namespace `match-p2kg-expansion-v2-` (proposed cohort `p2k.e.validation.expansion.v2.analyzematch.v1`), then P2K-F A/C paired replay, then P2K-G population evaluation. Nothing auto-triggers.

---

## Files

| File | Role |
| --- | --- |
| `packages/report/src/validation/expansion-validation-templates.ts` | 30 deterministic templates + FT outcome map + shape accessor |
| `packages/report/src/validation/bootstrap-expansion-v2-validation-history-sidecar.ts` | Real AnalyzeMatch v2 bootstrap (projectionPolicyPin = "v2") |
| `packages/report/test/expansion-validation-bootstrap-p2k-g2-a.spec.ts` | Path / catalog / eligibility / outcome-map / namespace tests |
| `docs/sprints/P2K/scripts/p2k-g2-a-validation-data-expansion.mjs` | Live bootstrap + P2K-C / offline / coverage / immutability audit |

```bash
# Unit tests
pnpm --filter @fas/report test -- packages/report/test/expansion-validation-bootstrap-p2k-g2-a.spec.ts

# Live bootstrap + audit (idempotent re-run adds 0 rows)
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-g2-a-validation-data-expansion.mjs
```

## Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
| Live `fas_validation` bootstrap + audit | **PASS** (exit 0, all gates) |
