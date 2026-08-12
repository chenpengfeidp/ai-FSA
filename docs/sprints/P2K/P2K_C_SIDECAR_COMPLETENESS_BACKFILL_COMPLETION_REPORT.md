# P2K-C — Sidecar Completeness + Replay Eligibility + Backfill Policy

**Status:** COMPLETED  
**Sprint id:** P2K-C  
**Roadmap citation:** Continues P2K after P2K-A/B (`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md`). Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. Replay completeness definition

A History row is **replayComplete** when all of the following hold:

1. A Projection Replay Sidecar record exists for `historyId`
2. `schemaVersion` is in `SUPPORTED_PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSIONS` (currently `projection-replay-sidecar.p2k.b`)
3. `contentSha256` equals SHA-256 of `JSON.stringify(context)` (same contract as P2K-B Prisma adapter)
4. Sidecar `matchId` / context `matchId` equals History `matchId`
5. Context has non-empty `features` and `rules`
6. Context has usable replay fields (`featureModelVersion`, `featureBundleChecksum`, `generatedAt`, finite `requiredEvidencePresentCount`)

Aligned with `AnalysisProjectionReplayPort.replayV2` minimum inputs. Does **not** require full Evidence payloads or probability matrices.

**Informational (does not fail completeness):** `PARAMETER_ARTIFACT_UNPINNED` when `parameterVersionLabel` is absent (V2 port falls back to active artifact).

## 2. Outcome evaluability definition

**outcomeEvaluable** when:

- `actualResult.matchStatus === "FINISHED"`
- `evaluation.status === "scored"`

Distinct from replay completeness. Today, persisted History is constructed only for FINISHED + scored rows, so outcomeEvaluable is typically true whenever History exists; the distinction is preserved for cohort filters and future non-FINISHED outcomes.

**replayEligible** (canonical future cohort gate) = `replayComplete && outcomeEvaluable`.

## 3. Eligibility reasons

| Reason | Completeness blocker? |
| --- | --- |
| `MISSING_SIDECAR` | Yes |
| `UNSUPPORTED_SIDECAR_SCHEMA` | Yes |
| `INVALID_SIDECAR_HASH` | Yes |
| `MISSING_REPLAY_CONTEXT` | Yes |
| `MATCH_ID_MISMATCH` | Yes |
| `MISSING_FEATURES` | Yes |
| `MISSING_RULES` | Yes |
| `PARAMETER_ARTIFACT_UNPINNED` | No (informational) |
| `OUTCOME_NOT_FINISHED` | No (outcome only) |
| `EVALUATION_NOT_SCORED` | No (outcome only) |

API: `assessProjectionReplayEligibility` (pure) + `summarizeProjectionReplayEligibility` (repository read).

## 4. Legacy History behavior

- History without Sidecar remains readable
- Classified `replayComplete: false` with `MISSING_SIDECAR`
- No fabricated Sidecars

## 5. Integrity validation

- Single hash algorithm: SHA-256 over canonical `JSON.stringify(context)`
- Shared helper: `computeProjectionReplaySidecarContentSha256`
- Mismatch → `INVALID_SIDECAR_HASH` → `replayComplete: false`
- Stored hashes are not rewritten by P2K-C

## 6. Backfill policy

`classifySidecarBackfill`:

| Classification | When | Auto backfill |
| --- | --- | --- |
| `NOT_REQUIRED` | Already replay-complete | No |
| `SAFE_TO_BACKFILL` | **Not assigned** in P2K-C (no proven sealed reconstruction path) | No |
| `MANUAL_REVIEW_REQUIRED` | Missing Sidecar / unsupported schema / incomplete payload | No |
| `PERMANENTLY_INELIGIBLE` | Hash mismatch / matchId mismatch | No |

**Reanalyze via Provider → Feature → Rule to mint a historical Sidecar is forbidden.**

## 7. Safe / unsafe classification

- Default for missing/incomplete Sidecar: **not safe** (`MANUAL_REVIEW_REQUIRED`)
- Integrity failure: **permanently ineligible**
- No automatic Evidence/Feature regeneration path exists in this sprint

## 8. Query / reporting behavior

`summarizeProjectionReplayEligibility` returns counts for:

- total History
- replay-complete / incomplete
- outcome-evaluable
- replay-eligible
- missing Sidecar
- unsupported schema
- integrity failures

Plus per-row assessments. No new analytics subsystem; no new Prisma tables.

## 9. Tests

`packages/statistics/test/projection-replay-eligibility.spec.ts` covers completeness, integrity, unfinished outcome, parameter unpin, legacy readability, backfill policy, and summary counts.

Also: existing P2H/P2I, R1B governance, P2K-A/B Postgres durability (live DB).

## 10. Quality gates

| Gate | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** (full suite; Postgres suites **PASS** against live validation DB) |
| `pnpm build` | **PASS** |

## 11. Architecture Freeze verification

- No new Engine / Provider / Feature / Rule
- No Football State / Match Script / Projection / Poisson / Market changes
- Freeze v0.3 unchanged
- Candidate C not promoted; Baseline A remains production default

## 12. Explicit non-goals (confirmed not done)

- Replay Cohort / Replay Run
- Population calibration / A-B metrics
- Candidate C promotion or parameter changes
- Fabricated historical Sidecars
- Silent Evidence regeneration

## 13. Next step

**P2K-D — Replay parameter / Match Script override (offline only)** for Baseline A vs Candidate C on the same sealed membership (still no promotion).

---

## Implementation map

| Area | Location |
| --- | --- |
| Eligibility pure fn | `packages/statistics/src/replay/assess-projection-replay-eligibility.ts` |
| Backfill policy | `packages/statistics/src/replay/classify-sidecar-backfill.ts` |
| Summary query | `packages/statistics/src/replay/summarize-projection-replay-eligibility.ts` |
| Sidecar record + schema support | `packages/statistics/src/replay/projection-replay-sidecar-record.ts` |
| Shared SHA-256 | `packages/statistics/src/replay/sidecar-content-sha256.ts` |
| Repository `findRecordByHistoryId` | statistics port + memory + Prisma + API bridge |
