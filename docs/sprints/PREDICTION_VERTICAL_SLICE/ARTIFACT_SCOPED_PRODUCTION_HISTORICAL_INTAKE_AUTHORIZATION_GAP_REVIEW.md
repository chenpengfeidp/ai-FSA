# Artifact-Scoped Production Historical Intake Authorization Gap — Design / Implementation Authorization Review

| Field | Value |
|---|---|
| Review type | Design / implementation-authorization review only |
| Date | 2026-09-22 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Named gate | `CLOSE_ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP` |
| Prior gate | `PRODUCTION_HISTORICAL_EVALUATION_INTAKE_AUTHORIZATION_REVIEW_2026-09-18.md` **B. BLOCKED** |
| **Decision** | **A. READY FOR HUMAN ARTIFACT-SCOPED AUTHORIZATION GAP IMPLEMENTATION APPROVAL** |
| Production code changed | **No** |
| Prisma schema changed | **No** |
| Real ingest executed | **No** |
| `production_historical_intake_authorized` | **false** (unchanged) |
| `historical_evaluation_intake` | **C_BLOCKED** (unchanged) |

This review does **not** authorize implementation, does **not** add Ipswich–Arsenal to any authorization registry, does **not** execute `ingestHistoricalEvaluation`, and does **not** flip the production flag.

---

## 1. Current gap (repository truth)

Inspected 2026-09-22 against source, `@fas/config`, Prisma schema, HTTP controllers, and `fas_local`.

| Claim | Evidence |
|---|---|
| Global YAML flag is unread | `production_historical_intake_authorized` exists only in Markdown/YAML. Zero TypeScript matches. `@fas/config` has no historical-intake setting. |
| Runtime ingest is not artifact-scoped | `ingestHistoricalEvaluation` validates Class A / Actual / temporal only, then saves. |
| Artifact Admission Review is documentary | No allowlist, no `admissionReviewId` check, no `originalSealId` registry. |
| `allowedUsage=historical_evaluation_intake` is eligibility, not authorization | `createPrematchPredictionSeal` **requires** that usage on every Class A seal; Prisma revive hardcodes it. |
| A second valid unreviewed Class A pair would ACCEPT | Command type is `{ seal, actual, intakeRecordedAt, replaySidecar? }`. Failure codes have no production-authorization variant. |
| Single-artifact production authorization | **NOT_SUPPORTED** until this gap is implemented. |

Required safety property (unchanged from the 2026-09-18 review):

```text
globalProductionHistoricalIntakeEnabled
AND exactArtifactPairProductionAuthorized
AND existing Class A / Actual / fixture / temporal gates
```

Fail closed otherwise.

---

## 2. Production call paths

### 2.1 Definition and public export

| Path | Role |
|---|---|
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | **The** production command. Library-only. |
| `packages/statistics/src/index.ts` | Re-exports `ingestHistoricalEvaluation`. |

`@fas/statistics` has **no runtime package dependencies**. It cannot import `@fas/config` without a new coupling. Domain/statistics must keep the gate inside this package.

### 2.2 Composition roots — do **not** call ingest

| Path | Finding |
|---|---|
| `apps/api/src/evaluation-history.controller.ts` | `GET` only (`/api/evaluation-history`, `/api/evaluation-history/match/:matchId`). **No POST.** |
| `apps/worker` | No `ingestHistoricalEvaluation` references. |
| `apps/web` | HTTP client only; no `@fas/*` engine imports for intake. |
| `apps/api/src/runtime-database.ts` | Wires `EvaluationHistoryRepository` for **read/save of analysis History**, not historical intake. |
| `packages/report` `evaluatePrediction` / a15 `createEvaluationHistoryRecord` | Live-report History path. **Not** `historical-intake.v1`. |
| `packages/analysis` `AnalyzeMatchUseCase` | Does not call ingest. |

Final Gate §3 / §10 still forbids HTTP intake. This gap must **not** add a POST.

### 2.3 Current callers of `ingestHistoricalEvaluation`

