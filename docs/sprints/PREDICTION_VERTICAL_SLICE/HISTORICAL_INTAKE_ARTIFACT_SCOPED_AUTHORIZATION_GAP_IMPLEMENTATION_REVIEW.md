# Historical Intake Artifact-Scoped Authorization Gap — Implementation Review

| Field | Value |
|---|---|
| Review type | Implementation review only (no Ipswich listing; no production-flag flip; no real ingest) |
| Date | 2026-09-22 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Implementation authorization | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_GAP_IMPLEMENTATION_AUTHORIZATION.md` |
| Implementation report | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_GAP_IMPLEMENTATION_REPORT.md` |
| Design | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP_REVIEW.md` |
| **Decision** | **A. PASS — ARTIFACT-SCOPED PRODUCTION HISTORICAL INTAKE AUTHORIZATION GAP IMPLEMENTATION REVIEW COMPLETE** |
| `production_historical_intake_authorized` | **false** (YAML snapshot; not runtime-read) |
| Runtime production policy | **global=false**, **authorizedPairs=[]** |
| `historical_evaluation_intake` | **C_BLOCKED** |
| Ipswich authorized | **NO** |
| Ipswich ingested | **NO** |
| Later Ipswich grant review | **Not started** |

This review inspected live source, package exports, built output, dependency
boundaries, tests, and a constructed Postgres round-trip. It did **not** rely
only on the implementation report.

PASS of this review is **not** production Historical Evaluation Intake
authorization and is **not** an Ipswich–Arsenal grant.

---

## 1. Production call path

Supported production path:

```text
@fas/statistics public export
  → ingestHistoricalEvaluation(input)
      always injects productionHistoricalIntakeAuthorization
      (created at module load from PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY)
  → ingestHistoricalEvaluationWithAuthorization (src-internal)
      1. validateHistoricalPredictionSeal
      2. validateVerifiedRealWorldActual
      3. assertHistoricalIntakeTemporalIntegrity
      4. assertHistoricalIntakeProductionAuthorization
      5. evaluatePrediction
      6. buildHistoricalIntakeHistoryRecord
      7. historyRepository.save
