# P2G Unified Probability Matrix — Completion Report

**Sprint:** P2G  
**Type:** Production coding sprint  
**Framework version:** `projectionFramework.v2.unifiedMatrix`  
**Derivation policy:** `unifiedMatrix.v1`  
**Date:** 2026-07-30  

## Goal

Replace multiple independent prediction outputs with a single unified probability matrix. Every displayed prediction (Winner, Scoreline, Goal Range, BTTS, Over/Under) must originate from the same merged matrix.

## Pipeline (implemented)

```text
Football State
  → Match Scripts
  → Per-script Probability Matrix
  → Unified Probability Matrix (convex_cell_merge_v1)
  → Derived Predictions
  → Sealed Projection (calibration on 1X2 only)
```

## Files changed

| Area | File | Change |
|------|------|--------|
| Matrix derivation | `packages/analysis/src/projection-v2/unified-matrix/derive-matrix-predictions.ts` | **New** — cell aggregates for 1X2, goal range, scorelines, BTTS, O/U |
| Unified summary | `packages/analysis/src/projection-v2/unified-matrix/build-unified-matrix-summary.ts` | **New** — framework summary + derivation notes |
| Matrix merge | `packages/analysis/src/projection-v2/probability-matrix/merge-probability-matrices.ts` | Marginals via `deriveMatrixPredictions`; checksum includes BTTS/O/U |
| Framework metadata | `packages/analysis/src/projection-v2/projection-result.ts` | `framework.unifiedMatrix` replaces `multiScriptMerge` |
| Parameter artifact | `packages/analysis/src/projection-v2/projection-parameter-artifact.ts` | Pins `projectionFramework.v2.unifiedMatrix` |
| Per-script metadata | `packages/analysis/src/projection-v2/multi-script/build-multi-script-projection-metadata.ts` | Per-script BTTS/O/U from matrix cells |
| Projection V2 | `packages/analysis/src/projection/compute-deterministic-projection-v2.ts` | Limitation text reflects unified matrix basis |
| Scenarios | `packages/analysis/src/scenario/scenario-set.ts` | Matrix scoreline fallbacks only; no synthetic 1X2 worlds on V2 path |
| Exports | `packages/analysis/src/index.ts` | Public unified-matrix symbols |
| Web DTO | `apps/web/src/types/analysis.ts` | `UnifiedMatrixSummaryDto`; per-script BTTS/O/U fields |
| Web UI | `apps/web/src/components/explainable-report/multi-script-projection-section.tsx` | Per-script matrix → unified summary → derived predictions |
| Copy | `apps/web/src/copy/zh.ts` | Unified matrix pipeline labels |
| Tests | `packages/analysis/test/projection-v2-unified-matrix.spec.ts` | **New** P2G acceptance tests |
| Tests | `packages/analysis/test/projection-v2-*.spec.ts` | Framework version + unified summary assertions |

## Unified Probability Matrix implementation

- Each activated Match Script produces one independent Poisson scoreline matrix (`computeMultiScriptProjection`).
- `mergeProbabilityMatrices` performs deterministic convex combination of cell probabilities using Match Script weights only (`convex_cell_merge_v1`).
- `deriveMatrixPredictions` is the single derivation function for all marginals from any matrix (per-script or unified).

## Matrix merge algorithm

```text
P_unified(h,a) = Σ_s ( w_s / Σw ) × P_s(h,a)
```

Marginals (1X2, goal range, BTTS, Over/Under, top scorelines) are computed exclusively from `P_unified` cells — not from weighted marginals of per-script outputs.

## Projection integration

- Sealed `DeterministicMatchProjection.topScorelines` and `goalRange` come from the unified matrix pre-calibration.
- Sealed 1X2 receives calibration only (`oneXTwoBasis: post_calibration_only`); scorelines remain matrix-derived.
- `buildScenarioSet` uses matrix scorelines for V2 paths; removed `oneXTwoWorlds` fallback when `scorelinesBasis` is matrix-based.

## Workspace / Report impact

Workspace section **统一概率矩阵** now displays:

1. **分剧本矩阵预测** — per-script λ, 1X2, scorelines, goal range, BTTS, O/U, merge contribution  
2. **统一矩阵摘要** — merged matrix marginals + checksum + policy  
3. **矩阵衍生预测** — derivation notes explaining how each prediction is computed from cells  

API contract unchanged: optional `projectionFramework` metadata shape extended (additive fields; `multiScriptMerge` removed from framework payload).

## Tests added

`packages/analysis/test/projection-v2-unified-matrix.spec.ts`:

- BTTS/O/U cell derivation and complement sums  
- Framework `unifiedMatrix` summary + derivation notes  
- Weighted marginal consistency with merge contributions  
- Sealed projection alignment with unified matrix  
- Per-script BTTS/O/U on framework summaries  
- Scenario trio from matrix scorelines (no synthetic 1X2 worlds)  
- Merge idempotence via checksum  

Updated P2F/P2D/P2E projection tests for `projectionFramework.v2.unifiedMatrix`.

## Quality gates

```text
pnpm --filter @fas/analysis test projection-v2-unified-matrix.spec.ts …  → 24 passed (affected suite)
pnpm quality                                                             → (see validation run)
```

## Remaining limitations

1. **Calibration scope** — Only sealed 1X2 marginals are calibrated; BTTS/O/U and scorelines remain raw matrix marginals.  
2. **Evaluation BTTS proxy** — `@fas/statistics` replay still infers BTTS from scenario most-likely scoreline (Evaluation unchanged per sprint boundary); matrix-derived BTTS is exposed in framework metadata for future evaluation alignment.  
3. **Governance** — P2G not yet listed in `docs/40_PRODUCT_ROADMAP.md`.  
4. **Sealed projection contract** — BTTS/O/U not added to `DeterministicMatchProjection` DTO (API contract unchanged); values live in `projectionFramework.unifiedMatrix.derived`.

## Recommended next sprint

**P2H — Matrix-native evaluation overlays** (or **P2E.5 Projection Replay Validation**): align Evaluation History / replay metrics with unified-matrix BTTS and Over/Under without changing calibration or validation policy artifacts.
