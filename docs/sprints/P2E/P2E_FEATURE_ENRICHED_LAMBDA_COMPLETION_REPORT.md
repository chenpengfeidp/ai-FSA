# P2E — Feature-Enriched Lambda Completion Report

| Field | Value |
|---|---|
| Sprint | **P2E** Feature-Enriched Lambda |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2A · P2B · P2C · P2D · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Production coding — `LambdaBuilderV2` in `@fas/analysis`; Feature groups contribute directly to expected goals (λ) in Projection V2 |
| Explicit exclusions | Evidence / Feature extraction / Rule evaluation redesign · Confidence / Evaluation / Calibration / Validation / Contribution changes · ML · UI · planning documents |

---

## 0. Governance note (roadmap citation gap)

**P2E** was authorized by an explicit task request. **P2A**–**P2E** and proposed **P2F**–**P2M** are not yet listed in `docs/40_PRODUCT_ROADMAP.md`. Add them before further coding sprints in this track.

---

## 1. Completion summary

P2E upgrades Projection V2 so deterministic Football Intelligence Features contribute directly to expected goals (λ) via **`LambdaBuilderV2`**, while **RuleResults remain explainability-only** in the V2 projection path (no Rule softmax on 1X2).

**V2 lambda model (P2C §5 aligned):**

```text
λ_h = clamp( baseRate · A_h · Q_h · C_h · V_h / D_a · homeField , min, max )
```

| Factor | Feature groups |
|---|---|
| `A` | attack (+ club attack strength features) |
| `D` | defence (opponent divisor) |
| `Q` | xG |
| `C` | match context |
| `V` | player availability (suppressor) |

All coefficients live in **`ProjectionParameterArtifact.lambda`** — no hard-coded football weights in Projection logic.

**Version compatibility:**

| Pin | Default | Behaviour |
|---|---|---|
| `"v1"` | **Yes** | Unchanged `computeDeterministicMatchProjection` |
| `"v2"` | No | `LambdaBuilderV2` + `computeDeterministicProjectionV2`; Rule softmax removed |

---

## 2. Deliverables produced

| # | Deliverable | Status |
|---|---|---|
| 1 | Completion Report | This document |
| 2 | Files changed | §3 |
| 3 | LambdaBuilderV2 implementation | §4 |
| 4 | Projection compatibility | §5 |
| 5 | Quality gates | §6 |
| 6 | Remaining limitations | §7 |
| 7 | Recommended next sprint | §8 |

---

## 3. Files changed

