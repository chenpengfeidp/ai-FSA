# P2F Projection V2 Multi-Script Engine — Completion Report

**Sprint:** P2F — Projection V2 Multi-Script Engine  
**Roadmap reference:** `docs/40_PRODUCT_ROADMAP.md` (Football Intelligence v2 Wave 3; Projection V2 layering)  
**Architecture freeze:** v0.3  
**Date:** 2026-07-30  
**Status:** Complete (production code + tests + quality gates)

---

## 1. Goal

Replace single-path Projection V2 with a deterministic **multi-script** pipeline:

```text
Football State → Match Scripts → Per-script Projection → Probability Merge → Final Prediction
```

Each activated Match Script produces its own λ, scoreline distribution, winner probabilities, and goal-range probabilities. The final sealed prediction is the **Match Script–weighted merge** of all activated scripts.

---

## 2. Files changed

### New (`@fas/analysis`)

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/multi-script/compute-multi-script-projection.ts` | **`computeMultiScriptProjection`** — one matrix per script + merge |
| `packages/analysis/src/projection-v2/multi-script/build-multi-script-projection-metadata.ts` | Per-script + merged summaries for framework/report |
| `packages/analysis/test/projection-v2-multi-script.spec.ts` | P2F acceptance tests |

### New (Web)

| File | Purpose |
|---|---|
| `apps/web/src/components/explainable-report/multi-script-projection-section.tsx` | Per-script predictions + merged final + contribution |

### Modified (`@fas/analysis`)

| File | Change |
|---|---|
| `compute-projection-v2.ts` | Uses `computeMultiScriptProjection`; exposes `perScriptProjections` |
| `projection-result.ts` | Enriched `MatchScriptProjectionSummary`; `multiScriptMerge` metadata |
| `projection-parameter-artifact.ts` | `PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT`; artifact pins multi-script framework |
| `src/index.ts` | Public exports for multi-script API |
| `test/projection-v2-foundation.spec.ts` | Framework version assertion |
| `test/projection-v2-match-script.spec.ts` | Framework version assertion |

### Modified (Web)

| File | Change |
|---|---|
| `explainable-match-report.tsx` | Inserts multi-script projection section |
| `types/analysis.ts` | Extended DTOs: per-script prediction + merge summary |
| `copy/zh.ts` | Chinese copy for multi-script pipeline |

---

## 3. Multi-Script Projection implemented

Entry point: **`computeMultiScriptProjection`**

For each script in `MatchScriptSet`:

1. Apply script `lambdaModifiers` to Football State base λ (`buildLambdasV2` output)
2. Build independent Poisson matrix (`buildScriptProbabilityMatrix` + optional draw bias)
3. Derive marginals: `pHome`, `pDraw`, `pAway`, top scorelines, goal range

Output:

- `perScriptProjections[]` — script id, label, weight, full `ProbabilityMatrix`
- `mergedMatrix` — convex combination using Match Script weights only

Framework version: **`projectionFramework.v2.multiScript`**

---

## 4. Probability merge algorithm

Algorithm id: **`convex_cell_merge_v1`**

Implementation: `mergeProbabilityMatrices`

For normalized script weights `wᵢ` (sum = 1):

- **Cell merge:** `P*(h,a) = Σ wᵢ · Pᵢ(h,a)` for each scoreline cell
- **λ merge:** `λ*_home = Σ wᵢ · λᵢ_home` (same for away)
- **Marginals:** derived from merged matrix (equivalent to `Σ wᵢ · pHomeᵢ` for 1X2)

Properties:

- Deterministic convex combination
- Weights from Match Script activation only
- No ML, LLM, or randomization
- Calibration applied **after** merge on final 1X2 marginals (unchanged)

Each script exposes `mergeContribution`:

- `weightedPHome = weight × pHome` (and draw/away)
- Sum of contributions equals merged pre-calibration marginals

---

## 5. Projection integration

```text
computeFootballState
  → generateMatchScriptSet
  → buildLambdasV2 (base λ)
  → computeMultiScriptProjection (per-script + merge)
  → computeDeterministicProjectionV2 (calibration + confidence + recommendation)
```

Sealed `DeterministicMatchProjection` contract unchanged:

| Field | Status |
|---|---|
| Winner (pHome/pDraw/pAway) | ✅ post-calibration from merged matrix |
| Most Likely Score | ✅ from merged top scorelines |
| Second Score | ✅ available in framework merge summary |
| Goal Range | ✅ from merged marginals |
| Confidence | ✅ unchanged rule/evidence/strength components |

`scorelinesBasis: match_script_merged_v2` preserved.

---

## 6. Workspace / Report impact

New section: **多剧本投影** (`id="multi-script-projection"`)

Pipeline label: **激活剧本 → 分剧本预测 → 合并最终预测**

Per activated script card:

- Weight, λ, 胜平负, most/second scoreline, goal range
- **合并贡献** — weighted marginal contribution to pre-calibration merge

Merged final card:

- Merge algorithm explanation
- Pre-calibration merged marginals and scorelines
- Footnote linking to sealed post-calibration prediction in hero card

Additive DTO fields only — analyze API contract unchanged.

---

## 7. Tests added

| Test file | Coverage |
|---|---|
| `projection-v2-multi-script.spec.ts` | One projection per script; merge contribution sums; per-script marginals; sealed contract |
| Updated foundation / match-script specs | Multi-script framework version |

---

## 8. Quality gates

| Command | Result |
|---|---|
| `pnpm --filter @fas/analysis test` | **39 passed** |
| `pnpm --filter web test` | **42 passed** |
| `pnpm quality` | **Pass** |

---

## 9. Remaining limitations

1. **Calibration is post-merge only** — per-script cards show pre-calibration marginals; sealed prediction shows calibrated values.
2. **Second scoreline in sealed projection** — still derived from merged matrix top scorelines; workspace shows merge-summary second scoreline separately from hero card formatting.
3. **Cell merge assumes shared truncation grid** — all scripts use the same Poisson cap (`G_MAX`); no script-specific grid extension.
4. **No late_chaos goal-range character** — merge operates on standard Poisson cells only; P2C goal-range character flags not yet wired.
5. **Governance note** — P2A–P2F sprint ids remain pending formal doc 40 listing.

---

## 10. Recommended next sprint

**P2E.5 Projection Replay Validation** (if not already complete on branch) — measure multi-script merge impact vs single-script baseline on sealed Evaluation History.

Or **M1B** Manager Intelligence Features → Rules → Confidence → Projection (Wave 3 parallel track).

Near-term hardening:

- Optional per-script calibration preview (display-only) with explicit limitation that only merged output is sealed.
- Replay metrics for script concentration vs prediction quality.

---

## Acceptance checklist

| # | Item | Status |
|---|---|---|
| 1 | Completion Report | ✅ This document |
| 2 | Files changed | ✅ Section 2 |
| 3 | Multi-Script Projection implemented | ✅ Section 3 |
| 4 | Probability merge algorithm | ✅ Section 4 |
| 5 | Projection integration | ✅ Section 5 |
| 6 | Workspace / Report impact | ✅ Section 6 |
| 7 | Tests added | ✅ Section 7 |
| 8 | Quality Gates | ✅ Section 8 |
| 9 | Remaining limitations | ✅ Section 9 |
| 10 | Recommended next sprint | ✅ Section 10 |

**Must NOT (verified):** Provider, Evidence, Features, Rule logic, Evaluation, Calibration, Validation, Contribution, API contract — unchanged. No ML or LLM introduced.