All non-definition callers are **tests or review scripts**:

- `packages/statistics/test/historical-evaluation-intake.spec.ts`
- `packages/statistics/test/historical-intake-population-isolation.spec.ts`
- `packages/database/test/prisma-evaluation-history-historical-intake.spec.ts`
- `packages/database/scripts/pg-history-roundtrip.review.mjs`
- `docs/sprints/.../verification-artifacts/review-historical-intake-postgres.mjs`

Those use `sourceAuthority=unit_test_constructed` doubles. They are **not** Class A admission and **must not** ingest Ipswich–Arsenal.

### 2.4 Consequence

The enforceable production call path **is the exported library function**. A composition-root-only check would not close the gap: any script with `PrismaEvaluationHistoryRepository` can call ingest today. The predicate **must run inside** `ingestHistoricalEvaluation` (or a production wrapper that this function always uses).

---

## 3. Existing reusable infrastructure

| Mechanism | Suitable for this gap? |
|---|---|
| `docs/PROJECT_STATE.md` YAML | **No.** Human snapshot only. Not loaded at runtime. Parsing Markdown would make documentation a trust boundary. |
| `@fas/config` / env (`loadApiConfig`) | **No** as the artifact store. Boolean/env cannot bind a triple; unreviewed env flip; `@fas/statistics` has no config dependency; API does not call ingest. |
| `PrematchPredictionSealItem.allowedUsage` | **Forbidden.** Eligibility metadata. Every Class A seal already carries `historical_evaluation_intake`. |
| `PrematchPredictionSealItem.recordJson` extra field | **No.** Mixes seal authenticity with later production authorization; capture must not imply ingest authorization. |
| `EvaluationHistoryItem` | **No.** History is the *output* of ingest, not the authorization to ingest. |
| Prisma `EvidenceItem` | **No.** Domain Evidence id is not the Prisma UUID PK; no authorization table exists. |
| Calibration `resolvePinnedCalibrationArtifact` | Analogous **pin** pattern (in-repo, versioned, fail-closed enum). Reuse the *idea*, not the calibration artifact. |
| History decoder `decodeEvaluationHistoryRecord` | Analogous **versioned fail-closed decoder** idea for a registry module. |
| `EvaluationHistoryRepository` port injection | Pattern to copy: inject test doubles; production binds a real adapter. |
| Git-reviewed TypeScript `as const` module under `@fas/statistics` | **Yes.** Package already owns intake policy; `tsconfig` includes `src/**/*.ts` only; no Prisma; no new Engine. |

No existing persistent authorization record for one artifact pair was found.

---

## 4. Candidate mechanisms considered

| Id | Mechanism | Verdict |
|---|---|---|
| C1 | Parse `PROJECT_STATE.md` at runtime | Reject. Docs are not a decoder trust boundary. |
| C2 | `@fas/config` env boolean only | Reject. Global over-authorization; unread-flag problem returns. |
| C3 | Env JSON blob of pairs | Reject. Secrets-file / uncommitted `.env`; not reviewable; easy to mishandle. |
| C4 | New Prisma table | Reject for this gap. Final Gate: no migration unless JSONB insufficient. Ingest is library-only. Broader than needed. |
| C5 | Mutate `allowedUsage` / seal JSON | Reject. Collapses eligibility into authorization. |
| C6 | HTTP middleware / API composition root | Reject. No HTTP ingest; scripts bypass. |
| C7 | Markdown Artifact Admission reviews as runtime input | Reject. Free-form docs; not typed; not fail-closed. |
| C8 | Git-tracked JSON allowlist imported by statistics | Viable but needs `tsconfig` `include` change (`src/**/*.ts` only today). Extra decoder for first-party authored data. |
| C9 | **Git-tracked TypeScript registry module + production ingest always binds it** | **Select.** Typed, reviewable, empty-by-default, no Prisma, no config dep, no HTTP. |

---

## 5. Recommended narrowest enforceable mechanism

