# Historical Evaluation Intake — Implementation Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-09-17 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** (Prediction Evaluation) |
| Binding specification | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` |
| Human presentation | `HUMAN_REVIEW_OF_HISTORICAL_INTAKE_FINAL_GATE_2026-09-17.md` |
| Decision | **AUTHORIZED FOR BOUNDED IMPLEMENTATION ONLY** |

This is the explicit human §8 authorization required by Final Gate §8 / §10.

It authorizes a bounded `@fas/statistics` library-only implementation sprint.
It does **not** authorize production Historical Evaluation Intake, real-match
ingest, Calibration / Validation / Contribution use, model training/tuning, or
Projection / Feature / Rule changes.

---

## Human decision (verbatim)

I have reviewed Final Gate §8.1–§8.10.

I approve all ten decisions for the bounded Historical Evaluation Intake
implementation sprint, with these two clarifications:

1. §8.9 — I approve implementation only. Do not ingest Ipswich-Arsenal or any
   other real match during this sprint. Whether the existing Ipswich-Arsenal
   artifact reviews satisfy the later real-match admission requirement will be
   decided separately after the implementation is complete.

2. §8.10 — `PROJECT_STATE` may be synchronized after this approval, but only
   from the current repository source of truth. Do not copy stale state values
   from the older Final Gate proposal. Preserve:

```yaml
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

This approval authorizes bounded implementation only.

---

## §8 decisions (approved)

| # | Decision | Human |
|---|---|---|
| 1 | Bounded `@fas/statistics` library-only sprint citing roadmap A1 | APPROVE |
| 2 | Schema `evaluation-history.mvp.historical-intake.v1` | APPROVE |
| 3 | Prisma: no migration; version-aware fail-closed decoder per §4.5 | APPROVE |
| 4 | Idempotency from `originalSealId` + `originalSealChecksum`; pin `evaluatedAt = predictionGeneratedAt`; do not change A1 checksum formula | APPROVE |
| 5 | Actual gate: `quality=verified` and `realWorldVerification=true` | APPROVE |
| 6 | Default ineligible for Calibration, Validation, Contribution, replay cohorts | APPROVE |
| 7 | No HTTP, web UI, Prisma seed, Class B persistence | APPROVE |
| 8 | Constructed test doubles are not artifact admission | APPROVE |
| 9 | No real match ingest until later Artifact Admission (clarified: none in this sprint) | APPROVE with clarification |
| 10 | PROJECT_STATE sync from **current** source of truth only; never set production authorized | APPROVE with clarification |

---

## Explicitly not authorized

- `production_historical_intake_authorized = true`
- `historical_evaluation_intake` leaving `C_BLOCKED`
- Ingestion of Ipswich–Arsenal (`lottery:csl:20260915:周二012`) or any real fixture
- Calibration / Validation / Contribution population use
- Model training or tuning
- Projection / Feature / Rule / PRE_MATCH seal / Actual capture changes
