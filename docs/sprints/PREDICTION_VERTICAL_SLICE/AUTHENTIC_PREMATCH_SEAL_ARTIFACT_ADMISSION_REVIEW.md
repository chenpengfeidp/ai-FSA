# Authentic PRE_MATCH Seal — Artifact Admission Review

| Field | Value |
|---|---|
| Review type | Governance / artifact admission (no new analysis) |
| Date | 2026-09-15 |
| Repository HEAD | `bb2d925f3d066b44e1cafe2f83a3b6668b755f3f` (at review) |
| Production code changed | **No** |
| Admission scope | **First candidate row only** (see §2) |
| Primary recommendation | **B. BLOCKED — CANDIDATE CLASS A ARTIFACT NOT ADMITTED** |

---

## 0. First hard blocker

**B. BLOCKED — OPERATOR-ATTESTED LOTTERY HANDICAP-RESULT MARKET NOT PRESENT IN GOVERNED EVIDENCE SET**

The verification manifest attests China Sports Lottery three-way handicap-result
(2.78 / 3.65 / 2.02, `lottery-official-handicap-result-minus-one`). Postgres
`evidence_items` for this match contains **only one** `china-sports-lottery` ODDS
row (1X2: 1.62 / 3.82 / 4.00). The handicap-result row was **not** persisted or
used. Admission cannot certify honest bounded multi-market provenance for the
operator-attested lottery handicap market.

Root cause (observed, not fixed in this review): ODDS evidence id pattern
`evidence-${source}-${matchId}-odds` collapses multiple lottery-sourced ODDS
inputs to a single domain id (see `fixture-evidence-set-normalizer.ts`).

---

## 1. Repository / governance state (verified)

Expected pre-review state matched `docs/PROJECT_STATE.md`:

- `candidate_authentic_class_a_prematch_seal: CAPTURED_AWAITING_ARTIFACT_ADMISSION_REVIEW`
- `next_action: AUTHENTIC_PREMATCH_SEAL_ARTIFACT_ADMISSION_REVIEW`
- `historical_evaluation_intake: C_BLOCKED`
- `production_historical_intake_authorized: false`

---

## 2. Admission scope

**In scope (first candidate only):**

```text
originalSealId =
prematch-seal:lottery:csl:20260915:周二011:d63058fdd561cbe09375cf068b4e3eca5c46bf00147ebfefbf9b0941d061ec42
```

**Out of scope (documented, not deleted):**

| Field | Second row |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二011:b4314967fba8e09b03a465eb3172f8586c85e57f8f31c7793ae964c1c777a558` |
| `sealedAt` | `2026-09-15T08:47:28.521Z` |
| `analysisTime` (in `recordJson`) | `2026-09-15T08:47:28.442Z` |

Separate PRE_MATCH analysis after API restart with new `analysisTime`; not an
exact retry; not contamination of the first row. If otherwise valid before
kickoff, it remains a **separate later candidate** outside this admission.

---

## 3. Raw persisted artifact (first row)

Read directly from `prematch_prediction_seal_items`:

| Column | Value |
|---|---|
| `id` | `47f5b068-3167-5d94-a0d4-d2046578a788` |
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二011:d63058fdd561cbe09375cf068b4e3eca5c46bf00147ebfefbf9b0941d061ec42` |
| `matchId` | `lottery:csl:20260915:周二011` |
| `schemaVersion` | `prematch-prediction-seal.v1` |
| `homeTeam` | `利物浦` |
| `awayTeam` | `热刺` |
| `competitionId` | `eng:efl-cup` |
| `season` | `2025/26` |
| `kickoffAt` | `2026-09-15T19:00:00+00` |
| `sealedAt` | `2026-09-15T08:43:58.894+00` |
| `contentSha256` | `4c52a8b9d68c5ab825cbf7116451fcbbb12c3b3f27297e6627e3e0ee9e667a01` |
| `createdAt` | `2026-09-15T08:43:58.908+00` |

`recordJson.sealIdentity` includes `analysisTime` / `analysisCutoff` =
`2026-09-15T08:43:58.720Z`, `kickoff` = `2026-09-16T03:00:00+08:00`,
classification fields per §7.

---

## 4. Fixture authority

| Check | Verdict |
|---|---|
| `salesIssueId` | `20260915` |
| `lotteryMatchCode` | `周二011` |
| `matchId` | `lottery:csl:20260915:周二011` |
| Teams | 利物浦 (Liverpool) vs 热刺 (Tottenham) — operator Chinese names on seal |
| Kickoff | `2026-09-15T19:00:00Z` ≡ `2026-09-16T03:00:00+08:00` |

**salesIssueId semantics:** PVS-4 gate defines `salesIssueId` as *official lottery
sales period id* with example `20260913` (YYYYMMDD). Operator screenshot shows
list date **2026-09-15** without a separate opaque issue id. Using **`20260915`**
is **contract-valid** under the gate string + example pattern, with **explicit
ambiguity**: the screenshot alone does not prove a distinct non-date issue id if
Sporttery later uses another encoding. No silent reinterpretation applied.

---

## 5. PRE_MATCH temporal integrity

| Rule | Result |
|---|---|
| `analysisCutoff === analysisTime` | **PASS** (`2026-09-15T08:43:58.720Z`) |
| `max Evidence.collectedAt <= analysisCutoff` | **PASS** (all domain `collectedAt` = `2026-09-15T08:43:58.720Z`) |
| `analysisTime < kickoff` | **PASS** |
| `sealedAt >= analysisTime` | **PASS** (`08:43:58.894Z`) |
| `sealedAt < kickoff` | **PASS** |
| `MATCH_RESULT` count | **0** |
| Actual count | **0** |

