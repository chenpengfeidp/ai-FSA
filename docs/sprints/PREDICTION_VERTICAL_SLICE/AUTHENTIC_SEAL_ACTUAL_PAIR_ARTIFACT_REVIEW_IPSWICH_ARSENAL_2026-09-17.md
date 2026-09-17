# Authentic Seal + Verified Actual Pair — Artifact Review

| Field | Value |
|---|---|
| Review type | Read-only governance / pair artifact review |
| Date | 2026-09-17 |
| `matchId` | `lottery:csl:20260915:周二012` |
| Ipswich Town vs Arsenal (伊普斯维奇 vs 阿森纳) |
| Recommendation | **A. PASS — AUTHENTIC SEAL + VERIFIED ACTUAL PAIR ARTIFACT REVIEW COMPLETE** |

Prior artifacts: `AUTHENTIC_PREMATCH_SEAL_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-15.md`, `VERIFIED_REAL_WORLD_ACTUAL_AND_SEAL_PAIR_VERIFICATION_IPSWICH_ARSENAL_2026-09-16.md`, `verification-artifacts/2026-09-17-ips-ars-verified-actual-persist-run.json`.

---

## 1. Seal integrity (Postgres reload)

| Field | Value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `sealIdentityHash` | `23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` (equal) |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `kickoff` | `2026-09-16T03:00:00+08:00` |
| `season` | `2025/26` |

`authenticatePrematchPredictionSeal` **PASS** on reload. No mutation.

---

## 2. Verified Actual (Postgres reload)

| Field | Value |
|---|---|
| `Evidence.id` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| `type` | `MATCH_RESULT` |
| `quality` | `verified` |
| `realWorldVerification` | `true` |
| `homeGoals` / `awayGoals` | **2** / **4** |
| `winner` | `away` |
| `matchStatus` | `FINISHED` |
| `observedAt` | `2026-09-17T03:01:13.950Z` |

`mapActualMatchResultFromEvidence` **PASS**. Durable reload confirmed.

---

## 3. Pair binding

| Dimension | Seal | Actual payload | Match |
|---|---|---|---|
| `matchId` | `lottery:csl:20260915:周二012` | same | **YES** |
| home / away | 伊普斯维奇 / 阿森纳 | same | **YES** |
| `competitionId` | `eng:efl-cup` | same | **YES** |
| `competitionName` | EFL Cup / 英联赛杯 | same | **YES** |
| `season` | `2025/26` | `2025/26` | **YES** |
| `kickoff` | `2026-09-16T03:00:00+08:00` | same | **YES** |

---

## 4. Sealed `predictionSnapshot` (from seal only)

Fields present on snapshot:

| Field | Sealed value |
|---|---|
| `pHome` / `pDraw` / `pAway` | 0.2597 / 0.1640 / **0.5763** |
| `predictionConfidence` | 24.1 |
| `confidenceBand` | `low` |
| `projectionStatus` | `completed_nonempty` |
| `projectionChecksum` | `b016ab9c` |
| `featureModelVersion` | `feature.v2.m1b.manager` |
| `ruleSetVersion` | `rule.mvp.m1b.manager` |
| `projectionModelVersion` | `projection.v2.m1b.manager` |
| `goalRange` | `range01` 0.0070; `range23` 0.0746; **`range4Plus` 0.9184** |
| `scenarios.mostLikely` | **draw**, 3–3, p≈0.0511 |
| `scenarios.secondLikely` | away, **3–4**, p≈0.0504 |
| `scenarios.upset` | away, 3–4, p≈0.0504 |
| `topScorelines[0]` | 3–3 (highest single scoreline mass) |
| `topScorelines` includes **2–4** | p≈0.0464 (rank ~3) |
| `featureNames` | homeTeam, awayTeam, kickoff, attack/defense/momentum/form home/away, momentum, homeAdvantage, **marketImpliedHome/Draw/Away, marketLean** |
| `rules` (market subset) | `MARKET_LEAN_AWAY` **PASS**; `MARKET_LEAN_HOME` FAIL; AH/consensus/volatility **INAPPLICABLE** |

No sealed single-field “predicted winner” label beyond probabilities and scenarios.

---

## 5. Descriptive prediction vs Actual (2–4 away)

Actual: **home 2, away 4, winner away, total 6, goal diff −2**.

