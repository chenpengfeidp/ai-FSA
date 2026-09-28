# Ipswich–Arsenal Production Historical Intake Authorization Review

| Field | Value |
|---|---|
| Review type | Production authorization review (read-only; single artifact pair) |
| Date | 2026-09-28 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** (Prediction Evaluation) |
| Named gate | `IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_REVIEW` |
| Candidate `matchId` | `lottery:csl:20260915:周二012` |
| Fixture | Ipswich Town vs Arsenal（伊普斯维奇 vs 阿森纳） |
| Admitted `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| Admitted `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| Admitted `resultEvidenceId` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| Prior Artifact Admission | **PASS** (`HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18.md`) |
| Prior Gap Implementation | **PASS** (`HISTORICAL_INTAKE_ARTIFACT_SCOPED_AUTHORIZATION_GAP_IMPLEMENTATION_REVIEW.md`) |
| **Decision** | **A. READY FOR HUMAN IPSWICH–ARSENAL PRODUCTION HISTORICAL INTAKE AUTHORIZATION** |
| Production code modified | **NO** |
| Authorization registry modified | **NO** |
| `globalProductionHistoricalIntakeEnabled` | **false** (unchanged) |
| `PROJECT_STATE.md` YAML flag | `production_historical_intake_authorized: false` (unchanged) |
| `historical_evaluation_intake` | `C_BLOCKED` (unchanged) |
| Real ingest executed | **NO** |
| Evaluation History rows | **0** |

---

## 1. Review Baseline and Governance Context

This review executes the single-artifact production Historical Intake authorization review for the real Ipswich Town vs Arsenal pair (`lottery:csl:20260915:周二012`).

### 1.1 Governance hierarchy

The review is governed by:
1. `AGENTS.md` (Product Development Phase iron rules; no new engines; no unapproved documentation branches);
2. `docs/PROJECT_STATE.md` (snapshot: `next_action: IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_REVIEW`);
3. `docs/40_PRODUCT_ROADMAP.md` (Sprint **A1** Prediction Evaluation);
4. `docs/PROJECT_INDEX.md`;
5. `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md` (canonical FIP protocol);
6. Prior delivery evidence:
   - `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_REVIEW_2026-09-17.md`
   - `AUTHENTIC_SEAL_ACTUAL_PAIR_ARTIFACT_REVIEW_IPSWICH_ARSENAL_2026-09-17.md`
   - `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18.md`
   - `PRODUCTION_HISTORICAL_EVALUATION_INTAKE_AUTHORIZATION_REVIEW_2026-09-18.md`
   - `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP_REVIEW.md`
   - `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_GAP_IMPLEMENTATION_AUTHORIZATION.md`
   - `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_GAP_IMPLEMENTATION_REPORT.md`
   - `HISTORICAL_INTAKE_ARTIFACT_SCOPED_AUTHORIZATION_GAP_IMPLEMENTATION_REVIEW.md`

### 1.2 Git working tree at review start

- `HEAD`: `20de2bd feat(statistics): 支持历史评估摄入工件级授权`
- Status:
  - `M docs/PROJECT_INDEX.md`
  - `M docs/PROJECT_STATE.md`
  - `?? docs/sprints/PREDICTION_VERTICAL_SLICE/HISTORICAL_INTAKE_ARTIFACT_SCOPED_AUTHORIZATION_GAP_IMPLEMENTATION_REVIEW.md`

---

## 2. Review Subject — Exact Real Artifact Identity

The review reloaded the exact persisted records from the PostgreSQL system of record (`fas_local`) via the Prisma persistence adapters:

| Attribute | Persisted Truth |
|---|---|
| `matchId` | `lottery:csl:20260915:周二012` |
| Fixture | Ipswich Town vs Arsenal (伊普斯维奇 vs 阿森纳) |
| Competition | `eng:efl-cup` (`EFL Cup / 英联赛杯`) |
| Season | `2025/26` |
| Kickoff | `2026-09-16T03:00:00+08:00` (19:45 BST) |
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `sealIdentityHash` | `23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` |
| Actual Evidence ID (`resultEvidenceId`) | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| Actual `observedAt` | `2026-09-17T03:01:13.950Z` |
| Actual Result | Home 2, Away 4, Winner: `away`, Status: `FINISHED` |

No chat values were accepted blindly; every value was verified from the live database.

---

## 3. Re-verification of Artifact Eligibility

All eligibility criteria established during prior reviews were re-verified against live database records and TypeScript domain validators:

| Check | Requirement | Result | Evidence |
|---|---|---|---|
| **A. Authentic Class A Seal** | Authentic Class A `PRE_MATCH` seal exists | **PASS** | Persisted row in `PrematchPredictionSealItem` |
| **B. Append-only / Unchanged** | Seal has not mutated since admission | **PASS** | `contentSha256` exactly matches `ecd427e5...410e` |
| **C. Canonical Authentication** | Seal checksum validates canonically | **PASS** | `authenticatePrematchPredictionSeal(seal)` executes without error |
| **D. Synthetic Status** | `synthetic === false` | **PASS** | Stored `synthetic: false` |
| **E. Historical Authenticity** | `historicalAuthenticity === true` | **PASS** | Stored `historicalAuthenticity: true` |
| **F. Provenance Class** | `provenanceClass === "A"` | **PASS** | Stored `provenanceClass: "A"` |
| **G. Allowed Usage Metadata** | Contains `historical_evaluation_intake` | **PASS** | `allowedUsage: ["historical_evaluation_intake"]`. Recognized as **eligibility metadata only**, not authorization. |
| **H. Verified Actual Exists** | Verified Actual Evidence exists | **PASS** | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` reloaded |
| **I. Actual Quality & Verification** | `quality: "verified"`, `realWorldVerification: true` | **PASS** | `quality: "verified"`, `realWorldVerification: true`, `verificationClass: "verified-real-world"` |
| **J. Exact Fixture Binding** | Match, home/away, competition, season, kickoff identical | **PASS** | Both seal and actual bind to `lottery:csl:20260915:周二012`, `伊普斯维奇` (home), `阿森纳` (away), `eng:efl-cup`, `2025/26`, `2026-09-16T03:00:00+08:00` |
| **K. Temporal Integrity** | `analysisTime < kickoff`, `observedAt > kickoff`, no leakage | **PASS** | `analysisTime` (14:22 UTC Sep 15) < kickoff (19:00 UTC Sep 15); `observedAt` (03:01 UTC Sep 17) > kickoff; 9 pre-match Evidence items collected ≤ cutoff; `assertHistoricalIntakeTemporalIntegrity` **PASS** |
| **L. No Retrospective Backfill** | `reconstructed` and `generatedByCurrentAnalysisPipeline` absent/false | **PASS** | Not reconstructed; authentic pre-match capture |
| **M. Sealed Prediction Snapshot** | Evaluation input sourced only from seal | **PASS** | `predictionSnapshot` (`pHome: 0.2597`, `pDraw: 0.1640`, `pAway: 0.5763`) read from seal |

---

## 4. Confirmation of Prior Artifact Admission Continuity

1. **Prior Admission Status**:
   - The named gate `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW` concluded with `A. PASS — REAL CLASS A ARTIFACT ADMITTED FOR FUTURE HISTORICAL EVALUATION INTAKE` on 2026-09-18.
2. **Identity Match**:
   - The admission applied to:
     - `originalSealId`: `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9`
     - `originalSealChecksum`: `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e`
     - `resultEvidenceId`: `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result`
3. **No Subsequent Invalidation**:
   - No repository commit, code update, or database operation has altered or invalidated this admission.
4. **Canonical Review Identifier**:
   - The canonical identifier for this admission is:
     `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18`
     (located at `docs/sprints/PREDICTION_VERTICAL_SLICE/HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18.md`).
   - This exact string satisfies the required `admissionReviewId` audit metadata property.

---

## 5. Assessment of Potential Blockers

Three specific epistemic and operational boundaries were reassessed:

### 5.1 Season Value and Season Normalization
- **Observation**: The seal records `season: "2025/26"` and the Actual Evidence records `season: "2025/26"`. They match identically, ensuring fixture binding. Some earlier vertical slice fixtures or lottery catalog rows used single-year conventions (e.g. `"2026"`).
- **Classification**: Remains **`AGGREGATION_BLOCKER_ONLY`**.
- **Impact on Intake**: It does not block single-artifact intake. Cross-season queries or multi-season cohort aggregations will require normalization in downstream query services.
- **Rule**: The existing seal and Actual must **not** be mutated or silently rewritten.

### 5.2 Multi-Market Provenance
- **Observation**: The sealed prediction snapshot consumed only China Sports Lottery 1X2 market features (`MARKET_LEAN_AWAY`, implied probabilities), even though Asian Handicap (AH) and Over/Under (O/U) market evidence was also captured and persisted for the fixture.
- **Classification**: Remains **`PROVENANCE / MODEL LIMITATION ONLY`**.
- **Impact on Intake**: Historical Evaluation evaluates the historical prediction *as it was sealed*, preserving authentic epistemic provenance. The omission of AH/OU in projection features reflects the capability of the model at capture time (`feature.v2.m1b.manager`). It is not an eligibility or intake blocker.

### 5.3 Population Use and Firewalls
- **Observation**: If intake is later executed, the resulting `EvaluationHistoryRecord` will have:
  - `calibrationEligible: false`
  - `validationEligible: false`
  - `contributionEligible: false`
  - `replayCohortEligible: false`
- **Confirmation**: Downstream calibration, validation, learning contribution, and replay cohort selectors unconditionally filter out records where these flags are false.
- **Boundary**: This authorization review does **not** authorize calibration, validation, contribution, or replay usage for this artifact.

---

## 6. Verification of Runtime Authorization Infrastructure

The gap implementation review (`HISTORICAL_INTAKE_ARTIFACT_SCOPED_AUTHORIZATION_GAP_IMPLEMENTATION_REVIEW.md`) passed with **A. PASS**. The active infrastructure status is confirmed:

1. **Public Intake is Fail-Closed**:
   - `ingestHistoricalEvaluation` in `@fas/statistics` binds the frozen module-level `PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY` at initialization.
   - External callers cannot pass a custom policy or bypass authorization through arguments.
2. **Runtime Policy is TypeScript v1**:
   - Defined in `packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts`.
   - Current values:
     - `globalProductionHistoricalIntakeEnabled: false`
     - `authorizedPairs: []`
3. **Exact Triple Identity Enforcement**:
   - `assertHistoricalIntakeProductionAuthorization` requires exact strict equality (`===`) for:
     - `originalSealId`
     - `originalSealChecksum`
     - `resultEvidenceId`
   - Plus required non-empty `admissionReviewId`.
4. **Current Status of Ipswich**:
   - Ipswich is **NOT** currently listed in `authorizedPairs`.
   - Any current invocation of public `ingestHistoricalEvaluation` fails closed with:
     `PRODUCTION_INTAKE_NOT_AUTHORIZED` ("Production Historical Evaluation Intake is not globally enabled.").
5. **Fail-Closed Unlisted Rejection**:
   - If `globalProductionHistoricalIntakeEnabled` is set to `true` while `authorizedPairs` contains only Ipswich, every other Class A seal (including valid authentic Class A candidates such as Liverpool) will throw `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`.

---

## 7. Definition of the Exact Future Authorization Grant

Because this review finds the artifact and infrastructure ready, the exact parameters for a future human authorization grant are defined:

### 7.1 Exact Authorized Pair Specification

```typescript
{
  originalSealId: "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
  originalSealChecksum: "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
  resultEvidenceId: "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
  admissionReviewId: "HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18",
}
```

### 7.2 Required Runtime Code Changes

To activate this authorization, a future human-directed implementation task must edit:
`packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts`
to:
1. Set `globalProductionHistoricalIntakeEnabled: true`.
2. Append the single exact Ipswich–Arsenal pair above to `authorizedPairs`.

### 7.3 Protection Against Unlisted Class A Ingest

- **Proof**: `assertHistoricalIntakeProductionAuthorization` executes:
  ```typescript
  const authorized = policy.authorizedPairs.some(
    (pair) =>
      pair.originalSealId === seal.originalSealId &&
      pair.originalSealChecksum === seal.originalSealChecksum &&
      pair.resultEvidenceId === actual.evidence.id,
  );
  if (!authorized) {
    throw new HistoricalEvaluationIntakeError("ARTIFACT_NOT_PRODUCTION_AUTHORIZED", ...);
  }
  ```
- If `authorizedPairs` contains only the Ipswich–Arsenal pair, no other Class A seal can match. Any call with another artifact will throw `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`, preventing unauthorized intake.

### 7.4 Governance State (YAML) Synchronization Recommendation

- **Source of Truth Distinction**:
  - The TypeScript registry (`historical-intake-production-authorization.v1.ts`) is the **runtime source of truth**.
  - `docs/PROJECT_STATE.md` YAML is the **governance snapshot**.
- **Synchronization Rule**:
  - To prevent long-term documentation divergence where runtime is active but governance claims `production_historical_intake_authorized: false`, the human grant implementation must **synchronize both simultaneously**.
  - When the runtime registry is edited, `docs/PROJECT_STATE.md` must be updated to reflect that production intake is authorized specifically for Ipswich–Arsenal.

### 7.5 Status of `historical_evaluation_intake`

- **Governance State**: In FAS governance, `historical_evaluation_intake` remains **`C_BLOCKED`** until the real intake is separately authorized and executed.
- Authorization of the artifact is not execution of ingest. The status does not become unblocked or complete until the real intake command runs and writes the verified row.

---

## 8. Separation of Concerns: Authorization != Ingest

FAS governance strictly separates these lifecycle phases:

```text
1. Artifact Admitted (Class A + Verified Actual PASS)
     ↓
