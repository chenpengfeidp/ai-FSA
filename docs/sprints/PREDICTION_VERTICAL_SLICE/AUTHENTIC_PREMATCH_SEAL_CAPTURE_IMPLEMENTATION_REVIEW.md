# Authentic PRE_MATCH Seal Capture — Implementation Review

## 0. Review result

| Field | Result |
|---|---|
| Review type | Repository-grounded implementation review |
| Date | 2026-09-07 |
| Reviewed delivery | Authentic PRE_MATCH prediction seal capture |
| Binding contract | `AUTHENTIC_PREMATCH_SEAL_CAPTURE_STORAGE_AUTHORITY_PLANNING_GATE.md` |
| Gate recommendation | **A. PASS — AUTHENTIC PRE_MATCH SEAL CAPTURE IMPLEMENTED** |
| Capability | **IMPLEMENTED** |
| Real Class A production artifact | **NOT FOUND** (no live PRE_MATCH durable write was executed in this sprint) |
| Historical Evaluation Intake | **C. BLOCKED** / `production_historical_intake_authorized = false` |

This sprint implemented the production capture path and durable postgres
authority. It did not create, backfill, or admit a real Class A historical
artifact. Tests, in-memory doubles, and migration success are not authentic
seals.

---

## 1. Implementation summary

The approved production path is now in code:

1. `GenerateMatchReportUseCase` freezes `analysisTime` from an injected `Clock`
   and sets `analysisCutoff = analysisTime`.
2. `AnalyzeMatchUseCase.execute(matchId, { analysisTime, analysisCutoff })`
   stamps `ImportMatchUseCase` with `collectedAt = analysisTime`, then
   fail-closes on cutoff mismatch, evidence after cutoff, or `MATCH_RESULT`.
3. After `AnalysisResult`, the report use case freezes `sealedAt` from the
   same clock, builds hashes, and inserts into
   `prematch_prediction_seal_items` **before** `ReportBuilder.build`.
4. Class A classification (`synthetic=false`, `historicalAuthenticity=true`,
   `provenanceClass=A`, `sourceAuthority=prisma.prematch_prediction_seal_items`)
   is assigned only inside seal creation and only after a successful durable
   save on the postgres adapter.

Memory API mode does not inject a seal repository, so auto-capture is skipped
there. That is intentional: fixture/past-match HTTP remains compatible, and
Class A cannot be claimed from an in-memory store.

---

## 2. Exact files changed

### Modified

- `packages/database/prisma/schema.prisma`
- `packages/database/src/client.ts`
- `packages/database/src/index.ts`
- `packages/statistics/src/index.ts`
- `packages/analysis/src/use-case/analyze-match-use-case.ts`
- `packages/analysis/src/index.ts`
- `packages/analysis/src/evaluation/build-sealed-prediction-input.ts`
- `packages/report/src/use-case/generate-match-report-use-case.ts`
- `packages/report/src/index.ts`
- `packages/application/src/import-match-use-case.ts`
- `packages/rule/src/evaluation/rule-evaluator.ts`
- `packages/rule/src/index.ts`
- `apps/api/src/evidence.module.ts`
- `apps/api/src/evidence.tokens.ts`
- `apps/api/src/runtime-database.ts`
- Tests: `packages/analysis/test/analyze-match-use-case.spec.ts`,
  `packages/analysis/test/m1b-manager-intelligence-pipeline.spec.ts`,
  `packages/application/test/import-match-use-case.spec.ts`,
  `packages/report/test/report-builder.spec.ts`

### Added

- `packages/statistics/src/domain/prematch-prediction-seal.ts`
- `packages/statistics/src/seal/canonical-json.ts`
- `packages/statistics/src/seal/create-prematch-prediction-seal.ts`
- `packages/statistics/src/seal/capture-prematch-prediction-seal.ts`
- `packages/statistics/src/repository/prematch-prediction-seal-repository.ts`
- `packages/statistics/src/repository/in-memory-prematch-prediction-seal-repository.ts`
- `packages/database/src/prisma-prematch-prediction-seal-repository.ts`
- `packages/database/prisma/migrations/20260907120000_prematch_prediction_seal/migration.sql`
- `packages/database/test/prisma-prematch-prediction-seal.spec.ts`
- `packages/statistics/test/prematch-prediction-seal-capture.spec.ts`
- `apps/api/src/iso-clock.ts`

Prisma client output remains gitignored under
`packages/database/generated/prisma/` and is regenerated locally.