**In-repo production authorization registry owned by `@fas/statistics`, always bound by the public ingest command.**

### 5.1 Production registry (starts empty)

Add:

`packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts`

Conceptual shape (not implemented in this review):

```text
schemaVersion = "historical-intake-production-authorization.v1"
globalProductionHistoricalIntakeEnabled = false
authorizedPairs = []   // exact triples; none until a later human production grant
```

Runtime **trusts this module**, not `PROJECT_STATE.md`. After a later human grant, humans update **both** the registry and the YAML snapshot. Implementation of **this** gap must leave `globalProductionHistoricalIntakeEnabled = false` and `authorizedPairs = []`.

### 5.2 Public vs test entry

| Function | Binding | Who may call |
|---|---|---|
| `ingestHistoricalEvaluation` (public export) | **Always** the v1 production registry. **No override.** | Any future real ingest. With empty registry + global false, **every** call fail-closes. |
| `ingestHistoricalEvaluationForTest` | Injected registry / explicit pairs. | Tests and constructed review scripts only. **Must not** be used to ingest Ipswich–Arsenal. **Must not** appear in `apps/*`. |

Do **not** skip authorization when `sourceAuthority=unit_test_constructed`. Tests must **explicitly authorize** their constructed pair so a second unlisted constructed Class A-shaped pair still rejects.

Residual risk: a careless operator could call `ForTest` against live Postgres with a permissive registry. V1 is a trusted private environment; the named test entry makes misuse visible. Closing that residual is **not** required to make one-artifact authorization enforceable on the public command.

### 5.3 What this gap implementation must **not** do

- Put Ipswich–Arsenal in `authorizedPairs`
- Set `globalProductionHistoricalIntakeEnabled = true`
- Set `production_historical_intake_authorized: true`
- Execute real ingest
- Add HTTP POST
- Change Projection / Features / Rules / `evaluatePrediction`
- Change population eligibility defaults
- Parse Markdown reviews at runtime

---

## 6. Exact authorization identity

Bind **all three**, using values authenticated by existing validators (not pre-validation client claims):

| Field | Why |
|---|---|
| `originalSealId` | Names the seal. Ipswich id suffix `23fdf75e…` is `sealIdentityHash`, **not** `contentSha256`. |
| `originalSealChecksum` | Pins the authenticated payload. Intake maps this from PRE_MATCH `contentSha256`. A forged command can copy `originalSealId` and still be self-consistent under a **different** checksum (`historyId` includes both). Omitting checksum would authorize the id but ingest a different snapshot. |
| `resultEvidenceId` | Pins the verified MATCH_RESULT Evidence. Wrong Actual Evidence must reject even if the seal matches. |

Also require a non-empty `admissionReviewId` **string** on each registry row (audit / fail-closed presence). Runtime does **not** open the Markdown file. Tests use e.g. `unit_test_constructed_admission`.

Exact equality, case-sensitive, after seal + Actual validation.

Checksum algorithm is already enforced by `validateHistoricalPredictionSeal` (`sha256` + `fas-json-canonical.v1`). The registry stores the hex digest, not a second hash scheme.

### 6.1 Ipswich–Arsenal — read-only reference (not a registry row)

Reloaded 2026-09-22 from `fas_local` `PrematchPredictionSealItem`:

| Field | Persisted value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| Canonical checksum field | **`contentSha256`** (column **and** `recordJson` identical) |
| `originalSealChecksum` for intake | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |
| `resultEvidenceId` | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| Named admission review | `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18` |
| History rows | **0** |

`allowedUsage` remains `["historical_evaluation_intake"]` — **eligibility only**.

Do **not** copy this row into the production registry during gap implementation.

---

## 7. Distinctions that must remain