### Added

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/lambda/lambda-parameter-set.ts` | `LambdaParameterSet`, group contribution types |
| `packages/analysis/src/projection-v2/lambda/lambda-feature-groups.ts` | Six feature group definitions |
| `packages/analysis/src/projection-v2/lambda/lambda-builder-v2.ts` | **`buildLambdasV2`** deterministic builder |
| `packages/analysis/src/projection-v2/lambda/feature-enriched-lambda-weights.ts` | Governed weight table (`FEATURE_ENRICHED_LAMBDA_FEATURE_WEIGHTS`) |
| `packages/analysis/src/projection/compute-deterministic-projection-v2.ts` | V2 projection path (Feature λ + Poisson + calibration; no Rule softmax) |
| `packages/analysis/test/projection-v2-feature-lambda.spec.ts` | Feature-enriched lambda acceptance tests |

### Modified

| File | Change |
|---|---|
| `packages/analysis/src/projection-v2/projection-parameter-artifact.ts` | Extended with `lambda` section; `FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT` |
| `packages/analysis/src/projection-v2/resolve-projection-policy.ts` | V2 pin resolves feature-lambda artifact |
| `packages/analysis/src/projection-v2/compute-projection-v2.ts` | Uses `LambdaBuilderV2` + `computeDeterministicProjectionV2` |
| `packages/analysis/src/projection-v2/probability-matrix/build-foundation-probability-matrix.ts` | `buildFeatureEnrichedProbabilityMatrix` via `LambdaBuilderV2` |
| `packages/analysis/src/projection/deterministic-match-projection.ts` | Extended basis unions; optional basis on create input |
| `packages/analysis/src/index.ts` | Export lambda builder, V2 projection, artifacts |
| `packages/analysis/test/projection-v2-foundation.spec.ts` | Updated for P2E V2 behaviour |

**Not modified:** `@fas/evidence`, `@fas/feature`, `@fas/rule`, `@fas/statistics` (Confidence / Evaluation / Calibration / Validation / Contribution), web UI.

---

## 4. LambdaBuilderV2 implementation

| Component | Detail |
|---|---|
| Entry point | `buildLambdasV2({ featureBundle, parameters })` |
| Feature groups | attack, defence, xG, clubStrength, playerAvailability, matchContext |
| Weight source | `ProjectionParameterArtifact.lambda.featureWeights` |
| Foundation parity | `BASELINE_PROJECTION_PARAMETER_ARTIFACT` (empty optional weights) reproduces V1 λ |
| Feature-enriched pin | `projectionParams:v3.0:featureLambda` with governed weights |
| Missing optional Features | Neutral factor 1.0; recorded in limitations (never imputed) |
| Rule influence on λ | **None** in V2 — Rules referenced for explainability / projection confidence `A` only |

---

## 5. Projection compatibility

| Requirement | Evidence |
|---|---|
| V1 default unchanged | `computeMatchProjection` default pin `"v1"`; existing tests pass |
| V2 only when pin `"v2"` | `AnalyzeMatchUseCase` / `computeMatchProjection` policy pin |
| V2 uses Feature λ | `scorelinesBasis: "feature_enriched_lambda_v2"`, `oneXTwoBasis: "post_calibration_only"` |
| Rules explainability-only for probabilities | No Rule softmax in `computeDeterministicProjectionV2` |
| Intelligence Confidence unchanged | `@fas/analysis/confidence` not modified |

---

## 6. Quality gates

| Check | Result |
|---|---|
| `pnpm quality` (biome + depcruise + boundary fixture) | **Pass** |
| `pnpm exec turbo run typecheck test --filter=@fas/analysis --filter=@fas/report` | **Pass** — 24 analysis + 14 report tests |
| Architecture boundaries | **Pass** |
| Full `pnpm validate` | **Blocked** — requires `DATABASE_URL` (pre-existing env requirement) |

---

## 7. Remaining limitations

- Football State remains **identity-only** (P2D foundation).
- Match Script remains **single baseline** — no multi-script mixture.
- V2 1X2 still uses **Independent Poisson v1** matrix — unified script mixture (P2G) not yet implemented.
- Feature weights are **uncalibrated baseline** — not Evaluation-qualified; offline replay promotion deferred.
- Statistics-derived Features (e.g. `goalsScoredRate`) contribute when present — V2 λ differs from V1 even without xG/club Evidence.
- doc 40 does not yet list P2A–P2E or P2F–P2M.

---

## 8. Recommended next sprint

| Priority | Sprint | Rationale |
|---|---|---|
| 1 | **P2F** — Match Script module (`matchScript.v1`) | Script activation + weight computation per P2B/P2C |
| 2 | **M1B** Manager Intelligence Features → Rules → Confidence → Projection | Parallel Wave 3 authorized work |
| 3 (governance) | doc 40 update | Add P2A–P2M sprint ids |

Per P2C §10: **P2G** unified matrix (remove dual basis + orphan softmax) follows P2F.

---

## Sign-off

| Item | Status |
|---|---|
| P2E Feature-Enriched Lambda | **Complete (production code)** |
| LambdaBuilderV2 | **Implemented** |
| Default projection pin | **V1** |
| Next in Projection V2 track | **P2F** Match Script module |

---

*End of P2E Completion Report.*