**Note:** ODDS `payload.observedAt` = `2026-09-15T14:08:00+08:00` (operator
observation instant) is **≤** `analysisCutoff` when converted to UTC.

---

## 6. Evidence provenance (governed set in Postgres)

Seven `evidence_items` rows for `lottery:csl:20260915:周二011`:

| Type | Data source / sourceId | Market / payload summary |
|---|---|---|
| MATCH_INFO | `china-sports-lottery` / `lottery:20260915:周二011` | Fixture identity |
| TEAM_FORM ×2 | `fixture` / `fixture-…-form-{home,away}` | Manifest CORE |
| STATISTICS ×2 | `fixture` / `fixture-…-stats-{home,away}` | Manifest CORE |
| ODDS | `china-sports-lottery` / `lottery:…:1x2` | **1.62 / 3.82 / 4.00**, `marketSource=lottery-official` |
| ODDS | `oddssafari-efl-cup-2026-09-15` / `public:liverpool-tottenham-efl-cup-2026-09-15:1x2-ah-ou` | 1X2 1.80/3.75/4.10; **AH −1** 2.25/1.63; **O/U 3.5** 2.25/1.67; `marketSource=public-reference-consensus` |

### A. Lottery 1X2 — **PASS** (persisted)

### B. Lottery −1 three-way handicap-result — **FAIL (missing)**

Not present in `evidence_items`. Cannot confirm non-mislabeling as Asian Handicap
because the observation **did not enter** the governed Evidence set.

### C. Independent Asian Handicap — **PASS with caveat**

Values persisted on public ODDS row. Provenance: manifest `providerSource=
oddssafari-efl-cup-2026-09-15`, `sourceReference` on manifest lists
OddsSafari / BetDiary / FootballCalculator (2026-09-15). Not reducible to
`public-reference-consensus` alone in manifest artifact; DB `data_source` name
is concrete. **Not** a live book capture at `analysisTime`; operator-attested
consensus at manifest collection.

### D. Independent O/U — **PASS with same caveat** (same row as C)

### Overall provenance verdict

**BLOCKED** for admission due to §0 (missing lottery handicap-result Evidence).

---

## 7. Classification (from `recordJson`, not code inference)

| Field | Value |
|---|---|
| `schemaVersion` | `prematch-prediction-seal.v1` |
| `synthetic` | `false` |
| `historicalAuthenticity` | `true` |
| `provenanceClass` | `A` |
| `allowedUsage` | includes `historical_evaluation_intake` |
| `sourceAuthority` | `prisma.prematch_prediction_seal_items` |

---

## 8. Independent hash verification

Algorithm: `fas-json-canonical.v1` per `packages/statistics/src/seal/canonical-json.ts`.

| Check | Value |
|---|---|
| Computed `sealIdentityHash` | `d63058fdd561cbe09375cf068b4e3eca5c46bf00147ebfefbf9b0941d061ec42` |
| `originalSealId` match | **PASS** |
| Computed `contentSha256` | `4c52a8b9d68c5ab825cbf7116451fcbbb12c3b3f27297e6627e3e0ee9e667a01` |
| Persisted `contentSha256` match | **PASS** |

Recomputed in admission review using the same canonicalization rules as capture
verification (independent of calling `authenticatePrematchPredictionSeal` only).
Helper script (non-mutating):
`verification-artifacts/verify-seal-hash-first-candidate.mjs`.

---

## 9. Durability / immutability

| Check | Result |
|---|---|
| Row matches `REAL_PREMATCH_CAPTURE_VERIFICATION.md` Appendix D | **PASS** |
| Post-restart read-back (capture run) | **PASS** (documented) |
| Repository update path | **None** — `PrismaPrematchPredictionSealRepository.save` insert-only; existing `originalSealId` returns first row or conflicts |

---

## 10. Real-world idempotency finding

Exact same-session retry **not demonstrated**. Post-restart analyze used new
`analysisTime` → new seal identity (expected per implementation review §8).

**Verdict:** **A. Non-blocking** for admission. Implementation tests (T02) and
repository contract prove idempotency; missing field retry does not falsify
authenticity of the first artifact. It is a **documentation gap**, not an
admission blocker.

---

## 11. Admission decision

**B. BLOCKED — CANDIDATE CLASS A ARTIFACT NOT ADMITTED**

The first seal row is temporally sound, hash-authentic, Class-A-classified, and
durable, but **bounded honest Evidence provenance** fails for the operator-attested
lottery handicap-result market required by the verification manifest and audit §6B.

---

## 12. Historical Intake

Remains **C_BLOCKED**. No Intake, Calibration, Validation, Contribution, Actual,
or replay sidecar authorized.

---

## 13. Exact next Governance action

1. **Engineering (separate authorized task):** fix multi-source lottery ODDS
   persistence so distinct manifest odds rows (1X2 vs handicap-result) do not
   collapse to one Evidence id.
2. **Re-capture or re-verify** governed PRE_MATCH run with full PVS-4 market
   Evidence persisted before re-opening admission.
3. **Do not** admit this row until lottery handicap-result Evidence is present
   in the governed set or governance explicitly narrows scope.

Proposed `next_action` machine value:
`REMEDIATE_LOTTERY_MULTI_ODDS_EVIDENCE_PERSISTENCE_AND_RETRY_ARTIFACT_ADMISSION`

---

## 14. PROJECT_STATE (post-review)

```yaml
authentic_prematch_seal: NOT_FOUND
candidate_authentic_class_a_prematch_seal: CAPTURED_ADMISSION_BLOCKED
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
next_action: REMEDIATE_LOTTERY_MULTI_ODDS_EVIDENCE_PERSISTENCE_AND_RETRY_ARTIFACT_ADMISSION
```

`authentic_prematch_seal=FOUND` is **not** set (admission did not pass).
