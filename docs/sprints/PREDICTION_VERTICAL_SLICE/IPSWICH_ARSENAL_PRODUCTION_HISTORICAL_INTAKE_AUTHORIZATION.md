# Ipswich–Arsenal Production Historical Intake Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-09-28 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** (Prediction Evaluation) |
| Authorizing review | `IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_REVIEW.md` (Decision: **A. READY**) |
| Status | **HUMAN AUTHORIZATION GRANTED & IMPLEMENTED** |
| Authorized artifact | **Exactly ONE pair** (Ipswich Town vs Arsenal, `lottery:csl:20260915:周二012`) |
| Real ingest executed | **NO** (Strictly forbidden in this task) |
| History row count | **0 rows** (Before and after) |
| Governance status | `historical_evaluation_intake: C_BLOCKED` |
| Next action | `IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_IMPLEMENTATION_REVIEW` |

This document records the human production Historical Evaluation Intake authorization grant and its runtime configuration implementation for the single real artifact pair: Ipswich Town vs Arsenal (`lottery:csl:20260915:周二012`).

This authorization permits **ONLY** the configuration of the artifact-scoped production authorization registry. It does **NOT** authorize or execute the real Historical Evaluation Intake itself.

---

## 1. Human Decision and Scope

### 1.1 Human Authorization Mandate
- **Scope**: Approval of the production Historical Evaluation Intake authorization grant for **exactly ONE** real artifact pair:
  - Match: Ipswich Town vs Arsenal
  - `matchId`: `lottery:csl:20260915:周二012`
- **Foundation**: Based on the completed review:
  `docs/sprints/PREDICTION_VERTICAL_SLICE/IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_REVIEW.md`
  which concluded:
  `A. READY FOR HUMAN IPSWICH–ARSENAL PRODUCTION HISTORICAL INTAKE AUTHORIZATION`
- **Boundary**: Authorization permits ONLY the configuration of the artifact-scoped runtime authorization registry. It does NOT authorize real Historical Evaluation Intake execution.

---

## 2. Exact Authorized Artifact Identity

The authorization binds exclusively to the exact identity re-verified from the live PostgreSQL database (`fas_local`):

| Property | Exact Persisted Value |
|---|---|
| `matchId` | `lottery:csl:20260915:周二012` |
| Fixture | Ipswich Town vs Arsenal (伊普斯维奇 vs 阿森纳) |
| Competition | `eng:efl-cup` (EFL Cup / 英联赛杯) |
| Season | `2025/26` |
| Kickoff | `2026-09-16T03:00:00+08:00` |
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `originalSealChecksum` (`contentSha256`) | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `resultEvidenceId` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| `admissionReviewId` | `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18` |

No wildcard, competition-level, season-level, or default authorization was granted or implemented.

---

## 3. Runtime Authorization Implementation

The production authorization registry was modified in:
`packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts`

### 3.1 Registry Implementation Code

```typescript
export const PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY = Object.freeze({
  schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  globalProductionHistoricalIntakeEnabled: true,
  authorizedPairs: Object.freeze([
    Object.freeze({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      resultEvidenceId:
        "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
      admissionReviewId:
        "HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18",
    }),
  ]) as readonly HistoricalIntakeAuthorizedPair[],
}) satisfies HistoricalIntakeProductionAuthorizationPolicy;
```

### 3.2 Registry Counts
- Total authorized pairs in production registry: **1**
- List of authorized pairs: exactly `[Ipswich Town vs Arsenal]`
- Unlisted Class A pairs (e.g. Liverpool candidate): **0**

---

## 4. Semantics of the Global Flag

The flag setting:
`globalProductionHistoricalIntakeEnabled = true`

does **NOT** mean:
*"all valid Class A artifacts are authorized"*

It means:
*"the production historical intake authorization mechanism is enabled"*

Under `assertHistoricalIntakeProductionAuthorization`:
1. If `globalProductionHistoricalIntakeEnabled === false`:
   All intake calls fail with `PRODUCTION_INTAKE_NOT_AUTHORIZED`.
2. If `globalProductionHistoricalIntakeEnabled === true`:
   An artifact enters intake **if and only if** its exact triple:
   $$\text{originalSealId} \wedge \text{originalSealChecksum} \wedge \text{resultEvidenceId}$$
   matches an entry in `authorizedPairs` with a non-empty `admissionReviewId`.
3. Every unlisted artifact (including any other authentic Class A seal) is strictly rejected with:
   `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`.

---

## 5. Governance State Synchronization (`docs/PROJECT_STATE.md`)

The governance snapshot in `docs/PROJECT_STATE.md` has been synchronized with the runtime authorization state:

```yaml
production_historical_intake_authorized: true
production_historical_intake_authorization_scope: ARTIFACT_SCOPED_ONLY
production_historical_intake_authorized_match_id: lottery:csl:20260915:周二012
production_historical_intake_authorized_original_seal_id: prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9
next_action: IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_IMPLEMENTATION_REVIEW
next_production_capability: REAL_PREMATCH_CLASS_A_SEAL_CAPTURE_VERIFICATION
```