| Layer | Meaning | Runtime today | After gap implementation |
|---|---|---|---|
| Artifact eligibility | Class A + `allowedUsage` includes historical intake | Seal validators | Unchanged |
| Artifact admission | Named `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW` PASS | Documents only | Prerequisite for a human to **edit** the registry; not a Markdown parse |
| Production ingest authorization | Global enabled **and** exact triple in registry | **Missing** | New fail-closed predicate |
| Ingest execution | `ingestHistoricalEvaluation` save | Library capable; not authorized | Still a **later** human action after a **later** production-authorization review |

`PrematchPredictionSealItem.allowedUsage` **must not** become the production authorization mechanism.

---

## 8. Fail-closed runtime predicate and order

Current order in `ingestHistoricalEvaluation`:

```text
1. validateHistoricalPredictionSeal
2. validateVerifiedRealWorldActual
3. assertHistoricalIntakeTemporalIntegrity
4. evaluatePrediction
5. buildHistoricalIntakeHistoryRecord
6. historyRepository.save
```

Required new order:

```text
1. validateHistoricalPredictionSeal
2. validateVerifiedRealWorldActual
3. assertHistoricalIntakeTemporalIntegrity
4. assertProductionHistoricalIntakeAuthorization
      globalProductionHistoricalIntakeEnabled === true
      AND exact (originalSealId, originalSealChecksum, resultEvidenceId)
          matches one authorizedPairs row
      AND admissionReviewId is non-empty on that row
5. evaluatePrediction
6. build + save (existing population flags remain false)
```

Authorization runs **after** identity is authenticated and **before** scoring/persist, so:

- junk seals still fail existing Class A codes;
- a valid unreviewed Class A pair fails a **new** authorization code, not `SYNTHETIC_FIXTURE_REJECTED`;
- unauthorized pairs are not scored into History.

Proposed new failure codes (additive; do not reuse synthetic/checksum codes):

| Code | When |
|---|---|
| `PRODUCTION_INTAKE_NOT_AUTHORIZED` | Global enabled is false (even if a pair row exists) |
| `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` | Global true but triple missing / `resultEvidenceId` mismatch / checksum mismatch / empty `admissionReviewId` |

Missing production registry decode / unknown `schemaVersion`: fail closed (throw or reject; do not skip).

---

## 9. Named Artifact Admission Review → authorization record

Runtime **must not** trust free-form documentation.

Process (later than this gap implementation):

1. Named Artifact Admission Review **PASS** (already true for Ipswich eligibility).
2. Separate **human production authorization** (not this review; not automatic).
3. That human action **edits the v1 TypeScript registry**: set global true **and** append one typed pair including `admissionReviewId`.
4. Humans sync `PROJECT_STATE.md` `production_historical_intake_authorized` to match the registry.
5. A **further** separately executed ingest action may then call public `ingestHistoricalEvaluation`.

The registry row **is** the authorization record. The Markdown review is evidence for the human editor. Presence of `admissionReviewId` is checked; contents of the `.md` file are not.

---

## 10. Mutability / revocation

V1: **current authorized set**, git-reviewed. **No** revocation table, tombstones, or expiry.

- Git history is the audit log.
- Removing a pair before first ingest = never authorized.
- After a History row exists, History remains append-only; deleting a registry row does not delete History.
- Retries still require the pair to be authorized (see case **g**).

Do not add revocation complexity in the gap sprint.

---

## 11. Case matrix

| Case | Expected public `ingestHistoricalEvaluation` |
|---|---|
| **a.** global false + pair listed | **REJECT** `PRODUCTION_INTAKE_NOT_AUTHORIZED` |
| **b.** global true + pair not listed | **REJECT** `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` |
| **c.** global true + right seal + **wrong** `resultEvidenceId` | **REJECT** `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` |
| **d.** global true + right id + **wrong** checksum | **REJECT** `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` (if self-consistent seal) or existing checksum failure first |
| **e.** global true + exact authorized constructed triple | **ACCEPT** only on `ForTest` / only after a later human registry edit for production. Gap implementation: production registry empty ⇒ public command **never** reaches **e** |
| **f.** second valid Class A pair, no admission / not listed | **REJECT** `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` (or global false → `PRODUCTION_INTAKE_NOT_AUTHORIZED`) |
| **g.** retry of already-ingested authorized pair (same Actual) | Authorization **passes**; existing idempotency returns the same row |
| **h.** authorized seal + conflicting Actual, **same** `resultEvidenceId` but different goals | Authorization may pass; existing `CONFLICTING_ACTUAL` / append-only save rejects overwrite |
| **h2.** authorized seal + **different** Evidence id | **REJECT** at authorization (**c**), before save |

