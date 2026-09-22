# Artifact-Scoped Production Historical Intake Gap — Implementation Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-09-22 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Binding specification | `ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP_REVIEW.md` |
| Decision | **AUTHORIZED FOR BOUNDED GAP IMPLEMENTATION ONLY** |

This is the explicit human authorization required to implement
`CLOSE_ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP`.

It does **not** authorize production Historical Evaluation Intake, real-match
ingest, listing Ipswich–Arsenal (or any real artifact) in the authorization
registry, Calibration / Validation / Contribution / replay use, model
training/tuning, Projection / Feature / Rule changes, HTTP intake, or setting
`production_historical_intake_authorized = true`.

---

## Human decision (verbatim)

I approve implementation of:

`CLOSE_ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP`

based on:

`docs/sprints/PREDICTION_VERTICAL_SLICE/ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP_REVIEW.md`

The approval is limited strictly to implementing the artifact-scoped
production Historical Evaluation Intake authorization boundary.

This is NOT authorization to ingest any real artifact.

---

## Binding constraints (this sprint)

1. Production policy ships as `globalProductionHistoricalIntakeEnabled = false` and `authorizedPairs = []`. No real artifact may be listed. **Do not** add Ipswich–Arsenal.
2. Bind exactly `originalSealId` + `originalSealChecksum` (`contentSha256`) + `resultEvidenceId`, with required non-empty `admissionReviewId`. Exact match only.
3. `allowedUsage=historical_evaluation_intake` remains eligibility metadata only.
4. Public `ingestHistoricalEvaluation` fail-closes before `evaluatePrediction` and save. Codes: `PRODUCTION_INTAKE_NOT_AUTHORIZED`, `ARTIFACT_NOT_PRODUCTION_AUTHORIZED`.
5. Test helper must **not** be on the supported `@fas/statistics` public export surface.
6. No Prisma / HTTP / UI / seal or Actual mutation.
7. Population firewalls remain default-false.
8. YAML `production_historical_intake_authorized` remains **false**. Runtime source of truth is the TypeScript v1 registry, not YAML. Both stay false this sprint.

---

## Preserve

```yaml
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```