---

## 3. Migration

Prisma model `PrematchPredictionSealItem` maps to table
`prematch_prediction_seal_items` with:

`id`, unique `originalSealId`, `matchId`, `homeTeam`, `awayTeam`,
`competitionId`, `season`, `kickoffAt`, `schemaVersion`, `sealedAt`,
`contentSha256`, `recordJson`, `createdAt`.

Index: `(matchId, sealedAt DESC)`.

The repository is insert-only. Evaluation History, Evidence, Replay sidecar,
and Match rows are not used as Class A stores.

---

## 4. Hash implementation evidence

Two hashes, never merged. The term `sealPayloadChecksum` is not used.

**sealIdentityHash** = SHA-256(`fas-json-canonical.v1(sealIdentity)`).

`sealIdentity` includes fixture identity, kickoff, analysisTime,
analysisCutoff, predictionSnapshot, model/policy/parameter refs, and
authenticity classification. It excludes `sealedAt`, `contentSha256`, and
`originalSealId`.

**originalSealId** = `"prematch-seal:" + matchId + ":" + sealIdentityHash`.

**contentSha256** = SHA-256 of canonical `{ schemaVersion, originalSealId,
sealedAt, sealIdentity }`.

Canonicalization lives in production
`packages/statistics/src/seal/canonical-json.ts` (`node:crypto` SHA-256).
It does not import the test helper. UTF-8, sorted object keys, preserved
array order, finite JSON numbers, emitted `null`, omitted absent properties,
rejected `undefined` / `NaN` / `Infinity` / `bigint`, duplicate JSON keys
rejected at parse.

A1 FNV-style evaluation/projection checksums were not modified.

---

## 5. Cutoff enforcement evidence

Governed `AnalyzeMatchUseCase`:

- `analysisCutoff === analysisTime` or `INVALID_ANALYSIS_CUTOFF`
- `analysisTime < kickoff` or `SEAL_NOT_PRE_MATCH`
- any Evidence `collectedAt > analysisCutoff` → `EVIDENCE_AFTER_CUTOFF` (fail
  closed; no silent drop)
- `MATCH_RESULT` in the evidence set → `POST_MATCH_EVIDENCE`

Ungoverned `execute(matchId)` is unchanged.

Capture additionally rejects Actual, replay, reconstruction, inferred
timestamps, Class B / synthetic classification, and untrusted
`sourceAuthority`.

---

## 6. Auto-capture ordering evidence

Owner: `GenerateMatchReportUseCase`.

Order in `execute`: freeze analysisTime/cutoff → AnalyzeMatch → AnalysisResult
→ freeze sealedAt → `capturePrematchPredictionSeal` → then
`ReportBuilder.build`.

Narrative/prompt/report cannot affect seal identity. ReportBuilder is not the
seal creator. AnalyzeMatch does not depend on Prisma.

API postgres mode wires `IsoClock` +
`PrismaPrematchPredictionSealRepository`. Memory mode returns `undefined`
for the seal repository, so capture is not attempted.

If governed analyze returns `SEAL_NOT_PRE_MATCH`, the report use case retries
ungoverned analyze and skips Class A so past-fixture HTTP still produces a
report.

If MATCH_INFO lacks competition/season identity required by the seal
contract, capture is skipped rather than inventing Class A fields.

---

## 7. ruleSetVersion provenance

`RULE_SET_VERSION` is exported from `@fas/rule` with value
`rule.mvp.m1b.manager`, equal to the existing Rule evaluator policy string.

`buildSealedPredictionInput` imports that constant. The seal records
`predictionSnapshot.ruleSetVersion` and `sealIdentity.ruleSetVersion` from
the same snapshot. No second conflicting rule-version field was added.

`evaluatePrediction` checksums, `createEvaluationHistoryRecord`,
`buildEvaluationHistoryRecord`, and `evaluation-history.mvp.a15` were not
changed.

---

## 8. Append-only / idempotency behavior

Save algorithm:

1. Compute hashes and `originalSealId`.
2. Lookup by `originalSealId`.
3. Missing row → insert first `sealedAt` + `contentSha256` + `recordJson`.
4. Existing row with canonically equal `sealIdentity` → return first row
   (keep first `sealedAt` / `contentSha256`).
5. Existing row with different identity → `SEAL_IDENTITY_CONFLICT`.
6. Unique `originalSealId` plus fail-closed comparison for concurrent writers.

No update API exists on the repository port.