| Comparison | Sealed | Actual | Result |
|---|---|---|---|
| 1X2 argmax (`pAway` highest) | **away** lean | away win | **MATCH** |
| `scenarios.mostLikely.winner` | draw | away | **MISS** |
| Exact score (`mostLikely`) | 3–3 | 2–4 | **MISS** |
| Exact score (actual line in `topScorelines`) | listed ~4.64% | 2–4 | **MATCH** (in distribution, not mode) |
| Home goals (`mostLikely`) | 3 | 2 | error **−1** (actual − sealed) |
| Away goals (`mostLikely`) | 3 | 4 | error **+1** |
| Total goals (`mostLikely`) | 6 | 6 | error **0** |
| Goal difference (`mostLikely`) | 0 | −2 | error **−2** |
| `scenarios.secondLikely` score | 3–4 | 2–4 | home **−1**, away **0** |
| `goalRange.range4Plus` | 91.8% mass | 6 goals (4+ band) | **MATCH** (range intent) |

No calibration or model change implied.

---

## 6. PRE_MATCH evidence inventory (governed Postgres at review time)

| Type | Count | Notes |
|---|---|---|
| MATCH_INFO | 1 | Fixture identity |
| TEAM_FORM | 2 | home/away |
| STATISTICS | 2 | home/away |
| ODDS | 4 | See below |
| MATCH_RESULT | 1 | **Post-match only** (not in PRE_MATCH seal inputs) |

**ODDS rows:**

1. `…-odds-lottery:…:1x2` — lottery official 1X2  
2. `…-odds-lottery:…:handicap-result+1` — lottery three-way handicap +1  
3. `…-odds-bet365:…:asian-handicap:+1.5` — independent AH  
4. `…-odds-bet365:…:total:2.5` — independent O/U  

**PRE_MATCH seal capture:** `MATCH_RESULT` count **0** at `analysisTime` (admission + temporal rules). Current `MATCH_RESULT` row is post-pair Actual capture.

---

## 7. Market feature utilization (read-only)

From `2026-09-15-ips-ars-capture-run.json` feature provenance + `featureNames` on seal:

| Market evidence | Persisted | Consumed by projection features |
|---|---|---|
| Lottery 1X2 | **Yes** | **Yes** — `marketImpliedHome/Draw/Away`, `marketLean` source `evidence-…-1x2` |
| Lottery handicap-result +1 | **Yes** | **No** — not referenced in sealed `featureNames` |
| Independent AH (+1.5) | **Yes** | **No** — `MARKET_AH_*` rules INAPPLICABLE; no AH features in snapshot |
| Independent O/U (2.5) | **Yes** | **No** — no O/U features in snapshot |

**Finding:** Known **first-ODDS / I2B** behavior — `FeatureExtractor` uses the first `ODDS` evidence for market-implied features (lottery 1X2 row). Additional ODDS rows are governed and persisted but not consumed for `marketImplied*` / AH lean on this run. Documented in admission review §4; not asserted as contract violation.

---

## 8. Artifact completeness (for later governed evaluation)

| Requirement | Status |
|---|---|
| Immutable PRE_MATCH prediction (`predictionSnapshot` on seal) | **Present** |
| Authentic PRE_MATCH timing | **PASS** |
| Governed PRE_MATCH evidence set | **Present** (9 types at analyze; 4 ODDS markets) |
| Verified real-world Actual | **Present** |
| Fixture binding | **PASS** |
| Durable persistence + hash integrity | **PASS** |
| Provenance on Actual | **Present** |

**Gap for Historical Intake (not this review):** intake remains **C_BLOCKED** per `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md`; separate authorization required. Season label `2025/26` vs calendar kickoff may need reconciliation before cross-season aggregation.

---

## 9. Season semantic note

`season = 2025/26` is operator-attested governed identity on seal and Actual (exact bind). Real-world competition-season labeling for Sept 2026 may differ; reconcile before production historical aggregation — **do not** mutate seal or Actual here.

---

## 10. Historical Intake

**Unchanged:** `historical_evaluation_intake: C_BLOCKED`, `production_historical_intake_authorized: false`. No Evaluation History, Calibration, Validation, or Contribution writes.

---

## 11. Next governance gate (not executed)

Repository convention (`HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` §8–9, `HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW.md`):

**Proposed `next_action`:** `HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW` — re-run readiness with this authentic pair as primary artifact evidence; **does not** authorize intake implementation.

No established enum for “production intake authorized”; human gate required before any intake sprint.

---

## 12. Recommendation

**A. PASS — AUTHENTIC SEAL + VERIFIED ACTUAL PAIR ARTIFACT REVIEW COMPLETE**
