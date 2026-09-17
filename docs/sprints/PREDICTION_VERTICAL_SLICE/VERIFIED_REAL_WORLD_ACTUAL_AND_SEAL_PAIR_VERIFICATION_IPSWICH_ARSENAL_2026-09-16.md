# Verified Real-World Actual + Admitted Class A Seal Pair Verification

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| `matchId` | `lottery:csl:20260915:周二012` |
| Admitted seal | `prematch-seal:lottery:csl:20260915:周二012:23fdf75e…` |
| Pair verification (agent session) | **BLOCKED — persistence not executed** |
| Historical Evaluation Intake | **C_BLOCKED** (unchanged) |

---

## 1. Repository state before run

```yaml
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
next_action: WAIT_FOR_MATCH_COMPLETION_AND_CAPTURE_VERIFIED_REAL_WORLD_ACTUAL
```

---

## 2. Admitted seal (read-only; do not mutate)

| Field | Value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `kickoff` | `2026-09-16T03:00:00+08:00` (`2026-09-15T19:00:00Z`) |
| `homeTeam` / `awayTeam` | 伊普斯维奇 / 阿森纳 |
| `competitionId` / `season` | `eng:efl-cup` / `2025/26` |
| `predictionSnapshot` | On seal (`pHome`≈0.26, `pDraw`≈0.16, `pAway`≈0.58) — **source of truth** |

Artifact: `verification-artifacts/2026-09-15-ips-ars-seal-recordJson.json`

---

## 3. Verified final score (external authority)

| Field | Value |
|---|---|
| Primary | Ipswich Town official club reporting ecosystem — **Ipswich Town 2–4 Arsenal** (Carabao / EFL Cup, Portman Road) |
| Corroboration | [Arsenal FC match report](https://www.arsenal.com/news/report-ipswich-town-2-4-arsenal-ajWTj8V8S3qK); [TWTD match report](https://www.twtd.co.uk/ipswich-town-news/52800/ipswich-town-2-4-arsenal--match-report) |
| **HOME** | **2** |
| **AWAY** | **4** |
| `matchStatus` | `FINISHED` |
| `winner` | `away` |

---

## 4. Governed MATCH_RESULT Evidence (planned)

Persist **only** via `EvidenceRepository.save` / idempotent import — **no** new schema.

| Field | Planned value |
|---|---|
| `Evidence.id` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| `type` | `MATCH_RESULT` |
| `providerSource` | `itfc.co.uk` |
| `providerSourceId` | `carabao-cup-2026-09-15:ipswich-arsenal:ft:2-4` |
| `providerMethod` | `official-club-match-report` |
| `quality` | `verified` |
| `realWorldVerification` | `true` (payload + verification bundle) |
| `observedAt` | `2026-09-16T15:35:00+08:00` (post-kickoff capture instant; **not** backdated to FT) |

Payload binds seal fixture identity: `homeTeam`, `awayTeam`, `competitionId`, `competitionName`, `season`, `kickoff` copied from admitted `sealIdentity`.

---

## 5. Temporal integrity (expected)

| Rule | Expected |
|---|---|
| `analysisTime` < kickoff | PASS |
| `sealedAt` < kickoff | PASS |
| `observedAt` > kickoff | PASS (`2026-09-16T15:35:00+08:00` > `2026-09-16T03:00:00+08:00`) |

---

## 6. Operator execution (required to establish pair)

```bash
cd football-analysis-system
export DATABASE_URL="postgresql://fas_local:<password>@127.0.0.1:5432/fas_local"
pnpm --filter @fas/database test -- verified-actual-ips-ars-pair
# or:
node docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/persist-verified-actual-ips-ars.mjs
```

Then verify:

- `GET /api/evidence/match/lottery:csl:20260915:周二012` includes one `MATCH_RESULT`
- Admitted seal row unchanged (`content_sha256`, `sealed_at`, `record_json`)

---

## 7. Pair completeness

| Check | Agent session |
|---|---|
| Admitted seal exists | **Yes** (documented) |
| Verified MATCH_RESULT in Postgres | **Not executed** (blocked runtime) |
| Seal immutability after Actual | **Not demonstrated** |
| **Pair established** | **No** |

---

## 8. Historical Intake

Remains **C_BLOCKED**. No Evaluation History, Calibration, Validation, or Contribution writes.

---

## 9. Recommendation

**B. BLOCKED — VERIFIED REAL-WORLD ACTUAL PAIR NOT ESTABLISHED** until operator runs §6 and confirms durable read-back.

After successful §6, update `PROJECT_STATE`:

```yaml
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
next_action: AUTHENTIC_SEAL_ACTUAL_PAIR_ARTIFACT_REVIEW_OR_HISTORICAL_INTAKE_GATE
```

(Do not set `FOUND_VERIFIED` without Postgres evidence.)