All unauthorized/mismatched cases fail closed. No silent skip.

---

## 12. Population firewalls unchanged

Successful ingest (when later authorized and executed) must still emit:

```text
calibrationEligible = false
validationEligible = false
contributionEligible = false
replayCohortEligible = false
```

Builder already hardcodes these. Creator rejects intake rows whose flags are not `false`. Production Calibration / Validation / Contribution / replay filters still require `=== true`.

**This gap must not change those defaults.** Artifact-scoped ingest authorization is **not** population admission (PROJECT_STATE STEP 6 remains FUTURE).

Does **not** solve or bypass:

- season `AGGREGATION_BLOCKER_ONLY`
- multi-market feature-consumption limitation (lottery 1X2 only on Ipswich snapshot)
- Calibration / Validation / Contribution / replay authorization
- model training / tuning
- Projection / Feature / Rule changes

---

## 13. Minimum production files (future implementation only)

Cite Sprint **A1**. No new package, Engine, numbered Architecture document, or Prisma migration.

### MODIFY

| File | Why |
|---|---|
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | Insert authorization after temporal; public path binds v1 registry |
| `packages/statistics/src/domain/historical-evaluation-intake.ts` | Additive failure codes |
| `packages/statistics/src/index.ts` | Export registry types / assert / ForTest as clearly named test helper |

### ADD

| File | Why |
|---|---|
| `packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts` | Global **false**, `authorizedPairs` **[]** |
| `packages/statistics/src/evaluation/assert-historical-intake-production-authorization.ts` | Fail-closed predicate |
| `packages/statistics/src/evaluation/create-historical-intake-authorization.ts` | Test/registry factory |

### TEST (constructed doubles only)

| File | Why |
|---|---|
| `packages/statistics/test/historical-intake-production-authorization.spec.ts` | New boundary matrix |
| `packages/statistics/test/historical-evaluation-intake.spec.ts` | Switch happy paths to ForTest + explicit pair; prove unlisted second pair rejects |
| `packages/statistics/test/historical-intake-population-isolation.spec.ts` | Firewalls still false |
| `packages/database/test/prisma-evaluation-history-historical-intake.spec.ts` | Same; no Ipswich ingest |
| Review scripts that call ingest | Use ForTest + constructed pairs; still clean up |

### MUST NOT TOUCH

`schema.prisma` and migrations; `apps/api|web|worker`; `evaluate-prediction.ts`; a15 builder; capture/`allowedUsage`; Projection/Feature/Rule; `docs/40_PRODUCT_ROADMAP.md`; FIP protocol; numbered architecture / ADRs; Ipswich seal or Actual rows.

`@fas/config` is **not** required.

---

## 14. Test plan (constructed artifacts only)

Label all doubles `sourceAuthority=unit_test_constructed`. **No** real Ipswich command. **No** production registry row for Ipswich.

Minimum matrix:

