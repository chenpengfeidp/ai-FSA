# Authentic PRE_MATCH Seal — Artifact Admission Review (Ipswich vs Arsenal)

| Field | Value |
|---|---|
| Review type | Governance / artifact admission (post remediation) |
| Date | 2026-09-15 |
| Admission scope | **Only** `lottery:csl:20260915:周二012` first seal |
| Manifest | `verification-artifacts/2026-09-15-ips-ars-lottery-manifest.v1.json` |
| Primary recommendation | **A. PASS — AUTHENTIC CLASS A PRE_MATCH SEAL ARTIFACT ADMITTED** |

Out of scope: Liverpool vs Tottenham rows (`…d63058f…`, `…b4314967…`) — unchanged,
still **CAPTURED_ADMISSION_BLOCKED**.

---

## 1. Fixture authority

| Check | Verdict |
|---|---|
| `salesIssueId` | `20260915` |
| `lotteryMatchCode` | `周二012` |
| `matchId` | `lottery:csl:20260915:周二012` |
| Teams | 伊普斯维奇 (Ipswich Town) vs 阿森纳 (Arsenal) |
| Competition | EFL Cup / 英联赛杯 |
| Kickoff | `2026-09-16T03:00:00+08:00` ≡ `2026-09-15T19:00:00Z` |

Pre-capture baseline: **0** `evidence_items`, **0** seal rows for this `matchId`.

---

## 2. PRE_MATCH temporal integrity

| Rule | Result |
|---|---|
| `analysisCutoff === analysisTime` | **PASS** (`2026-09-15T14:22:18.766Z`) |
| `analysisTime < kickoff` | **PASS** |
| `sealedAt >= analysisTime` | **PASS** (`2026-09-15T14:22:18.878Z`) |
| `sealedAt < kickoff` | **PASS** |
| `max Evidence.collectedAt <= analysisCutoff` | **PASS** (domain `collectedAt` = cutoff) |
| `MATCH_RESULT` | **0** |
| Actual | **0** |

---

## 3. Governed Evidence set (Postgres, post-analyze)

| Type | Count |
|---|---|
| MATCH_INFO | 1 |
| TEAM_FORM | 2 |
| STATISTICS | 2 |
| ODDS | **4** |

### ODDS rows (distinct ids — remediation proof)

| Evidence.id | providerSource | providerSourceId | Classification |
|---|---|---|---|
| `…-odds-lottery:20260915:周二012:1x2` | china-sports-lottery | `lottery:…:1x2` | lottery standard 1X2 (7.10 / 4.55 / 1.30) |
| `…-odds-lottery:20260915:周二012:handicap-result+1` | china-sports-lottery | `lottery:…:handicap-result+1` | three-way handicap-result **+1** (2.90 / 3.65 / 1.96); **not** AH |
| `…-odds-bet365:…:asian-handicap:+1.5` | bet365.com | `bet365:…:asian-handicap:+1.5` | independent Asian Handicap (+1.5 @ 1.90 / 1.95) |
| `…-odds-bet365:…:total:2.5` | bet365.com | `bet365:…:total:2.5` | independent O/U 2.5 (1.62 / 2.25) |

Lottery 1X2 id ≠ lottery handicap-result id. **PASS.**

---

## 4. Analysis evidence lineage (bounded)

- Governed analyze imported manifest Evidence into Postgres before seal capture.
- `marketImplied*` / `marketLean` features reference **lottery 1X2** ODDS id
  (`evidence-china-sports-lottery-…-1x2`) — first `ODDS` in extractor order
  (existing I2B semantics; not changed by remediation).
- Lottery handicap-result row is in the same governed import set and persisted;
  not mislabeled as Asian Handicap (`marketSource=lottery-official-handicap-result-plus-one`,
  no `asianHandicapLine` on that row).

---

## 5. Seal classification

| Field | Value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `synthetic` | `false` |
| `historicalAuthenticity` | `true` |
| `provenanceClass` | `A` |
| `sourceAuthority` | `prisma.prematch_prediction_seal_items` |

---

## 6. Independent hash verification

Recomputed with `fas-json-canonical.v1` (`packages/statistics/src/seal/canonical-json.ts`):

| Check | Result |
|---|---|
| `sealIdentityHash` | `23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `originalSealId` | **PASS** |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `authenticatePrematchPredictionSeal` (independent recompute) | **PASS** |

---

## 7. Durability

API process restarted; **no** second analyze. Postgres read-back: unchanged
`content_sha256` and `sealed_at`. **PASS.**

---

## 8. Market provenance notes

- Lottery prices: operator-attested screenshot values at `manifestCollectedAt`
  `2026-09-15T22:05:00+08:00`.
- Independent AH: Bet365 instant line via jihai8 aggregation (`providerMethod=
  jihai8-instant-asian-handicap-index`).
- Independent O/U: Bet365 2.5 card via FootyMetrics public reference
  (`providerMethod=footymetrics-public-bet365-card`).
- OddsSafari match page `2314006` cited in `sourceReference` for cross-check.

---

## 9. Recommendation

**A. PASS — AUTHENTIC CLASS A PRE_MATCH SEAL ARTIFACT ADMITTED** for scope
`prematch-seal:lottery:csl:20260915:周二012:23fdf75e…` only.