```

Confirmations:

| Requirement | Result |
|---|---|
| A. Production callers cannot supply/override the authorization policy | **PASS.** Public `IngestHistoricalEvaluationInput` has no policy field. `ingestHistoricalEvaluation` spreads input then **overwrites** `authorization` with the module-load production object. |
| B. Production callers cannot choose a custom registry | **PASS.** Only the git-tracked v1 constant is bound. |
| C. Callers cannot set `global=true` via function arguments | **PASS.** Global is a field of the frozen v1 policy, not an ingest argument. |
| D. Environment variables cannot silently override the registry | **PASS.** Authorization TypeScript does not read `process.env`. YAML is mentioned only in a comment. |
| E. Public ingest always uses the fail-closed production policy | **PASS.** Empty registry ⇒ `PRODUCTION_INTAKE_NOT_AUTHORIZED` after seal/Actual/temporal succeed. |
| F. Current production policy is exactly global=false, authorizedPairs=[] | **PASS.** `historical-intake-production-authorization.v1.ts` and runtime tests. |

`apps/api` Evaluation History remains **GET-only**. No app imports
`ingestHistoricalEvaluation`.

---

## 2. Test-only helper isolation

`ingestHistoricalEvaluationForTest` lives at
`packages/statistics/test/helpers/ingest-historical-evaluation-for-test.ts`.

| Check | Result |
|---|---|
| Not exported from `packages/statistics/src/index.ts` | **PASS** |
| Not in `package.json` `exports` (only `"."`) | **PASS** |
| Not a supported public subpath | **PASS** (`ERR_PACKAGE_PATH_NOT_EXPORTED`) |
| Not emitted into `packages/statistics/dist` | **PASS** (`tsconfig` `include: src`, `exclude: test`) |
| No production app import | **PASS** |
| `dependency-cruiser` `no-apps-to-statistics-test-helpers` | **PASS** (597 modules, 2120 deps) |
| Public barrel leak of ForTest / WithAuthorization / createAuthorization | **PASS** (176 public names; none of those three) |

Distinction:

- **Supported production API / allowed dependency path:** `@fas/statistics` →
  `ingestHistoricalEvaluation` only. Apps cannot import the helper or a
  package subpath.
- **Technically possible inside the monorepo source tree:** `tsc` still emits
  `dist/evaluation/ingest-historical-evaluation.js`, which **named-exports**
  internal `ingestHistoricalEvaluationWithAuthorization`. Review scripts
  deep-import that file. A developer could also use a relative filesystem
  import. That is **not** a supported package API and is **not** used by
  current `apps/*`.

No realistic production bypass of the public fail-closed path was found.
See remaining risks.

---

## 3. Authorization registry validation

Decoder: `createHistoricalIntakeAuthorization`. Module load of public ingest
fails closed if v1 is invalid.

Fail-closed (source + review-time decoder probe, all threw):

| Case | Result |
|---|---|
| Empty `originalSealId` | FAIL_CLOSED |
| Empty `originalSealChecksum` | FAIL_CLOSED |
| Malformed / uppercase checksum | FAIL_CLOSED (lowercase 64-hex only) |
| Empty `resultEvidenceId` | FAIL_CLOSED |
| Empty `admissionReviewId` | FAIL_CLOSED |
| Duplicate exact triples / duplicate `originalSealId` | FAIL_CLOSED |
| Conflicting identities (same seal id, different checksum or result) | FAIL_CLOSED (duplicate `originalSealId`) |
| Wildcards `*` / `?` | FAIL_CLOSED |
| Missing fields / unknown keys | FAIL_CLOSED |
| Unknown `schemaVersion` | FAIL_CLOSED |

Matching is exact `===` on the three identity fields. No prefix, substring,
fixture-level, seal-id-only, result-id-only, `allowedUsage` fallback, or
default allow.

---

## 4. Authorization identity

Runtime matcher uses the **already-authenticated** command seal:

1. `validateHistoricalPredictionSeal` recomputes `sha256CanonicalJson` of the
   declared checksum scope and rejects if it does not equal
   `originalSealChecksum`.
2. Authorization then compares that authenticated
   `seal.originalSealChecksum` plus `originalSealId` plus
   `actual.evidence.id`.

A caller-supplied checksum that disagrees with the payload cannot become
authoritative.

`historicalPredictionSealFromPrematch` maps persisted `contentSha256` →
`originalSealChecksum`. Public ingest does **not** itself reload the Prisma
seal row; it authenticates the command object. With the current empty
registry that cannot cause a production persist. A later grant composition
should still load the persisted seal rather than a free-form command.

`admissionReviewId` is required audit metadata on registry rows. The matcher
does **not** consult it. It cannot grant a different artifact.

---

## 5. Gate ordering

Exact source order in `ingestHistoricalEvaluationWithAuthorization`:

1. Class A / authentic PRE_MATCH seal validation
2. Verified real-world Actual validation (includes exact fixture binding)
3. Temporal integrity (PRE_MATCH times, `observedAt > kickoff`, post-match leakage)
4. Production global authorization (`global !== true` → `PRODUCTION_INTAKE_NOT_AUTHORIZED`)
5. Exact artifact-scoped authorization (triple miss → `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`)
6. `evaluatePrediction`
7. Unscored evaluation → `RETROSPECTIVE_RECONSTRUCTION` (no save)
8. Optional replay-sidecar validation (pre-existing; after evaluate)
9. Build `evaluation-history.mvp.historical-intake.v1`
10. `historyRepository.save`

Independent sidecar validation after evaluate is pre-existing and **safe for
this gap**: unauthorized requests never reach it.

Spies in `historical-intake-production-authorization.spec.ts`:

- public ingest, global false: `evaluatePredictionFn` not called; `saveCalls=0`
- test-path global true, pair absent: same
- wrong checksum / wrong resultEvidenceId / wrong originalSealId / second unlisted Class A pair: same

---

## 6. Existing integrity gates

Authorization is inserted **after** seal/Actual/temporal and **before**
evaluate/save. Integrity rejects still run on **public** ingest (T02+), so they
still fail for the original reasons rather than being swallowed by
authorization.

Unchanged / still fail-closed:

- Class A authenticity, synthetic fixture rejection, retrospective reconstruction
- Verified Actual, `realWorldVerification=true`, fixture identity, home/away
- Kickoff / observedAt / post-match leakage
- EvaluationHistory validation, version-aware decode, unsupported schema
- Append-only persistence, conflicting Actual, retry idempotency

`allowedUsage` remains eligibility (`historical_evaluation_intake` required on
the seal). It is **not** an authorization fallback.

---

## 7. Population firewalls

Authorized constructed intake (test-only path) still writes:

- `calibrationEligible=false`
- `validationEligible=false`
- `contributionEligible=false`
- `replayCohortEligible=false`

`createHistoricalIntakeEvaluationHistoryRecord` hard-codes those four to
`false`. Selectors `isCalibrationPopulationEligible` /
`isValidationPopulationEligible` /
`isContributionPopulationEligible` /
`isReplayCohortPopulationEligible` still require `=== true` for historical-intake
rows. Isolation test: mixed A1.5 + intake population reports still count only
the A1.5 row.

Authorization for Historical Evaluation Intake does **not** authorize
Calibration, Validation, Contribution, or Replay.

---

## 8. YAML vs runtime policy

These are **not** a single source of truth.

| Snapshot | Current value | Runtime-read? |
|---|---|---|
| YAML `docs/PROJECT_STATE.md` `production_historical_intake_authorized` | **false** | **No** |
| TypeScript v1 `globalProductionHistoricalIntakeEnabled` | **false** | **Yes** (only this is enforced) |
| TypeScript v1 `authorizedPairs` | **[]** | **Yes** |

No real production intake can persist while the TypeScript runtime global
remains false: public ingest fail-closes with
`PRODUCTION_INTAKE_NOT_AUTHORIZED` before evaluate/save.

---

## 9. Ipswich–Arsenal read-only check

Used only as a verification target. **Not** added to `authorizedPairs`.
**Not** passed to `ingestHistoricalEvaluation`.

| Check | Result |
|---|---|
| Present in `authorizedPairs` | **NO** (empty array; source contains no Ipswich ids) |
| Public ingest would reject today | **YES** (`PRODUCTION_INTAKE_NOT_AUTHORIZED` for any otherwise-valid pair, including this one) |
| EvaluationHistory row | **NO** — live `fas_local` constructed review script: `realFixtureHistoryCountBefore=0`, `realFixtureHistoryCountAfter=0`, `lotteryIntakeHistoryCount=0` for `lottery:csl:20260915:周二012` |
| Expected `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| Expected Actual Evidence ID | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |
| Canonical checksum | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` from repository seal artifact `verification-artifacts/2026-09-15-ips-ars-seal-recordJson.json` (`contentSha256`) |

No Ipswich seal, Actual, or History row was mutated by this review. The
constructed Postgres script cleaned only `unit-test:constructed:review:*` rows.

---

## 10. Second unreviewed Class A pair

Core regression for the original governance bug:

| Case | Code | evaluate / save |
|---|---|---|
| `global=false` (public ingest or test policy) | `PRODUCTION_INTAKE_NOT_AUTHORIZED` | not reached |
| Test `global=true`, pair absent | `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` | not reached |
| Listed pair A, present otherwise-valid constructed pair B | `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` | not reached |

A valid but unreviewed Class A artifact does **not** pass.

---

## 11. Constructed authorized pair (test-only path)

`ingestHistoricalEvaluationForTest` with `global=true` + exact constructed
triple + valid Class A double + verified Actual + fixture/temporal integrity:

- reaches evaluate and save (in-memory + live constructed Postgres)
- History identity `eval-history-hi:{originalSealId}:{originalSealChecksum}`
- retry idempotent (`retrySameId=true`, row count 1)
- reload valid (`reloadSchema` historical-intake.v1, checksum match)
- population flags remain false
- conflicting Actual → `CONFLICTING_ACTUAL`
- unknown History schema → `UNSUPPORTED_HISTORY_SCHEMA_VERSION`

No real artifact was used (`matchId` `unit-test:constructed:review:*`,
`sourceAuthority` `unit_test_constructed`).

---

## 12. Database / Postgres

Implementation-report skip of constructed Prisma tests against
`fas_validation` remains true for that vitest project (hardcoded
`fas_validation` URL).

This review **did** run the repository-supported constructed round-trip
`packages/database/scripts/pg-history-roundtrip.review.mjs`.

| Field | Value |
|---|---|
| Classification | **A. RESOLVED** — constructed real Postgres authorization round-trip succeeded |
| Database | Local review target of that script (**`fas_local`** default `127.0.0.1:5432`); ping **OK** |
| Fixture | `unit-test:constructed:review:hi-review-*` only |
| Cleanup | `reviewRowsLeft: 0`; Ipswich History still 0 |
| Path used | Internal `withAuthorization` + constructed policy (not public API; public API cannot persist while global=false) |

`fas_validation` vitest skip is an **acceptable leftover test-env limitation**
of that project, not a blocker, because a live constructed Postgres
authorization round-trip on `fas_local` succeeded.

Because classification is **A. RESOLVED**, a missing constructed Postgres
round-trip is **not** a leftover mandatory precondition of *this* review.
A later Ipswich production grant remains a **separate** human-gated review
and was **not** started here.

---

## 13. Build / export inspection

Re-run this review:

| Command | Result |
|---|---|
| `pnpm --filter @fas/statistics test` | **206 passed** (20 files) |
| `pnpm --filter @fas/statistics typecheck` | **PASS** |
| `pnpm --filter @fas/statistics build` | **PASS** |
| `pnpm quality` (`biome check` + `depcruise` + boundary fixture) | **PASS** (3 pre-existing warnings outside this sprint: `artifact-admission-readonly.mjs`, `verified-actual-ips-ars-pair.spec.ts`) |
| dependency-cruiser | **no dependency violations found** |
| Built public API | 176 names; `ingestHistoricalEvaluation` present; ForTest / WithAuthorization / createAuthorization **absent** from `dist/index.js` and `dist/index.d.ts` |
| Package subpaths | `ERR_PACKAGE_PATH_NOT_EXPORTED` |

---

## 14. Production file diff

Working-tree production TypeScript for this implementation (vs `HEAD`):

| Path | In scope? |
|---|---|
| `packages/statistics/src/domain/historical-evaluation-intake.ts` | Yes — additive failure codes |
| `packages/statistics/src/domain/historical-intake-production-authorization.ts` | Yes — policy types |
| `packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts` | Yes — empty runtime registry |
| `packages/statistics/src/evaluation/create-historical-intake-authorization.ts` | Yes — decoder |
| `packages/statistics/src/evaluation/assert-historical-intake-production-authorization.ts` | Yes — exact triple |
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | Yes — bind policy; order auth before evaluate/save |

Also in-scope (not production runtime API): tests, test helper,
`dependency-cruiser.config.cjs` rule, constructed review scripts, governance
docs.

Confirmed **no** changes in:

- Prisma schema
- `apps/api` / web / worker
- Projection / Features / Rules
- PRE_MATCH sealing
- Actual semantics
- Report
- lottery manifest
- season normalization
- multi-market consumption logic

---

## 15. Remaining risks

None of these reopen the original global-unread-YAML bypass of public ingest.

1. Internal `ingestHistoricalEvaluationWithAuthorization` is compiled into
   `dist/` and is deep-importable inside the monorepo. Not a supported
   `@fas/statistics` export. Optional later hardening: depcruiser rule for
   `apps/` → `packages/statistics/src/evaluation/` internals (in addition to
   `test/`).
2. YAML and TypeScript remain dual snapshots. Flipping YAML alone still does
   nothing at runtime — which is the intended fail-closed design until a later
   grant edits the TypeScript registry **and** the YAML together.
3. Public ingest authenticates the command seal; it does not re-fetch Prisma
   `contentSha256`. Empty registry still rejects. Later grant composition
   should load the persisted seal.
4. `fas_validation` constructed Prisma vitest suite may still skip when that
   database is down. Not required to re-open this review after the `fas_local`
   round-trip.

---

## 16. Implementation Acceptance Checklist (Section 9)

| Item | Result | Evidence / Notes |
|---|---|---|
| scope compliance | **PASS** | Only authorized `@fas/statistics` files modified; zero schema, app, or model changes. |
| production public-entry enforcement | **PASS** | `ingestHistoricalEvaluation` always injects module-level production registry (`global=false`, `authorizedPairs=[]`). |
| exact triple matching | **PASS** | `assertHistoricalIntakeProductionAuthorization` enforces `originalSealId`, `originalSealChecksum`, `resultEvidenceId` via strict `===`. |
| malformed/duplicate policy rejection | **PASS** | `createHistoricalIntakeAuthorization` fail-closes on empty fields, uppercase checksum, wildcards, duplicates, unknown keys. |
| no public test/core bypass | **PASS** | `ingestHistoricalEvaluationForTest` and `ingestHistoricalEvaluationWithAuthorization` not exported from `@fas/statistics` public entry; `ERR_PACKAGE_PATH_NOT_EXPORTED` on subpaths. |
| shared production/test execution core | **PASS** | Both call `ingestHistoricalEvaluationWithAuthorization`; core validation, evaluation, and persistence logic is identical. |
| rejection before evaluation/save | **PASS** | Spies in `historical-intake-production-authorization.spec.ts` prove `evaluatePredictionFn` and `historyRepository.save` are never reached on unauthorized requests. |
| idempotency/conflict regression | **PASS** | Same pair retry retains same `historyId` and row count; conflicting Actual yields `CONFLICTING_ACTUAL`; idempotent path does not bypass authorization. |
| population firewall | **PASS** | Historical intake rows hardcode all 4 population flags to `false`; downstream report and cohort selectors filter them out. |
| build/export/dependency boundary | **PASS** | `pnpm quality`, `typecheck`, `build`, and `test` pass (206 tests); `depcruise` enforces `no-apps-to-statistics-test-helpers`. |
| database verification applicability/result | **PASS** | Real PostgreSQL constructed round-trip executed on `fas_local` (`pg-history-roundtrip.review.mjs`), verified and cleaned up; `fas_validation` vitest skip is acceptable temporary test-env limitation. |
| empty disabled production registry | **PASS** | `PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY` has `globalProductionHistoricalIntakeEnabled: false` and `authorizedPairs: []`. |
| no real ingest | **PASS** | 0 real match ingest calls executed; zero real evaluation history rows created. |
| source artifacts unchanged | **PASS** | Real Ipswich seal (`周二012`, `23fdf75e...`) and Actual evidence unchanged; content checksum `ecd427e5...` matches. |

---

## Final governance state

```yaml
production_historical_intake_authorized: false
historical_evaluation_intake: C_BLOCKED
runtime_production_policy:
  global: false
  authorizedPairs: []
ipswich_authorized: NO
ipswich_ingested: NO
```

---

## Final decision

**A. PASS — ARTIFACT-SCOPED PRODUCTION HISTORICAL INTAKE AUTHORIZATION GAP IMPLEMENTATION REVIEW COMPLETE**

Do **not** list Ipswich. Do **not** set `production_historical_intake_authorized=true`.
Do **not** execute real Historical Evaluation ingest. Do **not** treat this PASS
as the later Ipswich production authorization/grant review.

