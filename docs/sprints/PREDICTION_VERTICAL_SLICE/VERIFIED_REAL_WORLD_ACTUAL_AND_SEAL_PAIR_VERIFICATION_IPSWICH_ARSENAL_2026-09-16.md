# Verified Real-World Actual + Admitted Class A Seal Pair Verification

| Field | Value |
|---|---|
| Date (initial) | 2026-09-16 |
| Recovery completed | 2026-09-17 |
| `matchId` | `lottery:csl:20260915:周二012` |
| Pair result | **A. PASS — AUTHENTIC CLASS A SEAL + VERIFIED REAL-WORLD ACTUAL PAIR ESTABLISHED** |
| Historical Evaluation Intake | **C_BLOCKED** (unchanged) |

---

## 1. Season semantics (pre-persistence gate)

**Verdict: A — `2025/26` is correct for governed FAS fixture identity.**

| Source | Rule |
|---|---|
| PVS-4 manifest | Operator-attested `season` on `lottery-fixture-manifest.v1` (`2026-09-15-ips-ars-lottery-manifest.v1.json` → `2025/26`) |
| Architecture compatibility review | *Explicit sports season string (may differ from calendar year); required on seal.* |
| Intake gate (future) | Exact `season` binding between seal and Actual — **no** kickoff-derived season normalization in code |

The admitted seal and `MATCH_INFO` carry `2025/26`. Verified Actual **copies seal `season`** for binding; the seal is **not** mutated. External UK calendar labeling for a September 2026 kickoff may differ; that is a **metadata caveat** for future Historical Intake review, not a reason to rewrite season on Actual without a new governed fixture revision.

---

## 2. Admitted seal (Postgres, unchanged)

| Field | Value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `kickoff` | `2026-09-16T03:00:00+08:00` |
| Teams | 伊普斯维奇 / 阿森纳 |
| `competitionId` | `eng:efl-cup` |
| `season` | `2025/26` |

Post-Actual reload: **unchanged** (`sealUnchanged: true`).

---

## 3. Real-world result

| Field | Value |
|---|---|
| Score | Ipswich Town **2** – **4** Arsenal (home/away) |
| `matchStatus` | `FINISHED` |
| `winner` | `away` |
| Authority | [Arsenal FC official match report](https://www.arsenal.com/news/report-ipswich-town-2-4-arsenal-ajWTj8V8S3qK); Ipswich ecosystem reporting (e.g. TWTD) corroborates |

---

## 4. Persisted MATCH_RESULT

| Field | Value |
|---|---|
| `Evidence.id` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| `type` | `MATCH_RESULT` |
| `quality` | `verified` |
| `realWorldVerification` | `true` |
| `observedAt` (actual capture) | `2026-09-17T03:01:13.950Z` |
| `providerSource` / `providerSourceId` / `method` | `itfc.co.uk` / `carabao-cup-2026-09-15:ipswich-arsenal:ft:2-4` / `official-club-match-report` |
| Persistence path | `PrismaEvidenceRepository.save` via `persist-verified-actual-ips-ars.mjs` |
| Idempotency | Second run returned same row (no duplicate) |

Run artifact: `verification-artifacts/2026-09-17-ips-ars-verified-actual-persist-run.json`

---

## 5. `ActualMatchResult` mapping

`mapActualMatchResultFromEvidence` → `FINISHED`, home 2, away 4, winner `away`, `observedAt` as persisted.

---

## 6. Fixture binding

Exact match: `matchId`, Chinese home/away on seal, `competitionId` / `competitionName`, `season`, `kickoff` on payload aligned with `sealIdentity`.

---

## 7. Temporal integrity

| Check | Result |
|---|---|
| `analysisCutoff === analysisTime` | PASS |
| `analysisTime` < kickoff | PASS |
| `sealedAt` < kickoff | PASS |
| `observedAt` > kickoff | PASS |
| PRE_MATCH analyze had `MATCH_RESULT` | **0** at seal time (unchanged) |

---

## 8. Durable reload

Script disconnects and reconnects Prisma; evidence and seal values unchanged on reload.

---

## 9. Historical Intake

**Not started.** `historical_evaluation_intake: C_BLOCKED`, `production_historical_intake_authorized: false`.

---

## 10. Recommendation

**A. PASS — AUTHENTIC CLASS A SEAL + VERIFIED REAL-WORLD ACTUAL PAIR ESTABLISHED**

`next_action`: **AUTHENTIC_SEAL_ACTUAL_PAIR_ARTIFACT_REVIEW**
