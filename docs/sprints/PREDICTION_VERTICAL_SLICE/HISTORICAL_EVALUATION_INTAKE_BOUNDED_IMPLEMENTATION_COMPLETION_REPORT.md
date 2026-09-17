# Historical Evaluation Intake — Bounded Implementation Completion Report

| Field | Value |
|---|---|
| Date | 2026-09-17 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Authorization | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md` (human §8.1–§8.10) |
| Specification | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` §3–§5 |
| Result | **BOUNDED LIBRARY IMPLEMENTATION COMPLETE** |
| Production intake | **Not authorized** (`C_BLOCKED`, `production_historical_intake_authorized: false`) |
| Real-match ingest | **Not executed** (§8.9 clarification) |

---

## Delivered

Library-only Historical Evaluation Intake in `@fas/statistics`:

- authenticate Class A PRE_MATCH seal (checksum, class isolation, times)
- verify real-world Actual (`quality=verified`, `realWorldVerification=true`)
- exact Seal ↔ Actual fixture binding
- `evaluatePrediction` (unchanged A1 metrics)
- `evaluation-history.mvp.historical-intake.v1` + `intakeIntegrity`
- append-only History via existing repository port
- idempotent `historyId` from `originalSealId` + `originalSealChecksum`
- `evaluatedAt = predictionGeneratedAt`
- Prisma version-aware decoder: a15 omit-on-corrupt; intake fail-closed; unknown versions throw `UNSUPPORTED_HISTORY_SCHEMA_VERSION`
- default `calibrationEligible=false`, `validationEligible=false`, `contributionEligible=false`, `replayCohortEligible=false`
- Calibration / Validation / Contribution / replay-cohort filters exclude default-ineligible intake rows

No HTTP, UI, seed, Projection / Feature / Rule / seal / Actual-capture changes.
No Ipswich–Arsenal ingest.

---

## Validation evidence

- `@fas/statistics` tests: **194 passed** (includes T01–T22, T24–T26 and existing A1.5 / A2 / V1A / O1 suites)
- `@fas/statistics` / `@fas/database` / `@fas/report` / `@fas/analysis` / `apps/api` typecheck: **PASS**
- Prisma T21/T23: **skipped in this environment** when PostgreSQL is unavailable (`describe.skipIf`); decoder behavior is covered in-memory (T20–T22)

---

## Explicitly still blocked

```yaml
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

Next governance action: **Historical Evaluation Intake implementation review**.
Do not ingest the Ipswich–Arsenal pair until a separate real-match admission gate after that review.