| # | Proof |
|---|---|
| T-A | Public `ingestHistoricalEvaluation` with production registry (global false, empty pairs) **rejects** a valid constructed Class A-shaped pair (`PRODUCTION_INTAKE_NOT_AUTHORIZED`) |
| T-B | ForTest global false + pair listed → reject global code |
| T-C | ForTest global true + pair **not** listed → reject artifact code |
| T-D | ForTest global true + wrong `resultEvidenceId` → reject artifact code |
| T-E | ForTest global true + wrong `originalSealChecksum` (self-consistent) → reject artifact code |
| T-F | ForTest global true + exact listed triple → **accept** |
| T-G | After T-F, a **second** otherwise-valid constructed Class A pair (different `originalSealId`) → reject |
| T-H | Authorized retry, same Actual → existing idempotency (one row) |
| T-I | Authorized seal + conflicting Actual (same evidence id, different goals) → `CONFLICTING_ACTUAL`; row not overwritten |
| T-J | Accepted ForTest row still has all four eligibility flags `false`; Calibration/Validation/Contribution/replay filters exclude it |
| T-K | Class B / synthetic still `SYNTHETIC_FIXTURE_REJECTED` **before** or without relying on the new codes |
| T-L | Empty `admissionReviewId` cannot be listed / rejects |
| T-M | Production v1 module in source: `globalProductionHistoricalIntakeEnabled === false` and `authorizedPairs.length === 0` |

Prisma round-trip tests remain constructed; they must go through ForTest, not the empty production registry.

---

## 15. Migration / schema impact

**None.** No Prisma model, no migration, no `recordJson` reshape, no Evidence table change.

---

## 16. Security / governance risks

| Risk | Handling |
|---|---|
| Global YAML true while registry empty | Runtime ignores YAML. Do not flip YAML until registry is enabled. |
| Registry true while YAML false | Runtime would allow public ingest. Human sync required; gap implementation leaves **both** false. |
| Using `allowedUsage` as auth | Forbidden by this design. |
| `ForTest` against live DB | Residual; named helper; forbid Ipswich; V1 trusted env. |
| Adding Ipswich in the same PR as the empty registry | **Out of scope.** Separate later production-authorization review. |
| HTTP ingest | Still forbidden. |
| Markdown parse | Forbidden. |
| New Engine / Architecture doc | Not required. Statistics policy under A1. |

---

## 17. One-artifact authorization after implementation

**YES — becomes safely enforceable** on public `ingestHistoricalEvaluation`, provided:

- production registry lists **only** that triple;
- global is true **only** when that human grant is given;
- public command cannot override the registry.

Gap implementation itself ships **zero** pairs, so after the gap lands, one-artifact authorization is **mechanically possible** but **not yet granted**.

---

## 18. Ipswich–Arsenal later eligibility

**YES** — the admitted pair remains eligible for a **later** production authorization review that would:

1. confirm History still empty;
2. add the §6.1 triple + admission review id to the v1 registry;
3. set registry global true;
4. sync YAML `production_historical_intake_authorized` under explicit human instruction;
5. **still not** execute ingest in that authorization review.

This design review does **not** grant that later authorization.

---

## 19. Implementation authorization boundary (if human approves later)

Inputs: this document; empty v1 registry; existing intake library; constructed tests only.

Outputs: fail-closed public ingest; ForTest for constructed tests; no Ipswich History; flags remain false until a later grant.

Acceptance:

- T-A through T-M pass;
- `pnpm` quality/typecheck/tests for affected packages;
- production registry still empty / global false;
- no Prisma migration; no apps HTTP; no real ingest.

Stop: do not add Ipswich to the registry; do not flip YAML; do not ingest.

---

## 20. Confirmations (this review)

| Item | Value |
|---|---|
| Real ingest ran | **No** |
| Ipswich History rows | **0** (`fas_local` 2026-09-22) |
| Production TypeScript changed | **No** |
| Prisma schema changed | **No** |
| `production_historical_intake_authorized` | **false** |
| `historical_evaluation_intake` | **C_BLOCKED** |

---

## 21. Exact next governance action

**`HUMAN_AUTHORIZATION_OF_ARTIFACT_SCOPED_HISTORICAL_INTAKE_GAP_IMPLEMENTATION`**

Human may approve the bounded A1 implementation in §13–§14. That approval is **not** production intake, **not** Ipswich ingest, and **not** `production_historical_intake_authorized = true`.

---

## 22. Review outcome

**A. READY FOR HUMAN ARTIFACT-SCOPED AUTHORIZATION GAP IMPLEMENTATION APPROVAL**
