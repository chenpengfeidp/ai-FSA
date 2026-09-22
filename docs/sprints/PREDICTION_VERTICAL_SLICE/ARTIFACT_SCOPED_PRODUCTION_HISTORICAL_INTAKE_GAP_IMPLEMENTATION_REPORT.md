# Artifact-Scoped Production Historical Intake Authorization Gap — Implementation Report

| Field | Value |
|---|---|
| Sprint | `CLOSE_ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP` |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Authorization | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_GAP_IMPLEMENTATION_AUTHORIZATION.md` |
| Design | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP_REVIEW.md` |
| Date | 2026-09-22 |
| **Decision** | **A. IMPLEMENTED — ARTIFACT-SCOPED PRODUCTION HISTORICAL INTAKE AUTHORIZATION GAP CLOSED** |
| Real ingest | **None** |
| Ipswich listed | **No** |
| `production_historical_intake_authorized` | **false** |
| `historical_evaluation_intake` | **C_BLOCKED** |

This sprint implemented the fail-closed production authorization boundary. It did
**not** grant production intake, list any real artifact, execute real ingest, or
flip YAML.

---

## 1. Production files changed

| Path | Change |
|---|---|
| `packages/statistics/src/domain/historical-evaluation-intake.ts` | Additive codes `PRODUCTION_INTAKE_NOT_AUTHORIZED`, `ARTIFACT_NOT_PRODUCTION_AUTHORIZED` |
| `packages/statistics/src/domain/historical-intake-production-authorization.ts` | Policy types + decoder error |
| `packages/statistics/src/evaluation/historical-intake-production-authorization.v1.ts` | Runtime registry: global **false**, pairs **[]** |
| `packages/statistics/src/evaluation/create-historical-intake-authorization.ts` | Fail-closed policy decoder |
| `packages/statistics/src/evaluation/assert-historical-intake-production-authorization.ts` | Exact triple predicate |
| `packages/statistics/src/evaluation/ingest-historical-evaluation.ts` | Authorize after temporal, before `evaluatePrediction` / save; public command always binds v1 |

Not exported from `@fas/statistics` index: `ingestHistoricalEvaluationWithAuthorization`, `createHistoricalIntakeAuthorization`, ForTest helper.