2. Production Authorization Reviewed (THIS STEP — Verification of readiness)
     ↓
3. Human Production Authorization Grant (Explicit human sign-off)
     ↓
4. Authorization Implementation (Update TypeScript v1 policy & sync PROJECT_STATE)
     ↓
5. Authorization Verification (Build, test, confirm fail-closed behavior)
     ↓
6. Separately Authorized Real Ingest (Execute intake for Ipswich–Arsenal)
     ↓
7. Post-Ingest Verification (Confirm 1 EvaluationHistory row, idempotent retry)
```

**Explicit Confirmation**: A PASS in this review does **NOT**:
- Modify the authorization registry;
- Set `globalProductionHistoricalIntakeEnabled` to true;
- Set `production_historical_intake_authorized` to true in `PROJECT_STATE.md`;
- Execute `ingestHistoricalEvaluation`;
- Insert any record into `evaluation_history_items`;
- Authorize calibration, validation, contribution, or replay usage.

---

## 9. Existing Evaluation History Check

A read-only query was executed against the PostgreSQL database (`fas_local`):
- Filter: `matchId = "lottery:csl:20260915:周二012"`
  - Result: **0 rows**
- Filter: `originalSealId = "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9"`
  - Result: **0 rows**
- Total evaluation history rows across all fixtures: **0 rows**

**Conclusion**: PASS. No historical intake record exists.

---

## 10. Summary Checklist

| # | Item | Status | Finding |
|---|---|---|---|
| 1 | Exact artifact identity verified from persisted truth | **PASS** | `lottery:csl:20260915:周二012`, `23fdf75e...`, `ecd427e5...` |
| 2 | Seal authenticity result | **PASS** | Class A, `synthetic: false`, `historicalAuthenticity: true` |
| 3 | Actual verification result | **PASS** | `quality: "verified"`, `realWorldVerification: true`, 2-4 away win |
| 4 | Fixture binding result | **PASS** | Perfect match on matchId, teams, competition, season, kickoff |
| 5 | Temporal integrity result | **PASS** | Pre-match cutoff before kickoff; post-match observation after kickoff |
| 6 | Artifact Admission Review continuity result | **PASS** | Admission remains valid; no invalidating changes |
| 7 | Existing History row count | **PASS** | Strictly 0 rows |
| 8 | Season blocker classification | **PASS** | `AGGREGATION_BLOCKER_ONLY`; no artifact mutation |
| 9 | Multi-market provenance classification | **PASS** | `PROVENANCE / MODEL LIMITATION ONLY`; epistemic truth preserved |
| 10 | Population firewall status | **PASS** | All 4 population flags remain false; selectors filter intake rows |
| 11 | Runtime authorization infrastructure status | **PASS** | Fail-closed, TypeScript v1, exact triple matching active |
| 12 | Exact proposed authorization triple | **DEFINED** | `(originalSealId, originalSealChecksum, resultEvidenceId)` |
| 13 | Exact `admissionReviewId` | **DEFINED** | `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18` |
| 14 | Global runtime enable requirement | **CONFIRMED** | `globalProductionHistoricalIntakeEnabled: true` required |
| 15 | Unlisted Class A rejection proof | **CONFIRMED** | Non-matching triples fail closed (`ARTIFACT_NOT_PRODUCTION_AUTHORIZED`) |
| 16 | YAML/runtime synchronization recommendation | **CONFIRMED** | Update `PROJECT_STATE.md` YAML alongside TypeScript registry |
| 17 | Exact scope of future human grant | **DEFINED** | Single pair only; no population or general intake grant |
| 18 | Authorization != ingest statement | **EXPLICIT** | Preserved across all sections |
| 19 | Confirmation no code changed | **CONFIRMED** | Zero production code modified in this review |
| 20 | Confirmation no registry changed | **CONFIRMED** | `historical-intake-production-authorization.v1.ts` untouched |
| 21 | Confirmation no real ingest ran | **CONFIRMED** | Ingest not executed; database history remains 0 |

---

## 11. Final Decision

**A. READY FOR HUMAN IPSWICH–ARSENAL PRODUCTION HISTORICAL INTAKE AUTHORIZATION**

### Next Governance Action

The review is complete and the single real artifact pair is confirmed fully ready for production authorization. 

The immediate next step is the **Human Production Historical Intake Authorization Grant**:
1. Review this document (`IPSWICH_ARSENAL_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_REVIEW.md`).
2. Provide explicit human authorization to list the single Ipswich–Arsenal artifact pair:
   - `originalSealId: "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9"`
   - `originalSealChecksum: "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e"`
   - `resultEvidenceId: "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result"`
   - `admissionReviewId: "HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18"`
3. Authorize the subsequent task to update `historical-intake-production-authorization.v1.ts` and synchronize `docs/PROJECT_STATE.md`.