### Governance Clarifications
- `production_historical_intake_authorized: true` is strictly **artifact-scoped** to the Ipswich–Arsenal pair.
- All other artifacts remain **unauthorized**.
- `historical_evaluation_intake` remains **`C_BLOCKED`**.
- Ipswich has **NOT** yet been ingested.

---

## 6. Real Data Protection & Ingest Prohibition

Strict verification before and after implementation confirms:

| Metric | Before Implementation | After Implementation |
|---|---|---|
| Database connection | PostgreSQL (`fas_local`) | PostgreSQL (`fas_local`) |
| Ipswich EvaluationHistory rows | **0** | **0** |
| Total EvaluationHistory rows in DB | **0** | **0** |
| Ipswich Seal `contentSha256` | `ecd427e5...410e` | `ecd427e5...410e` (unchanged) |
| Actual Evidence `id` | `evidence-itfc...match-result` | `evidence-itfc...match-result` (unchanged) |
| Actual Evidence payload | Verified 2-4 | Verified 2-4 (unchanged) |

**Confirmation**:
- Zero real ingest operations ran.
- Zero EvaluationHistory records were written or mutated.
- Zero seal or evidence records were modified.

---

## 7. Population Firewalls and Limitations

1. **Population Firewalls Unaltered**:
   Intake records remain hardcoded with:
   - `calibrationEligible = false`
   - `validationEligible = false`
   - `contributionEligible = false`
   - `replayCohortEligible = false`
   No downstream usage authorization is granted.
2. **Season Classification**:
   `season = "2025/26"` remains classified as **`AGGREGATION_BLOCKER_ONLY`**. The artifact is not mutated.
3. **Multi-Market Limitation**:
   Consumed lottery 1X2 market only; remains classified as **`PROVENANCE / MODEL LIMITATION ONLY`**. Historical prediction is not rewritten.

---

## 8. Test Verification Evidence

Automated test suites in `packages/statistics/test/historical-intake-production-authorization.spec.ts` prove the authorization boundary:

| Requirement | Test Description | Result |
|---|---|---|
| 1. Production registry global enabled | `ships the production registry as global true and exactly one authorized pair` | **PASS** |
| 2. Exactly one real pair listed | Asserts `authorizedPairs.length === 1` and matches Ipswich triple | **PASS** |
| 3. Exact Ipswich triple passes | `passes authorization assertion for the exact Ipswich triple against production policy` | **PASS** |
| 4. Second Class A pair fails | `rejects an unlisted second valid Class A pair against production policy` (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) | **PASS** |
| 5. Wrong `resultEvidenceId` fails | `rejects when resultEvidenceId differs from the authorized triple` (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) | **PASS** |
| 6. Wrong `originalSealChecksum` fails | `rejects when originalSealChecksum differs from the authorized triple` (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) | **PASS** |
| 7. Wrong `originalSealId` fails | `rejects when originalSealId differs from the authorized triple` (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) | **PASS** |
| 8. No wildcard / partial matching | `rejects partial or prefix matching against the authorized triple` (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) | **PASS** |
| 9. Public ingest fail-closed | `rejects public ingest of an unlisted Class A pair with ARTIFACT_NOT_PRODUCTION_AUTHORIZED` | **PASS** |
| 10. Test helper non-public | `does not expose the test-only helper on the supported public package API` | **PASS** |
| 11. Full statistics suite | `vitest run --project statistics` (20 test files, 212 tests) | **PASS** |
| 12. Full workspace vitest | `pnpm vitest run` (109 passed, 738 tests passed) | **PASS** |
| 13. Typecheck | `pnpm --filter @fas/statistics typecheck` | **PASS** |
| 14. Build boundary | `pnpm --filter @fas/statistics build` | **PASS** |
| 15. Quality & dependency checks | `pnpm quality` (biome check, depcruise, boundaries) | **PASS** |

---

## 9. Final Delivery State

```yaml
runtime_authorization_policy:
  schemaVersion: historical-intake-production-authorization.v1
  globalProductionHistoricalIntakeEnabled: true
  authorizedPairs_count: 1
  authorized_match: lottery:csl:20260915:周二012
governance_state:
  production_historical_intake_authorized: true
  production_historical_intake_authorization_scope: ARTIFACT_SCOPED_ONLY
  historical_evaluation_intake: C_BLOCKED
database_state:
  ipswich_evaluation_history_rows: 0
  total_evaluation_history_rows: 0
```

---

## 10. Next Governance Action

The implementation of the Ipswich–Arsenal artifact-scoped production authorization is complete.

The exact next governance action is:
**`IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_IMPLEMENTATION_REVIEW`**

Real Historical Evaluation Intake must **NOT** be executed until that review passes and a separate real-ingest authorization is granted.