Unchanged: Prisma schema, apps/*, Projection/Features/Rules, PRE_MATCH sealing, Actual semantics, Report, `evaluatePrediction` algorithm, population firewall defaults, `allowedUsage`.

---

## 2. Tests added/changed

| Path | Change |
|---|---|
| `packages/statistics/test/helpers/ingest-historical-evaluation-for-test.ts` | **Added** test-only helper (not a package export) |
| `packages/statistics/test/historical-intake-production-authorization.spec.ts` | **Added** required authorization matrix |
| `packages/statistics/test/historical-evaluation-intake.spec.ts` | Accept paths use ForTest; existing integrity rejects stay on public ingest |
| `packages/statistics/test/historical-intake-population-isolation.spec.ts` | ForTest for constructed intake row; firewalls still false |
| `packages/database/test/prisma-evaluation-history-historical-intake.spec.ts` | Constructed round-trip uses ForTest |
| `packages/database/scripts/pg-history-roundtrip.review.mjs` | Constructed script uses internal withAuthorization (not public API) |
| `docs/sprints/.../verification-artifacts/review-historical-intake-postgres.mjs` | Same |
| `dependency-cruiser.config.cjs` | `no-apps-to-statistics-test-helpers` |

---

## 3. Authorization policy shape

```text
schemaVersion = "historical-intake-production-authorization.v1"
globalProductionHistoricalIntakeEnabled = boolean
authorizedPairs[] = {
  originalSealId,
  originalSealChecksum,   // lowercase sha256 hex = PRE_MATCH contentSha256
  resultEvidenceId,
  admissionReviewId       // required non-empty audit string; Markdown is not parsed
}
```

Decoder fail-closed: unknown keys, wildcards `*`/`?`, empty/untrimmed ids, malformed checksum, duplicate `originalSealId`, unknown schemaVersion.

Exact string equality only. No `allowedUsage` fallback.

---

## 4. Production public call path

`ingestHistoricalEvaluation` (the only `@fas/statistics` ingest export) **always** binds
`PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY`.

Order:

```text
validateHistoricalPredictionSeal
→ validateVerifiedRealWorldActual
→ assertHistoricalIntakeTemporalIntegrity
→ assertHistoricalIntakeProductionAuthorization
→ evaluatePrediction
→ save
```

Unauthorized commands return before evaluation and persistence.

Shipped production registry:

```text
globalProductionHistoricalIntakeEnabled = false
authorizedPairs = []
```

Therefore every public ingest currently returns `PRODUCTION_INTAKE_NOT_AUTHORIZED`.

---

## 5. Test-only path (cannot bypass the supported package API)

`ingestHistoricalEvaluationForTest` lives in `packages/statistics/test/helpers/`.

Evidence it is **not** a production API:

- Not exported from `packages/statistics/src/index.ts`
- `package.json` `exports` is only `"."`
- Built `dist/index.js` namespace does not include ForTest / WithAuthorization / createAuthorization (checked after `pnpm --filter @fas/statistics build`)
- `apps/` has zero references
- dependency-cruiser forbids `apps/` → `packages/statistics/test/`

Internal `ingestHistoricalEvaluationWithAuthorization` is a `src/` named export of the ingest module, **not** re-exported by the package index. Node `exports` map blocks `@fas/statistics/evaluation/...`. Production consumers using `@fas/statistics` cannot import it.

YAML `production_historical_intake_authorized` is **not** read at runtime.

---

## 6. Runtime source of truth

| Snapshot | Role this sprint |
|---|---|
| TypeScript v1 registry | **Runtime enforcement** |
| `docs/PROJECT_STATE.md` YAML | Human governance snapshot; **not** parsed |

Both remain false / empty. A later production-authorization review must synchronize them before any real intake.

---

## 7. Registry final contents

```text
globalProductionHistoricalIntakeEnabled: false
authorizedPairs: []
```

No lottery / real `originalSealId` in `packages/statistics/src` except a comment forbidding listing Ipswich–Arsenal.

---

## 8. Test results

| Check | Result |
|---|---|
| `@fas/statistics` vitest | **206 passed** (20 files) |
| `@fas/statistics` typecheck | **PASS** |
| `@fas/statistics` build + public export probe | **PASS** (176 public names; ForTest not present) |
| `pnpm quality` | **PASS** (pre-existing Biome warnings elsewhere, no new errors) |
| dependency-cruiser | **PASS** (597 modules) |
| `@fas/database` vitest default (`fas_validation`) | 9 passed / 20 skipped (Postgres `fas_validation` not available; constructed intake test skipped by `skipIf`) |
| Lottery historical-intake History rows (`eval-history-hi:prematch-seal:lottery:` on `fas_local`) | **0** |

Required matrix covered in `historical-intake-production-authorization.spec.ts` plus existing T17/T19 on ForTest:

1. public global false → `PRODUCTION_INTAKE_NOT_AUTHORIZED`
2. test policy global true + missing pair → `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`
3. wrong `resultEvidenceId` → reject
4. wrong `originalSealChecksum` → reject
5. wrong `originalSealId` → reject
6. exact constructed triple → accept on ForTest
7. second unlisted Class A pair → reject
8. malformed registry → `HistoricalIntakeAuthorizationPolicyError`
9. duplicate `originalSealId` → fail closed
10. idempotent retry (T17) unchanged
11. conflicting Actual (T19) → `CONFLICTING_ACTUAL`
12. eligibility flags all false
13. production registry still empty
14. lottery intake History count 0
15. unauthorized: `evaluatePredictionFn` not called; `save` not called
16. ForTest absent from public `@fas/statistics` API

---

## 9. Confirmations

| Item | Value |
|---|---|
| Real `ingestHistoricalEvaluation` against a Class A pair | **Not executed** |
| Ipswich–Arsenal in registry | **No** |
| Lottery historical-intake History count | **0** |
| Prisma schema / migration | **Unchanged** |
| HTTP POST | **Not added** |
| YAML `production_historical_intake_authorized` | **false** |
| `historical_evaluation_intake` | **C_BLOCKED** |

---

## 10. Exact next governance action

**`HISTORICAL_INTAKE_ARTIFACT_SCOPED_AUTHORIZATION_GAP_IMPLEMENTATION_REVIEW`**

Do **not** add Ipswich–Arsenal to the registry. Do **not** ingest. Do **not** set YAML true.