Multiple seals per match are allowed when `analysisTime` and/or
`predictionSnapshot` differ (new `sealIdentityHash`). Reschedule creates a
new seal; the prior seal's kickoff is never mutated.

---

## 9. Class B rejection

T19/T20 reject `synthetic=true` and non-Class-A classification
(`SYNTHETIC_FIXTURE_REJECTED`). Controlled PRE_MATCH conformance fixtures
remain Class B and are not stored in `prematch_prediction_seal_items`.

---

## 10. Retrospective reconstruction rejection

Capture fail-closes on:

- `RETROSPECTIVE_RECONSTRUCTION`
- `REPLAY_NOT_ORIGINAL_SEAL`
- `ACTUAL_FORBIDDEN`
- `TIMESTAMP_INFERRED`
- `SEAL_NOT_PRE_MATCH` (including `sealedAt >= kickoff`)
- identity mismatches, unsupported schema/algorithm/canonicalization,
  checksum tamper, missing model versions, untrusted source authority

---

## 11. Durable-write fail-closed behavior

T32: a failing repository throws; `findByMatch` returns zero rows; no Class A
document is returned as success.

Prisma `save` errors that are not unique-conflict retries propagate. The
report use case maps unexpected seal errors to `PREMATCH_SEAL_FAILED` and
does not continue as a successful Class A write.

`historicalAuthenticity=true` is never a successful classification without a
successful durable save on the postgres path.

---

## 12. Test commands and results

Executed 2026-09-07 from the repository root (fresh this sprint):

| Command | Result |
|---|---|
| `pnpm --filter @fas/statistics test` | **167 passed** |
| `pnpm --filter @fas/application test` | **24 passed** |
| `pnpm --filter @fas/rule test` | **34 passed** |
| `pnpm --filter @fas/analysis test` | **103 passed** |
| `pnpm --filter @fas/report test` | **23 passed** |
| `pnpm --filter @fas/api test` | **33 passed, 2 skipped** |
| `pnpm --filter @fas/database test` | **9 passed, 16 skipped** |

Acceptance matrix:

- T01–T23, T27–T33: executed in `@fas/statistics` (plus hash/canonical extras).
- T24–T26: implemented in `prisma-prematch-prediction-seal.spec.ts` behind
  `describe.skipIf` when Postgres is not connected.

**Environment gap (not treated as a code defect):** live Prisma round-trip
T24–T26 did not run because this environment had no reachable Postgres for
`@fas/database` integration tests. The same skip pattern is used by existing
Evidence/History Prisma specs.

---

## 13. Typecheck / quality result

| Command | Result |
|---|---|
| Package typecheck: statistics, rule, analysis, application, database, report, api | **passed** |
| `pnpm quality` | **passed** (Biome `--write` applied to nine implementation files during the sprint) |

---

## 14. Compatibility findings

- Ungoverned `AnalyzeMatchUseCase.execute(matchId)` unchanged.
- `ImportMatchUseCase.execute(matchId)` still uses constructor `collectedAt`
  when no per-request stamp is supplied.
- `GenerateMatchReportUseCase` extra constructor args are trailing optional.
- A1 evaluation tests, A1.5 History tests, replay tests, and report generation
  tests in the packages listed above still pass.
- API analyze remains compatible except intentional fail-closed PRE_MATCH
  seal behavior on the postgres auto-capture path.
- Memory API: no Class A auto-capture (repository not wired).

---

## 15. Remaining risks

1. Live T24–T26 Postgres round-trip not executed in this environment.
2. Production auto-capture requires postgres platform persistence **and**
   MATCH_INFO carrying home/away/kickoff/competitionId/competitionName/season.
   Incomplete identity skips capture rather than fabricating Class A.
3. Past-kickoff analyze retries ungoverned path; that is compatibility, not
   authenticity.
4. No real PRE_MATCH production run was performed; `authentic_prematch_seal`
   remains **NOT_FOUND**.
5. Optional `supersedesSealId` was not added (existing architecture did not
   require it).

---

## 16. Gate recommendation

**A. PASS — AUTHENTIC PRE_MATCH SEAL CAPTURE IMPLEMENTED**

Next governance action is a **bounded real PRE_MATCH capture verification**
(live analyze before kickoff against postgres). It is **not** Historical
Evaluation Intake implementation.

Historical Evaluation Intake remains **C. BLOCKED**.
`production_historical_intake_authorized` remains **false**.
`authentic_prematch_seal` remains **NOT_FOUND**.
